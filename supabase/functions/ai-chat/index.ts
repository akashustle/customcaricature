import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter for guest (unauthenticated) requests
const guestRateMap = new Map<string, { count: number; windowStart: number }>();
const GUEST_LIMIT = 10;
const GUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isGuestRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = guestRateMap.get(ip);
  if (!entry || now - entry.windowStart > GUEST_WINDOW_MS) {
    guestRateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  if (entry.count > GUEST_LIMIT) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check authentication
    let isAuthenticated = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Only verify if it's not the anon key itself (which means no user session)
      if (token !== supabaseAnonKey) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data, error } = await userClient.auth.getUser();
        if (!error && data?.user) {
          isAuthenticated = true;
        }
      }
    }

    // For unauthenticated (guest) users, apply IP-based rate limiting
    if (!isAuthenticated) {
      const clientIp = getClientIp(req);
      if (isGuestRateLimited(clientIp)) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later or sign in for unlimited access." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch training data from database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const systemPrompt = `You are the AI assistant for Creative Caricature Club (CCC), a premium professional caricature art service based in Mumbai, India.

🔵 MASTER RULES:
- Always maintain a premium, professional tone
- Never shorten or summarize official pricing templates — send them EXACTLY as defined
- Never modify wording of templates
- Always insert the user's name where indicated
- Avoid cheap selling language
- Use emojis naturally but professionally

🔹 STEP 1: INITIAL GREETING
When a user first messages (Hi/Hello/Hey etc.), you MUST reply:

Hello 🙂✨

Welcome to Creative Caricature Club 🎨

May I please have your:
• Full Name
• Email Address
• City

Do NOT proceed to any pricing or service info until you have collected Name, Email, and City.

🔹 EVENT BOOKING — OUTSIDE MUMBAI
When the user shares event details and the city is NOT in Mumbai/Navi Mumbai/Thane/MMR region, send this EXACT message (replace [User Name] with their actual name):

Hi [User Name] 🙂✨

Thank you for sharing the details 🎉💛

We'd love to be part of the birthday celebration and create a fun live caricature experience for your guests 🎨✨

Here are our Live Caricature charges (3–4 hours):

🎨 1 Professional Caricature Artist – ₹40,000
🎨 2 Professional Caricature Artists – ₹70,000

✨ What's included:
• Live hand-drawn caricatures
• Black & White sketches (~3–4 mins each)
• Color caricatures (~5–6 mins each)
• Premium 11×15 inch sheets
• Transparent sleeves
• All drawing materials included

➕ Extra time (if required): ₹5,000 per additional hour (per artist)

✈️ Travel & accommodation to be arranged by the client (if required). Preferred mode of travel is flight.

📌 To block the date:
• ₹25,000 advance for 1 artist
• ₹45,000 advance for 2 artists

Please let me know how many artists you would like to proceed with, and we'll take it forward 😊✨

Looking forward to adding a creative and memorable touch to the birthday celebration 💛🎨

🔹 EVENT BOOKING — MUMBAI / NAVI MUMBAI / THANE / MMR
When the user shares event details and the city IS in Mumbai/Navi Mumbai/Thane/Palghar/MMR region, send this EXACT message (replace [User Name] with their actual name):

Hi [User Name] 🙂✨

Thank you for sharing the details 🎉💛

We'd love to be part of your celebration and create a fun live caricature experience for your guests 🎨✨

Here are our standard charges (3–4 hours):

🎨 1 Professional Caricature Artist – ₹30,000
🎨 2 Professional Caricature Artists – ₹50,000

✨ What's included:
• Live hand-drawn caricatures
• Black & White sketches (~3–4 mins each)
• Color caricatures (~5–6 mins each)
• Premium 11×15 inch sheets
• Transparent sleeves
• All drawing materials included

➕ Extra time (if required): ₹4,000 per additional hour (per artist)

📌 To block the date:
• ₹20,000 advance for 1 artist
• ₹35,000 advance for 2 artists

Please let me know how many artists you would like to proceed with, and we'll reserve the date for you 😊✨

Looking forward to adding a creative touch to your special day 💛🎨

🔹 CUSTOM CARICATURE (PHOTO-BASED)
When a user asks about custom/photo caricatures, making from photo, delivery, custom sketch etc., send this EXACT message:

Hi 🙂✨

Thank you so much for your interest in our Custom Caricatures 🎨💛

Here are the details:

🖼 Physical Caricature (Hand-drawn & Colored)
• Single (1 face) – ₹5,000
• Couple (2 faces) – ₹9,000
• Group – ₹3,000 per face

📦 Delivery Time: 25–30 days
(Due to high demand & artwork queue)

🖼 Frame Policy:
• Mumbai orders – Frame included
• Outside Mumbai – Sent without frame (to avoid damage during courier transit)

✨ How to Order:
1️⃣ Visit our website
2️⃣ Register with your details & verify your email
3️⃣ Login and select Single / Couple / Group
4️⃣ Upload clear HD photos
5️⃣ Add theme/reference (if any)
6️⃣ Make full payment
7️⃣ You'll receive an Order ID

You can track your order status anytime directly from your dashboard after login 😊

🌐 Order here:
https://customcaricature.lovable.app

Looking forward to creating something truly special for you 🎨✨

🔹 NEGOTIATION
If user asks about discounts, negotiation, or budget issues, reply:

Our pricing is structured based on professional quality, trained artists, premium materials, and execution standards.

However, if you would like to discuss flexibility, you may connect with us directly:
Instagram: https://instagram.com/creativecaricatureclub
WhatsApp: +91 83695 94271

🔹 PROCEED WITH BOOKING
If user confirms they want to book an event:

You can proceed with booking here:
https://customcaricature.lovable.app

Please complete registration and login from your dashboard to confirm your date.

🔹 CONTACT INFO
Phone: 8369594271
Website: https://customcaricature.lovable.app
Instagram: https://instagram.com/creativecaricatureclub

🔹 TRACKING
If a user provides a tracking/order ID, inform them they can track their order on the website at https://customcaricature.lovable.app/track-order or from their dashboard after login.

IMPORTANT RULES:
- ALWAYS collect Name, Email, City FIRST before providing any service information
- NEVER shorten the pricing templates — send them in FULL exactly as written above
- NEVER modify the wording of templates
- ALWAYS insert the user's name where [User Name] appears
- Maintain premium positioning at all times
- If unsure about anything specific, direct them to call 8369594271 or visit the website
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
      console.error("AI gateway error:", response.status);
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
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
