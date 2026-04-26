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
      is_partial_advance, partial_number, type,
      is_demand_payment, demand_id, amount,
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

    // Helper to generate invoice
    const generateInvoice = async (invoiceData: {
      user_id: string; order_id?: string; booking_id?: string; shop_order_id?: string;
      invoice_type: string; amount: number; total_amount: number;
      customer_name: string; customer_email: string; customer_mobile: string;
      payment_id: string; items: any[];
    }) => {
      try {
        await supabase.from("invoices").insert({
          user_id: invoiceData.user_id,
          order_id: invoiceData.order_id || null,
          booking_id: invoiceData.booking_id || null,
          shop_order_id: invoiceData.shop_order_id || null,
          invoice_type: invoiceData.invoice_type,
          amount: invoiceData.amount,
          tax_amount: 0,
          total_amount: invoiceData.total_amount,
          customer_name: invoiceData.customer_name,
          customer_email: invoiceData.customer_email,
          customer_mobile: invoiceData.customer_mobile,
          payment_id: invoiceData.payment_id,
          payment_method: "razorpay",
          items: invoiceData.items,
          status: "generated",
        });
      } catch (e) {
        console.error("Invoice generation failed (non-fatal):", e);
      }
    };

    if (type === "shop") {
      // SHOP ORDER PAYMENT
      const { data: shopOrder } = await supabase
        .from("shop_orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (!shopOrder) {
        return new Response(JSON.stringify({ error: "Shop order not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (shopOrder.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency
      if (shopOrder.payment_status === "paid" && shopOrder.razorpay_payment_id === razorpay_payment_id) {
        return new Response(JSON.stringify({ success: true, verified: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("shop_orders").update({
        payment_status: "paid",
        razorpay_payment_id,
        razorpay_order_id,
        status: "processing",
      }).eq("id", order_id);

      // Fetch order items for invoice
      const { data: orderItems } = await supabase.from("shop_order_items").select("*").eq("order_id", order_id);
      
      // Generate invoice
      await generateInvoice({
        user_id: shopOrder.user_id,
        shop_order_id: order_id,
        invoice_type: "shop_order",
        amount: shopOrder.total_amount,
        total_amount: shopOrder.total_amount,
        customer_name: shopOrder.shipping_name,
        customer_email: user.email || "",
        customer_mobile: shopOrder.shipping_mobile,
        payment_id: razorpay_payment_id,
        items: (orderItems || []).map((i: any) => ({
          name: i.product_name, qty: i.quantity, price: i.unit_price, total: i.unit_price * i.quantity,
        })),
      });

      // Record payment history
      await supabase.from("payment_history").insert({
        user_id: shopOrder.user_id,
        payment_type: "shop_order",
        razorpay_payment_id,
        razorpay_order_id,
        amount: shopOrder.total_amount,
        status: "confirmed",
        description: `Shop Order ${shopOrder.order_number}`,
      });

      // Reduce stock
      if (orderItems) {
        for (const item of orderItems) {
          // Direct stock decrement
          const { data: product } = await supabase.from("shop_products").select("stock_quantity").eq("id", item.product_id).single();
          if (product) {
            await supabase.from("shop_products").update({ 
              stock_quantity: Math.max(0, product.stock_quantity - item.quantity) 
            }).eq("id", item.product_id);
          }
        }
      }

    } else if (is_demand_payment && demand_id) {
      // ADMIN-RAISED PAYMENT DEMAND for an event
      const { data: demand } = await supabase
        .from("payment_demands")
        .select("id, event_id, amount, status_on_paid, is_paid")
        .eq("id", demand_id)
        .single();

      if (!demand) {
        return new Response(JSON.stringify({ error: "Demand not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotent: already paid → just say ok
      if (demand.is_paid) {
        return new Response(JSON.stringify({ success: true, verified: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: booking } = await supabase
        .from("event_bookings")
        .select("id, user_id, client_name, client_email, client_mobile")
        .eq("id", demand.event_id)
        .single();

      if (!booking) {
        return new Response(JSON.stringify({ error: "Linked event not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (booking.user_id && booking.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paidAmount = Number(amount ?? demand.amount);

      await supabase.from("payment_history").insert({
        user_id: booking.user_id || user.id,
        booking_id: booking.id,
        payment_type: "event_demand",
        razorpay_payment_id, razorpay_order_id,
        amount: paidAmount, status: "confirmed",
        description: `Admin payment demand for event`,
      });

      await supabase.from("payment_demands").update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        paid_by_user_id: user.id,
        paid_by_payment_id: razorpay_payment_id,
        paid_by_order_id: razorpay_order_id,
      }).eq("id", demand_id);

      // Optionally roll the event status forward to whatever the admin chose
      if (demand.status_on_paid) {
        await supabase.from("event_bookings").update({
          payment_status: demand.status_on_paid,
        }).eq("id", booking.id);
      }

      // Generate invoice for the demand payment
      await generateInvoice({
        user_id: booking.user_id || user.id,
        booking_id: booking.id,
        invoice_type: "event_booking",
        amount: paidAmount,
        total_amount: paidAmount,
        customer_name: booking.client_name,
        customer_email: booking.client_email,
        customer_mobile: booking.client_mobile,
        payment_id: razorpay_payment_id,
        items: [{ name: "Additional payment (admin request)", qty: 1, price: paidAmount, total: paidAmount }],
      });

    } else if (is_partial_advance && partial_number) {
      // PARTIAL ADVANCE PAYMENT
      const { data: booking } = await supabase
        .from("event_bookings")
        .select("user_id, client_name, client_email, client_mobile, total_price, advance_amount, negotiated, negotiated_total, negotiated_advance, payment_status, razorpay_payment_id")
        .eq("id", order_id)
        .single();

      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
      const remainingAmt = totalPrice - advAmt;

      await supabase.from("payment_history").insert({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        payment_type: `event_advance_partial_${partial_number}`,
        razorpay_payment_id, razorpay_order_id,
        amount: advance_amount, status: "confirmed",
        description: `Advance partial payment ${partial_number} of 2`,
      });

      await supabase.from("event_bookings").update({
        razorpay_order_id, razorpay_payment_id,
        payment_status: newPaymentStatus, remaining_amount: remainingAmt,
      }).eq("id", order_id);

      // Generate invoice for event partial advance
      await generateInvoice({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        invoice_type: "event_booking",
        amount: advance_amount,
        total_amount: advance_amount,
        customer_name: booking.client_name,
        customer_email: booking.client_email,
        customer_mobile: booking.client_mobile,
        payment_id: razorpay_payment_id,
        items: [{ name: `Event Advance (Partial ${partial_number})`, qty: 1, price: advance_amount, total: advance_amount }],
      });

    } else if (is_event_advance) {
      // EVENT ADVANCE PAYMENT (full advance)
      const { data: booking } = await supabase
        .from("event_bookings")
        .select("user_id, client_name, client_email, client_mobile, total_price, advance_amount, negotiated, negotiated_total, negotiated_advance, payment_status, razorpay_payment_id")
        .eq("id", order_id)
        .single();

      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      await supabase.from("payment_history").insert({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        payment_type: "event_advance",
        razorpay_payment_id, razorpay_order_id,
        amount: advance_amount || advAmt, status: "confirmed",
        description: "Event advance payment",
      });

      await supabase.from("event_bookings").update({
        razorpay_order_id, razorpay_payment_id,
        payment_status: "confirmed", remaining_amount: remainingAmt,
      }).eq("id", order_id);

      // Generate invoice
      await generateInvoice({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        invoice_type: "event_booking",
        amount: advance_amount || advAmt,
        total_amount: advance_amount || advAmt,
        customer_name: booking.client_name,
        customer_email: booking.client_email,
        customer_mobile: booking.client_mobile,
        payment_id: razorpay_payment_id,
        items: [{ name: "Event Advance Payment", qty: 1, price: advance_amount || advAmt, total: advance_amount || advAmt }],
      });

    } else if (is_event_remaining) {
      // EVENT REMAINING PAYMENT
      const { data: booking } = await supabase
        .from("event_bookings")
        .select("user_id, client_name, client_email, client_mobile, total_price, advance_amount, remaining_amount, negotiated, negotiated_total, negotiated_advance, payment_status, razorpay_payment_id")
        .eq("id", order_id)
        .single();

      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      await supabase.from("payment_history").insert({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        payment_type: "event_remaining",
        razorpay_payment_id, razorpay_order_id,
        amount: remainingAmount, status: "confirmed",
        description: "Event remaining balance payment",
      });

      await supabase.from("event_bookings").update({
        razorpay_order_id, razorpay_payment_id,
        payment_status: "fully_paid", remaining_amount: 0,
      }).eq("id", order_id);

      // Generate invoice for remaining
      await generateInvoice({
        user_id: booking.user_id || user.id,
        booking_id: order_id,
        invoice_type: "event_booking",
        amount: remainingAmount,
        total_amount: remainingAmount,
        customer_name: booking.client_name,
        customer_email: booking.client_email,
        customer_mobile: booking.client_mobile,
        payment_id: razorpay_payment_id,
        items: [{ name: "Event Remaining Balance", qty: 1, price: remainingAmount, total: remainingAmount }],
      });

    } else {
      // ORDER PAYMENT (custom caricature)
      const { data: order } = await supabase
        .from("orders")
        .select("user_id, amount, order_type, style, customer_name, customer_email, customer_mobile, payment_status, razorpay_payment_id")
        .eq("id", order_id)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      await supabase.from("payment_history").insert({
        user_id: order.user_id || user.id,
        order_id,
        payment_type: "order",
        razorpay_payment_id, razorpay_order_id,
        amount: order.amount, status: "confirmed",
        description: `${order.order_type} Caricature - ${order.style}`,
      });

      await supabase.from("orders").update({
        razorpay_order_id, razorpay_payment_id,
        payment_status: "confirmed", payment_verified: true,
      }).eq("id", order_id);

      // Generate invoice for custom order
      await generateInvoice({
        user_id: order.user_id || user.id,
        order_id: order_id,
        invoice_type: "custom_order",
        amount: order.amount,
        total_amount: order.amount,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_mobile: order.customer_mobile,
        payment_id: razorpay_payment_id,
        items: [{ name: `${order.order_type} Caricature - ${order.style}`, qty: 1, price: order.amount, total: order.amount }],
      });
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
