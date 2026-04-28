// Reconcile pending Razorpay payments.
// Runs on a cron (every 10 min) and can also be triggered manually by an admin
// or by the client polling fallback after a Razorpay checkout completes.
//
// Strategy:
//   1. Find rows in `orders`, `shop_orders`, and `event_bookings` that have a
//      `razorpay_order_id` but `payment_status = 'pending'` and are at least
//      `min_age_seconds` old (default 60s). For client_poll calls we lower the
//      threshold so the recovery is near-instant after a refresh.
//   2. For each candidate, fetch the Razorpay order's payments via the REST
//      API. If there is at least one captured payment, mark the row paid and
//      record a payment_history + reconciliation_log entry.
//
// This function is intentionally idempotent — calling it many times in a row
// is safe.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ReconResult = {
  table: string;
  id: string;
  outcome: "updated" | "no_change" | "not_found" | "error";
  prev_status?: string;
  new_status?: string;
  notes?: string;
  razorpay_payment_id?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!keyId || !keySecret) {
    return new Response(
      JSON.stringify({ error: "Razorpay keys not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Optional body: { source?: 'cron'|'manual'|'client_poll', target?: { table, id }, min_age_seconds?: number }
  let body: any = {};
  try { body = await req.json(); } catch { /* GET with no body is fine */ }
  const source: "cron" | "manual" | "client_poll" =
    body?.source === "manual" || body?.source === "client_poll" ? body.source : "cron";
  const minAgeSeconds: number = typeof body?.min_age_seconds === "number"
    ? Math.max(0, body.min_age_seconds)
    : (source === "client_poll" ? 0 : 60);
  const explicitTarget: { table?: string; id?: string } | undefined = body?.target;

  const rzpAuth = "Basic " + btoa(`${keyId}:${keySecret}`);

  // Helper: fetch the latest captured payment for a Razorpay order
  const fetchCapturedPayment = async (rzpOrderId: string): Promise<{ id: string; amount: number } | null> => {
    try {
      const r = await fetch(`https://api.razorpay.com/v1/orders/${rzpOrderId}/payments`, {
        headers: { Authorization: rzpAuth },
      });
      if (!r.ok) return null;
      const j = await r.json();
      const items: any[] = j?.items || [];
      const captured = items.find((p) => p.status === "captured" || p.status === "authorized");
      if (!captured) return null;
      return { id: captured.id as string, amount: Number(captured.amount) / 100 };
    } catch (_e) {
      return null;
    }
  };

  const log = async (entry: Omit<ReconResult, "outcome"> & { outcome: ReconResult["outcome"]; rzpOrderId?: string }) => {
    try {
      await supabase.from("payment_reconciliation_log").insert({
        source,
        target_table: entry.table,
        target_id: entry.id,
        razorpay_order_id: entry.rzpOrderId,
        razorpay_payment_id: entry.razorpay_payment_id,
        prev_status: entry.prev_status,
        new_status: entry.new_status,
        outcome: entry.outcome,
        notes: entry.notes,
      });
    } catch (_e) { /* never block recovery on logging */ }
  };

  const results: ReconResult[] = [];

  // ---- Reconcile a single caricature order ----
  const reconcileOrder = async (id: string): Promise<ReconResult> => {
    const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
    if (!order) return { table: "orders", id, outcome: "not_found" };
    if (order.payment_status === "confirmed") {
      return { table: "orders", id, outcome: "no_change", prev_status: order.payment_status };
    }
    if (!order.razorpay_order_id) {
      return { table: "orders", id, outcome: "no_change", notes: "no razorpay order yet" };
    }
    const captured = await fetchCapturedPayment(order.razorpay_order_id);
    if (!captured) {
      await log({ table: "orders", id, outcome: "no_change", rzpOrderId: order.razorpay_order_id, prev_status: order.payment_status });
      return { table: "orders", id, outcome: "no_change", prev_status: order.payment_status };
    }
    await supabase.from("orders").update({
      payment_status: "confirmed",
      payment_verified: true,
      razorpay_payment_id: captured.id,
    }).eq("id", id);
    await supabase.from("payment_history").insert({
      user_id: order.user_id,
      order_id: id,
      payment_type: "order",
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id: captured.id,
      amount: captured.amount,
      status: "confirmed",
      description: `Reconciled (${source}) – ${order.order_type} caricature`,
    });
    await log({
      table: "orders", id, outcome: "updated",
      rzpOrderId: order.razorpay_order_id, razorpay_payment_id: captured.id,
      prev_status: order.payment_status, new_status: "confirmed",
    });
    return { table: "orders", id, outcome: "updated", prev_status: order.payment_status, new_status: "confirmed", razorpay_payment_id: captured.id };
  };

  const reconcileShopOrder = async (id: string): Promise<ReconResult> => {
    const { data: order } = await supabase.from("shop_orders").select("*").eq("id", id).single();
    if (!order) return { table: "shop_orders", id, outcome: "not_found" };
    if (order.payment_status === "paid") {
      return { table: "shop_orders", id, outcome: "no_change", prev_status: order.payment_status };
    }
    if (!order.razorpay_order_id) {
      return { table: "shop_orders", id, outcome: "no_change", notes: "no razorpay order yet" };
    }
    const captured = await fetchCapturedPayment(order.razorpay_order_id);
    if (!captured) {
      await log({ table: "shop_orders", id, outcome: "no_change", rzpOrderId: order.razorpay_order_id, prev_status: order.payment_status });
      return { table: "shop_orders", id, outcome: "no_change", prev_status: order.payment_status };
    }
    await supabase.from("shop_orders").update({
      payment_status: "paid",
      status: "processing",
      razorpay_payment_id: captured.id,
    }).eq("id", id);
    await supabase.from("payment_history").insert({
      user_id: order.user_id,
      payment_type: "shop_order",
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id: captured.id,
      amount: captured.amount,
      status: "confirmed",
      description: `Reconciled (${source}) – Shop order ${order.order_number}`,
    });
    await log({
      table: "shop_orders", id, outcome: "updated",
      rzpOrderId: order.razorpay_order_id, razorpay_payment_id: captured.id,
      prev_status: order.payment_status, new_status: "paid",
    });
    return { table: "shop_orders", id, outcome: "updated", prev_status: order.payment_status, new_status: "paid", razorpay_payment_id: captured.id };
  };

  const reconcileEventBooking = async (id: string): Promise<ReconResult> => {
    const { data: booking } = await supabase.from("event_bookings").select("*").eq("id", id).single();
    if (!booking) return { table: "event_bookings", id, outcome: "not_found" };
    // Event bookings have several mid-states. Only auto-recover the *first*
    // advance step where the captured payment is unambiguous.
    if (booking.payment_status !== "pending") {
      return { table: "event_bookings", id, outcome: "no_change", prev_status: booking.payment_status };
    }
    if (!booking.razorpay_order_id) {
      return { table: "event_bookings", id, outcome: "no_change", notes: "no razorpay order yet" };
    }
    const captured = await fetchCapturedPayment(booking.razorpay_order_id);
    if (!captured) {
      await log({ table: "event_bookings", id, outcome: "no_change", rzpOrderId: booking.razorpay_order_id, prev_status: booking.payment_status });
      return { table: "event_bookings", id, outcome: "no_change", prev_status: booking.payment_status };
    }
    const totalPrice = booking.negotiated && booking.negotiated_total ? booking.negotiated_total : booking.total_price;
    const advAmt = booking.negotiated && booking.negotiated_advance ? booking.negotiated_advance : booking.advance_amount;
    await supabase.from("event_bookings").update({
      payment_status: "confirmed",
      razorpay_payment_id: captured.id,
      remaining_amount: totalPrice - advAmt,
    }).eq("id", id);
    await supabase.from("payment_history").insert({
      user_id: booking.user_id,
      booking_id: id,
      payment_type: "event_advance",
      razorpay_order_id: booking.razorpay_order_id,
      razorpay_payment_id: captured.id,
      amount: captured.amount,
      status: "confirmed",
      description: `Reconciled (${source}) – Event advance`,
    });
    await log({
      table: "event_bookings", id, outcome: "updated",
      rzpOrderId: booking.razorpay_order_id, razorpay_payment_id: captured.id,
      prev_status: booking.payment_status, new_status: "confirmed",
    });
    return { table: "event_bookings", id, outcome: "updated", prev_status: booking.payment_status, new_status: "confirmed", razorpay_payment_id: captured.id };
  };

  // Targeted single-row reconciliation (called from client polling)
  if (explicitTarget?.table && explicitTarget?.id) {
    let r: ReconResult;
    if (explicitTarget.table === "orders") r = await reconcileOrder(explicitTarget.id);
    else if (explicitTarget.table === "shop_orders") r = await reconcileShopOrder(explicitTarget.id);
    else if (explicitTarget.table === "event_bookings") r = await reconcileEventBooking(explicitTarget.id);
    else r = { table: explicitTarget.table, id: explicitTarget.id, outcome: "error", notes: "unknown table" };
    return new Response(JSON.stringify({ source, results: [r] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Bulk sweep
  const ageCutoff = new Date(Date.now() - minAgeSeconds * 1000).toISOString();

  const [{ data: pendingOrders }, { data: pendingShop }, { data: pendingEvents }] = await Promise.all([
    supabase.from("orders").select("id").eq("payment_status", "pending").not("razorpay_order_id", "is", null).lte("created_at", ageCutoff).limit(100),
    supabase.from("shop_orders").select("id").eq("payment_status", "pending").not("razorpay_order_id", "is", null).lte("created_at", ageCutoff).limit(100),
    supabase.from("event_bookings").select("id").eq("payment_status", "pending").not("razorpay_order_id", "is", null).lte("created_at", ageCutoff).limit(100),
  ]);

  for (const row of pendingOrders || []) results.push(await reconcileOrder(row.id));
  for (const row of pendingShop || []) results.push(await reconcileShopOrder(row.id));
  for (const row of pendingEvents || []) results.push(await reconcileEventBooking(row.id));

  const summary = {
    scanned: results.length,
    updated: results.filter((r) => r.outcome === "updated").length,
    no_change: results.filter((r) => r.outcome === "no_change").length,
    errors: results.filter((r) => r.outcome === "error").length,
  };

  return new Response(JSON.stringify({ source, summary, results }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
