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
    const { email, secret_code, login_type } = await req.json();

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
    const inputCode = secret_code.trim();
    console.log("Login attempt for:", normalizedEmail, "type:", login_type || "user");

    // Artist login path
    if (login_type === "artist") {
      const { data: artist, error: artistError } = await supabase
        .from("artists")
        .select("id, name, email, auth_user_id, secret_code")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (artistError || !artist) {
        console.log("Artist not found:", normalizedEmail);
        return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!artist.auth_user_id) {
        return new Response(JSON.stringify({ success: false, error: "Artist account not linked. Contact admin." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check master code
      let masterCode = "01022006";
      const { data: settingData } = await supabase
        .from("admin_site_settings").select("value").eq("id", "admin_secret_code").maybeSingle();
      if (settingData?.value && typeof settingData.value === 'object' && 'code' in (settingData.value as Record<string, unknown>)) {
        masterCode = String((settingData.value as Record<string, unknown>).code);
      }

      const artistCode = artist.secret_code || "";
      const codeMatch = inputCode === masterCode || inputCode === artistCode;

      if (!codeMatch) {
        return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the auth email for magic link
      const { data: authUser } = await supabase.auth.admin.getUserById(artist.auth_user_id);
      if (!authUser?.user?.email) {
        return new Response(JSON.stringify({ success: false, error: "Authentication failed" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: authUser.user.email,
      });

      if (linkError || !linkData) {
        console.error("Link generation error:", linkError);
        return new Response(JSON.stringify({ success: false, error: "Authentication failed. Please try again." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Artist login successful for:", normalizedEmail);
      return new Response(JSON.stringify({
        success: true,
        token_hash: linkData.properties.hashed_token,
        email: authUser.user.email,
        role: "artist",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User/Admin login path (existing logic)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, secret_code")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let masterCode = "01022006";
    const { data: settingData } = await supabase
      .from("admin_site_settings").select("value").eq("id", "admin_secret_code").maybeSingle();
    if (settingData?.value && typeof settingData.value === 'object' && 'code' in (settingData.value as Record<string, unknown>)) {
      masterCode = String((settingData.value as Record<string, unknown>).code);
    }

    const profileCode = profile.secret_code || "";
    const codeMatch = inputCode === masterCode || inputCode === profileCode;

    if (!codeMatch) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

    if (linkError || !linkData) {
      return new Response(JSON.stringify({ success: false, error: "Authentication failed. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Login successful for:", normalizedEmail);
    return new Response(JSON.stringify({
      success: true,
      token_hash: linkData.properties.hashed_token,
      email: normalizedEmail,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Secret code login error:", error);
    return new Response(JSON.stringify({ success: false, error: "Authentication failed. Please try again." }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
