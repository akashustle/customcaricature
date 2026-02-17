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
    const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
    const secret_code = typeof body.secret_code === "string" ? body.secret_code.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!secret_code || !/^\d{4}$/.test(secret_code)) {
      return new Response(JSON.stringify({ error: "Invalid secret code" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limiting
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("reset_attempts")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("attempted_at", windowStart);

    if (count !== null && count >= 5) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please try again later." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log attempt
    await supabase.from("reset_attempts").insert({ email });

    // Verify secret code
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, secret_code")
      .eq("email", email)
      .maybeSingle();

    if (!profile || profile.secret_code !== secret_code) {
      return new Response(JSON.stringify({ error: "Invalid credentials. Please check your email and secret code." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's password - we can't retrieve plaintext passwords from Supabase
    // Instead, we'll generate a temporary password, set it, and return it
    const tempChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let tempPassword = "";
    for (let i = 0; i < 10; i++) {
      tempPassword += tempChars.charAt(Math.floor(Math.random() * tempChars.length));
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.user_id,
      { password: tempPassword }
    );

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to generate password. Please try again." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, password: tempPassword }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get password error");
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
