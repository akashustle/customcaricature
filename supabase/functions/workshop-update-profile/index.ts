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
    const body = await req.json();
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    const loginMobile = typeof body.login_mobile === "string" ? body.login_mobile.trim() : "";
    const loginEmail = typeof body.login_email === "string" ? body.login_email.trim().toLowerCase() : "";

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "user_id is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing } = await supabase
      .from("workshop_users")
      .select("id, mobile, email, is_enabled")
      .eq("id", userId)
      .maybeSingle();

    if (!existing || !existing.is_enabled) {
      return new Response(JSON.stringify({ success: false, error: "Workshop user not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mobileMatch = loginMobile && existing.mobile === loginMobile;
    const emailMatch = loginEmail && (existing.email || "").toLowerCase() === loginEmail;

    if (!mobileMatch && !emailMatch) {
      return new Response(JSON.stringify({ success: false, error: "Profile verification failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      "name", "mobile", "email", "instagram_id", "age", "occupation",
      "why_join", "gender", "avatar_url",
      "country", "state", "city", "district",
      "skill_level", "artist_background_type", "artist_background",
      "verification_status", "verification_submitted_at", "verification_notes"
    ];
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = body[field] ?? null;
      }
    }

    const { data, error } = await supabase
      .from("workshop_users")
      .update(updates)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
