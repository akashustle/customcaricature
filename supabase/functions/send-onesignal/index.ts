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
    const body = await req.json();
    const { action, user_ids, title, message, url, data: extraData, admin_user_id } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const onesignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get OneSignal config from DB
    const { data: configRow } = await supabase
      .from("admin_site_settings")
      .select("value")
      .eq("id", "onesignal_config")
      .maybeSingle();

    const config = configRow?.value as any;
    // Soft-skip when channel disabled or unconfigured — never fail the broadcast
    if (!config?.enabled || !config?.app_id) {
      return new Response(JSON.stringify({ sent: 0, skipped: true, reason: "OneSignal channel disabled or app_id missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use secret env var first, then fall back to DB config
    const apiKey = onesignalApiKey || config?.rest_api_key;
    if (!apiKey) {
      return new Response(JSON.stringify({ sent: 0, skipped: true, reason: "OneSignal REST API key not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build OneSignal notification payload
    const notifPayload: any = {
      app_id: config.app_id,
      headings: { en: title || "Creative Caricature Club" },
      contents: { en: message || "You have a new notification" },
      chrome_web_icon: "https://customcaricature.lovable.app/logo.png",
      chrome_web_badge: "https://customcaricature.lovable.app/logo.png",
      data: extraData || {},
    };

    if (url) {
      notifPayload.url = url.startsWith("http") ? url : `https://customcaricature.lovable.app${url}`;
    }

    // Target specific users or all
    if (action === "send_to_admins") {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (adminRoles && adminRoles.length > 0) {
        notifPayload.include_aliases = {
          external_id: adminRoles.map((r: any) => r.user_id),
        };
        notifPayload.target_channel = "push";
      } else {
        return new Response(JSON.stringify({ sent: 0, reason: "no admins" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (user_ids && user_ids.length > 0) {
      notifPayload.include_aliases = {
        external_id: user_ids,
      };
      notifPayload.target_channel = "push";
    } else {
      // Send to all subscribed users
      notifPayload.included_segments = ["Subscribed Users"];
    }

    // Send via OneSignal REST API
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${apiKey}`,
      },
      body: JSON.stringify(notifPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("OneSignal API error:", result);
      // Return 200 + error info so client (Promise.allSettled) sees it as a soft failure,
      // not a thrown invoke error. The web-push channel still delivers in parallel.
      return new Response(JSON.stringify({ sent: 0, skipped: true, error: "OneSignal upstream error", details: result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("OneSignal notification sent:", result);
    return new Response(JSON.stringify({ sent: result.recipients ?? 0, success: true, onesignal_id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-onesignal error:", err);
    return new Response(JSON.stringify({ sent: 0, skipped: true, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
