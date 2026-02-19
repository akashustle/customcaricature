import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, secret_code } = await req.json();

    if (!email || !secret_code) {
      return new Response(JSON.stringify({ error: "Email and secret code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate inputs
    if (typeof email !== "string" || email.length > 255 || typeof secret_code !== "string" || secret_code.length > 10) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find user profile by email with secret code login enabled
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, secret_code, secret_code_login_enabled")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if secret code login is enabled for this user
    if (!profile.secret_code_login_enabled) {
      return new Response(JSON.stringify({ error: "Secret code login is not enabled for this account. Please use password." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify secret code
    if (!profile.secret_code || profile.secret_code !== secret_code.trim()) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
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
      return new Response(JSON.stringify({ error: "Authentication failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the token hash from the generated link
    const url = new URL(linkData.properties.action_link);
    const token_hash = url.searchParams.get("token") || url.hash?.split("token=")[1]?.split("&")[0];

    // Use verifyOtp approach - return the hashed token for client to use
    return new Response(JSON.stringify({ 
      token_hash: linkData.properties.hashed_token,
      email: email.trim().toLowerCase(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Secret code login error:", error);
    return new Response(JSON.stringify({ error: "Authentication failed. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
