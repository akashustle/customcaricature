import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function isValidMobile(mobile: string): boolean {
  return /^\d{10}$/.test(mobile);
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { amount, order_id, customer_name, customer_email, customer_mobile } = body;

    // Input validation
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > 10000000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof order_id !== "string" || !isValidUUID(order_id)) {
      return new Response(JSON.stringify({ error: "Invalid order ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof customer_name !== "string" || customer_name.trim().length === 0 || customer_name.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid customer name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof customer_email !== "string" || !isValidEmail(customer_email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof customer_mobile !== "string" || !isValidMobile(customer_mobile)) {
      return new Response(JSON.stringify({ error: "Invalid mobile number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify order exists and ownership using service role
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check orders table first
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, amount, payment_status")
      .eq("id", order_id)
      .maybeSingle();

    // Check event_bookings table
    const { data: booking } = await supabase
      .from("event_bookings")
      .select("id, user_id, total_price, advance_amount, remaining_amount, payment_status")
      .eq("id", order_id)
      .maybeSingle();

    if (!order && !booking) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const record = order || booking;

    // Verify ownership (allow if user owns it)
    if (record!.user_id && record!.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already fully paid
    // For orders: "confirmed" means fully paid
    // For event bookings: "confirmed" means advance paid (still has remaining), "fully_paid" means done
    const isFullyPaid = order
      ? (order.payment_status === "confirmed")
      : (booking!.payment_status === "fully_paid");

    if (isFullyPaid) {
      return new Response(JSON.stringify({ error: "Already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials not configured");
    }

    const auth = btoa(`${keyId}:${keySecret}`);

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt: order_id,
        notes: {
          customer_name: customer_name.slice(0, 100),
          customer_email: customer_email.slice(0, 255),
          customer_mobile,
          user_id: user.id,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Razorpay API error:", response.status);
      throw new Error("Payment gateway error. Please try again.");
    }

    return new Response(
      JSON.stringify({
        razorpay_order_id: data.id,
        razorpay_key_id: keyId,
        amount: data.amount,
        currency: data.currency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Razorpay order creation error:", message);
    return new Response(JSON.stringify({ error: "Failed to create payment order. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
