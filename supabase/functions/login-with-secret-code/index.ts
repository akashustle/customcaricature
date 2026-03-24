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
      return new Response(JSON.stringify({ success: false, error: "Email and secret code are required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof email !== "string" || email.length > 255 || typeof secret_code !== "string" || secret_code.length > 20) {
      return new Response(JSON.stringify({ success: false, error: "Invalid input" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const normalizedEmail = email.trim().toLowerCase();
    console.log("Login attempt for:", normalizedEmail);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, secret_code")
      .eq("email", normalizedEmail)
      .maybeSingle();

    console.log("Profile lookup result:", { found: !!profile, error: profileError?.message });

    if (profileError) {
      console.error("Profile query error:", profileError);
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile) {
      console.log("No profile found for email:", normalizedEmail);
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check against master admin secret code from site settings
    let masterCode = "01022006";
    const { data: settingData } = await supabase
      .from("admin_site_settings")
      .select("value")
      .eq("id", "admin_secret_code")
      .maybeSingle();
    if (settingData?.value && typeof settingData.value === 'object' && 'code' in (settingData.value as Record<string, unknown>)) {
      masterCode = String((settingData.value as Record<string, unknown>).code);
    }

    const inputCode = secret_code.trim();
    const profileCode = profile.secret_code || "";

    console.log("Code comparison:", { inputLen: inputCode.length, masterLen: masterCode.length, profileCodeLen: profileCode.length, match: inputCode === masterCode || inputCode === profileCode });

    // Accept if matches master code OR profile's own secret code
    const codeMatch = inputCode === masterCode || inputCode === profileCode;

    if (!codeMatch) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic link for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

    if (linkError || !linkData) {
      console.error("Link generation error:", linkError);
      return new Response(JSON.stringify({ success: false, error: "Authentication failed. Please try again." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Login successful for:", normalizedEmail);

    return new Response(JSON.stringify({ 
      success: true,
      token_hash: linkData.properties.hashed_token,
      email: normalizedEmail,
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
