import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 60;

// Generic error to prevent enumeration
const GENERIC_ERROR = "Invalid credentials. Please check your email and secret code.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
    const secret_code = typeof body.secret_code === "string" ? body.secret_code.trim() : "";
    const new_password = typeof body.new_password === "string" ? body.new_password : "";

    // Input validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!secret_code || !/^\d{4}$/.test(secret_code)) {
      return new Response(JSON.stringify({ error: GENERIC_ERROR }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!new_password || new_password.length < 6 || new_password.length > 128) {
      return new Response(JSON.stringify({ error: "Password must be between 6 and 128 characters" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Clean up old attempts (older than 24 hours) to prevent data accumulation
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("reset_attempts").delete().lt("attempted_at", dayAgo);

    // Rate limiting: check recent attempts for this email
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("reset_attempts")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("attempted_at", windowStart);

    if (count !== null && count >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please try again later." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log this attempt
    await supabase.from("reset_attempts").insert({ email });

    // Verify secret code - use uniform error messages
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, secret_code")
      .eq("email", email)
      .maybeSingle();

    if (profileError || !profile || profile.secret_code !== secret_code) {
      // Same error regardless of whether email exists or code is wrong
      return new Response(JSON.stringify({ error: GENERIC_ERROR }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.user_id,
      { password: new_password }
    );

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to reset password. Please try again." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up old attempts for this email on success
    await supabase.from("reset_attempts").delete().eq("email", email).lt("attempted_at", windowStart);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Password reset error");
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
