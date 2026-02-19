import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, secret_code } = await req.json();

    if (!email || !secret_code) {
      // Always return 200 with error in body so supabase.functions.invoke doesn't throw
      return new Response(JSON.stringify({ success: false, error: "Email and secret code are required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof email !== "string" || email.length > 255 || typeof secret_code !== "string" || secret_code.length > 10) {
      return new Response(JSON.stringify({ success: false, error: "Invalid input" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, secret_code, secret_code_login_enabled")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Secret code login is available for all users who have a secret code
    // No need to check secret_code_login_enabled flag anymore

    if (!profile.secret_code || profile.secret_code !== secret_code.trim()) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic link for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.trim().toLowerCase(),
    });

    if (linkError || !linkData) {
      console.error("Link generation error:", linkError);
      return new Response(JSON.stringify({ success: false, error: "Authentication failed. Please try again." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      token_hash: linkData.properties.hashed_token,
      email: email.trim().toLowerCase(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Secret code login error:", error);
    return new Response(JSON.stringify({ success: false, error: "Authentication failed. Please try again." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
