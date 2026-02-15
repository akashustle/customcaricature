import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const body = await req.json();
    const { type, data } = body;

    // Generate email content using AI
    let prompt = "";
    let subject = "";
    let recipientEmail = data?.email || data?.client_email || data?.customer_email;

    switch (type) {
      case "order_placed":
        subject = `Order Confirmed – ${data.order_type} Caricature | Creative Caricature Club`;
        prompt = `Write a brief, warm confirmation email for a caricature order. Details: Customer name: ${data.customer_name}, Order type: ${data.order_type}, Style: ${data.style}, Amount: ₹${data.amount}, Order ID: ${data.order_id}. Keep it under 150 words. Include the order details in a clean format. Sign off as Creative Caricature Club.`;
        break;
      case "event_booked":
        subject = `Event Booking Confirmed | Creative Caricature Club`;
        prompt = `Write a brief event booking confirmation email. Details: Client: ${data.client_name}, Event type: ${data.event_type}, Date: ${data.event_date}, Time: ${data.event_start_time} - ${data.event_end_time}, Venue: ${data.venue_name}, ${data.city}, Artists: ${data.artist_count}, Amount: ₹${data.total_price}. Keep it under 150 words. Sign off as Creative Caricature Club.`;
        break;
      case "event_updated":
        subject = `Event Updated | Creative Caricature Club`;
        prompt = `Write a brief event update notification email. Client: ${data.client_name}, Event: ${data.event_type} on ${data.event_date} at ${data.venue_name}. Status: ${data.status}. Keep it under 100 words. Sign off as Creative Caricature Club.`;
        break;
      case "event_cancelled":
        subject = `Event Cancelled | Creative Caricature Club`;
        prompt = `Write a brief, empathetic event cancellation email. Client: ${data.client_name}, Event: ${data.event_type} on ${data.event_date}. Keep it under 100 words. Mention they can contact support. Sign off as Creative Caricature Club.`;
        break;
      case "event_refunded":
        subject = `Event Refund Processed | Creative Caricature Club`;
        prompt = `Write a brief refund confirmation email. Client: ${data.client_name}, Event: ${data.event_type} on ${data.event_date}. Keep under 100 words. Sign off as Creative Caricature Club.`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Generate email body using AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are an email writer for Creative Caricature Club. Write clean HTML emails with inline styles. Use warm gold (#9C7C3A) as accent color. Be concise and professional." },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
      }),
    });

    const aiData = await aiResponse.json();
    const emailBody = aiData.choices?.[0]?.message?.content || "Thank you for choosing Creative Caricature Club!";

    // Send via Supabase Auth's built-in email (or log for now)
    // Since we don't have a dedicated email service, we'll use the admin API to send
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Log the notification
    console.log(`[EMAIL] To: ${recipientEmail}, Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${emailBody}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notification processed",
      subject,
      recipient: recipientEmail,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
