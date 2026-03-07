import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url, style } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const stylePrompts: Record<string, string> = {
      classic: "Transform this photo into a classic hand-drawn caricature with exaggerated features, warm colors, and artistic pen strokes. Make it look like a professional caricature artist drew it.",
      cartoon: "Transform this photo into a vibrant colorful cartoon caricature style with bold outlines, big expressive eyes, and fun exaggerated proportions. Pixar/Disney inspired.",
      pop_art: "Transform this photo into a bold pop art caricature style like Andy Warhol with bright neon colors, halftone dots, and comic book style. Very colorful and artistic.",
      minimal: "Transform this photo into a clean minimal line-art caricature with simple elegant strokes, minimal shading, and a sophisticated artistic look.",
    };

    const prompt = stylePrompts[style] || stylePrompts.classic;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image_url } }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: "AI generation failed. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      return new Response(JSON.stringify({ error: "No image generated. Try a different photo." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Upload generated image to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const fileName = `generated/${Date.now()}-${style}.png`;

    const uploadResp = await fetch(`${supabaseUrl}/storage/v1/object/caricature-uploads/${fileName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "image/png",
      },
      body: binaryData,
    });

    if (!uploadResp.ok) {
      // Return base64 directly if upload fails
      return new Response(JSON.stringify({ caricature_url: imageData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/caricature-uploads/${fileName}`;

    return new Response(JSON.stringify({ caricature_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Generate caricature error:", error);
    return new Response(JSON.stringify({ error: "Generation failed. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
