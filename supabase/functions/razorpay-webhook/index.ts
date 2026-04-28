/**
 * Razorpay Webhook Receiver
 *
 * Server-to-server fallback for the cases where the user closes the tab,
 * loses signal, or the browser callback never fires. Razorpay POSTs the
 * `payment.captured` (and friends) events here; we verify the signature,
 * dedupe by event id (so retries are safe), then mark the matching row
 * paid through the same code path as the reconciler.
 *
 * IMPORTANT: this function is configured with `verify_jwt = false` because
 * Razorpay cannot send a Supabase JWT. We authenticate the request using
 * the X-Razorpay-Signature HMAC instead.
 *
 * Idempotency contract:
 *   - We INSERT into razorpay_webhook_events keyed on the unique event id.
 *     A duplicate insert raises 23505 → we return 200 immediately.
 *   - The downstream order/booking update itself re-checks the current
 *     payment_status and razorpay_payment_id before writing, so even a
 *     forced replay never double-bills payment_history.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-razorpay-event-id",
};

const hexHmacSha256 = async (secret: string, body: string): Promise<string> => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const expected = await hexHmacSha256(webhookSecret, rawBody);
  if (signature !== expected) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: any;
  try { event = JSON.parse(rawBody); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Razorpay event id can come from header or payload. Either is unique per delivery.
  const eventId: string = req.headers.get("x-razorpay-event-id")
    || event?.id
    || event?.payload?.payment?.entity?.id
    || crypto.randomUUID();
  const eventType: string = event?.event || "unknown";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotency: insert event row first; duplicate => already processed.
  const { error: insertErr } = await supabase
    .from("razorpay_webhook_events")
    .insert({ event_id: eventId, event_type: eventType, payload: event });
  if (insertErr) {
    if ((insertErr as any).code === "23505") {
      return new Response(JSON.stringify({ ok: true, deduped: true, event_id: eventId }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Don't lose the event — log but still 200 so Razorpay doesn't retry forever.
    console.error("Failed to log webhook event", insertErr);
  }

  // Only payment.captured / payment.authorized actually flip a row paid.
  const handled = ["payment.captured", "payment.authorized", "order.paid"];
  if (!handled.includes(eventType)) {
    await supabase.from("razorpay_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString(), process_notes: "ignored event type" })
      .eq("event_id", eventId);
    return new Response(JSON.stringify({ ok: true, ignored: eventType }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payment = event?.payload?.payment?.entity;
  const rzpOrderId: string | undefined = payment?.order_id;
  const rzpPaymentId: string | undefined = payment?.id;
  const amountPaise: number = Number(payment?.amount || 0);
  const amount = amountPaise / 100;

  if (!rzpOrderId || !rzpPaymentId) {
    await supabase.from("razorpay_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString(), process_notes: "missing order/payment id" })
      .eq("event_id", eventId);
    return new Response(JSON.stringify({ ok: true, skipped: "no order id" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Try to locate the row across all three tables.
  type Hit = { table: "orders" | "shop_orders" | "event_bookings"; row: any };
  const tables: Hit["table"][] = ["orders", "shop_orders", "event_bookings"];
  let hit: Hit | null = null;
  for (const t of tables) {
    const { data } = await supabase.from(t).select("*").eq("razorpay_order_id", rzpOrderId).maybeSingle();
    if (data) { hit = { table: t, row: data }; break; }
  }

  if (!hit) {
    await supabase.from("razorpay_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString(), process_notes: "no matching row yet" })
      .eq("event_id", eventId);
    return new Response(JSON.stringify({ ok: true, queued: "row not yet created" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Idempotent flip: only update if not already paid by this exact payment id.
  let updated = false;
  let prev = hit.row.payment_status;
  let next = prev;

  if (hit.table === "orders") {
    if (hit.row.payment_status !== "confirmed" || hit.row.razorpay_payment_id !== rzpPaymentId) {
      await supabase.from("orders").update({
        payment_status: "confirmed",
        payment_verified: true,
        razorpay_payment_id: rzpPaymentId,
      }).eq("id", hit.row.id);
      updated = true; next = "confirmed";
    }
  } else if (hit.table === "shop_orders") {
    if (hit.row.payment_status !== "paid" || hit.row.razorpay_payment_id !== rzpPaymentId) {
      await supabase.from("shop_orders").update({
        payment_status: "paid",
        status: "processing",
        razorpay_payment_id: rzpPaymentId,
      }).eq("id", hit.row.id);
      updated = true; next = "paid";
    }
  } else if (hit.table === "event_bookings") {
    if (hit.row.payment_status === "pending") {
      const totalPrice = hit.row.negotiated && hit.row.negotiated_total ? hit.row.negotiated_total : hit.row.total_price;
      const advAmt = hit.row.negotiated && hit.row.negotiated_advance ? hit.row.negotiated_advance : hit.row.advance_amount;
      await supabase.from("event_bookings").update({
        payment_status: "confirmed",
        razorpay_payment_id: rzpPaymentId,
        remaining_amount: totalPrice - advAmt,
      }).eq("id", hit.row.id);
      updated = true; next = "confirmed";
    }
  }

  if (updated) {
    await supabase.from("payment_history").insert({
      user_id: hit.row.user_id,
      order_id: hit.table === "orders" ? hit.row.id : null,
      booking_id: hit.table === "event_bookings" ? hit.row.id : null,
      payment_type: hit.table === "orders" ? "order" : hit.table === "shop_orders" ? "shop_order" : "event_advance",
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      amount,
      status: "confirmed",
      description: `Webhook (${eventType}) — ${hit.table}`,
    });
  }

  await supabase.from("payment_reconciliation_log").insert({
    source: "webhook",
    target_table: hit.table,
    target_id: hit.row.id,
    razorpay_order_id: rzpOrderId,
    razorpay_payment_id: rzpPaymentId,
    prev_status: prev,
    new_status: next,
    outcome: updated ? "updated" : "no_change",
    notes: `event=${eventType}`,
  }).then(() => {}, () => {});

  await supabase.from("razorpay_webhook_events")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      process_notes: updated ? `updated ${hit.table} → ${next}` : "already paid",
    })
    .eq("event_id", eventId);

  return new Response(JSON.stringify({ ok: true, table: hit.table, updated, status: next }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
