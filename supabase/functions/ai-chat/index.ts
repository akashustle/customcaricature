import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch training data from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: trainingData } = await supabase
      .from("chatbot_training_data")
      .select("category, question, answer")
      .eq("is_active", true)
      .order("category");

    let trainingContext = "";
    if (trainingData && trainingData.length > 0) {
      trainingContext = "\n\nHere is specific business knowledge to use when answering:\n";
      trainingData.forEach((item: any) => {
        trainingContext += `\nQ: ${item.question}\nA: ${item.answer}\n`;
      });
    }

    const systemPrompt = `You are the AI assistant for Creative Caricature Club (CCC), a professional caricature art service based in Mumbai, India. You help customers with:

1. Custom Caricature Orders: Single (₹3,499), Couple (₹9,499), Group (₹3,499/face, 3-7 faces). Available as digital or physical.
2. Live Event Bookings: Professional caricature artists for events like weddings, birthdays, corporate events. Mumbai rates start at ₹30,000 (1 artist) or ₹50,000 (2 artists). Pan-India rates start at ₹40,000 (1 artist) or ₹70,000 (2 artists). International bookings also available.
3. Delivery: Physical caricatures delivered within 25-30 days. Mumbai orders include free framing.
4. Payment: Secure online payments via Razorpay. Advance payment required for event bookings.
5. Contact: Phone 8369594271, Website: customcaricature.lovable.app

Key guidelines:
- Be friendly, warm, and helpful
- Use emojis sparingly but naturally
- Keep answers concise but informative
- If unsure about specific pricing or availability, direct them to register and check or call 8369594271
- Encourage users to register/login for ordering
- Never make up information you don't have${trainingContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
