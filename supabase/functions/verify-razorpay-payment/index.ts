import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      order_id, is_event_remaining, is_event_advance, advance_amount,
      is_partial_advance, partial_number,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) throw new Error("Razorpay secret not configured");

    // Verify signature using HMAC SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    const expectedSignature = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Invalid payment signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for DB updates
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (is_partial_advance && partial_number) {
      // PARTIAL ADVANCE PAYMENT
      const { data: booking } = await supabase
        .from("event_bookings")
        .select("user_id, total_price, advance_amount, negotiated, negotiated_total, negotiated_advance, payment_status, razorpay_payment_id")
        .eq("id", order_id)
        .single();

      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency check
      const expectedStatus = partial_number === 1 ? "partial_1_paid" : "confirmed";
      if (booking.payment_status === expectedStatus && booking.razorpay_payment_id === razorpay_payment_id) {
        return new Response(JSON.stringify({ success: true, verified: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (booking.user_id && booking.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalPrice = booking.negotiated && booking.negotiated_total ? booking.negotiated_total : booking.total_price;
      const advAmt = booking.negotiated && booking.negotiated_advance ? booking.negotiated_advance : booking.advance_amount;
      const newPaymentStatus = partial_number === 1 ? "partial_1_paid" : "confirmed";
      let remainingAmt = totalPrice - advAmt;

      // RECORD PAYMENT HISTORY FIRST - so it's saved even if downstream fails
      await supabase.from("payment_history").insert({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        payment_type: `event_advance_partial_${partial_number}`,
        razorpay_payment_id,
        razorpay_order_id,
        amount: advance_amount,
        status: "confirmed",
        description: `Advance partial payment ${partial_number} of 2`,
      });

      // Then update booking status
      const { error: updateError } = await supabase
        .from("event_bookings")
        .update({
          razorpay_order_id,
          razorpay_payment_id,
          payment_status: newPaymentStatus,
          remaining_amount: remainingAmt,
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Failed to update event booking (payment already recorded):", updateError.message);
      }

    } else if (is_event_advance) {
      // EVENT ADVANCE PAYMENT (full advance)
      const { data: booking } = await supabase
        .from("event_bookings")
        .select("user_id, total_price, advance_amount, negotiated, negotiated_total, negotiated_advance, payment_status, razorpay_payment_id")
        .eq("id", order_id)
        .single();

      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency
      if (booking.payment_status === "confirmed" && booking.razorpay_payment_id === razorpay_payment_id) {
        return new Response(JSON.stringify({ success: true, verified: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (booking.user_id && booking.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalPrice = booking.negotiated && booking.negotiated_total ? booking.negotiated_total : booking.total_price;
      const advAmt = booking.negotiated && booking.negotiated_advance ? booking.negotiated_advance : booking.advance_amount;
      const remainingAmt = totalPrice - advAmt;

      // RECORD PAYMENT HISTORY FIRST
      await supabase.from("payment_history").insert({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        payment_type: "event_advance",
        razorpay_payment_id,
        razorpay_order_id,
        amount: advance_amount || advAmt,
        status: "confirmed",
        description: "Event advance payment",
      });

      // Then update booking
      const { error: updateError } = await supabase
        .from("event_bookings")
        .update({
          razorpay_order_id,
          razorpay_payment_id,
          payment_status: "confirmed",
          remaining_amount: remainingAmt,
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Failed to update event booking (payment already recorded):", updateError.message);
      }

    } else if (is_event_remaining) {
      // EVENT REMAINING PAYMENT
      const { data: booking } = await supabase
        .from("event_bookings")
        .select("user_id, total_price, advance_amount, remaining_amount, negotiated, negotiated_total, negotiated_advance, payment_status, razorpay_payment_id")
        .eq("id", order_id)
        .single();

      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency
      if (booking.payment_status === "fully_paid" && booking.razorpay_payment_id === razorpay_payment_id) {
        return new Response(JSON.stringify({ success: true, verified: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (booking.user_id && booking.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalPrice = booking.negotiated && booking.negotiated_total ? booking.negotiated_total : booking.total_price;
      const advAmt = booking.negotiated && booking.negotiated_advance ? booking.negotiated_advance : booking.advance_amount;
      const remainingAmount = booking.remaining_amount || (totalPrice - advAmt);

      // RECORD PAYMENT HISTORY FIRST
      await supabase.from("payment_history").insert({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        payment_type: "event_remaining",
        razorpay_payment_id,
        razorpay_order_id,
        amount: remainingAmount,
        status: "confirmed",
        description: "Event remaining balance payment",
      });

      // Then update booking
      const { error: updateError } = await supabase
        .from("event_bookings")
        .update({
          razorpay_order_id,
          razorpay_payment_id,
          payment_status: "fully_paid",
          remaining_amount: 0,
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Failed to update event booking (payment already recorded):", updateError.message);
      }

    } else {
      // ORDER PAYMENT
      const { data: order } = await supabase
        .from("orders")
        .select("user_id, amount, order_type, style, payment_status, razorpay_payment_id")
        .eq("id", order_id)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency
      if (order.payment_status === "confirmed" && order.razorpay_payment_id === razorpay_payment_id) {
        return new Response(JSON.stringify({ success: true, verified: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.user_id && order.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // RECORD PAYMENT HISTORY FIRST
      await supabase.from("payment_history").insert({
        user_id: order.user_id || user.id,
        order_id,
        payment_type: "order",
        razorpay_payment_id,
        razorpay_order_id,
        amount: order.amount,
        status: "confirmed",
        description: `${order.order_type} Caricature - ${order.style}`,
      });

      // Then update order
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          razorpay_order_id,
          razorpay_payment_id,
          payment_status: "confirmed",
          payment_verified: true,
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Failed to update order (payment already recorded):", updateError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, verified: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment verification error:", message);
    return new Response(JSON.stringify({ error: "Payment verification failed. Please try again or contact support." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});