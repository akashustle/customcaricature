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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
    if (!roles || !roles.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Not authorized - admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, mobile, instagram_id, address, city, state, pincode, make_admin, make_artist, artist_name, experience } = body;

    if (!email || !password || !full_name || !mobile) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, password, full_name, mobile" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation
    const emailStr = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr) || emailStr.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const passwordStr = String(password);
    if (passwordStr.length < 6 || passwordStr.length > 128) {
      return new Response(JSON.stringify({ error: "Password must be between 6 and 128 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nameStr = String(full_name).trim();
    if (nameStr.length < 1 || nameStr.length > 200) {
      return new Response(JSON.stringify({ error: "Name must be between 1 and 200 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mobileStr = String(mobile).replace(/\D/g, "");
    if (!/^\d{10}$/.test(mobileStr)) {
      return new Response(JSON.stringify({ error: "Mobile must be a 10-digit number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already exists
    const { data: existingProfiles } = await adminClient.from("profiles").select("email").eq("email", email);
    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name, mobile,
        instagram_id: instagram_id || null,
        address: address || null, city: city || null, state: state || null, pincode: pincode || null,
      },
    });
    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as manual customer
    await adminClient.from("profiles").update({ is_manual: true }).eq("user_id", authData.user.id);

    // If make_admin flag is set, add admin role
    if (make_admin) {
      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: authData.user.id,
        role: "admin",
      });
      if (roleError) {
        console.error("Role assignment error:", roleError);
      }
    }

    // If make_artist flag is set, add artist role and link to artists table
    if (make_artist) {
      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: authData.user.id,
        role: "artist",
      });
      if (roleError) {
        console.error("Artist role assignment error:", roleError);
      }

      // Update artist record with auth_user_id
      if (artist_name) {
        // Check if artist already exists by name
        const { data: existingArtist } = await adminClient.from("artists").select("id").eq("name", artist_name).maybeSingle();
        if (existingArtist) {
          await adminClient.from("artists").update({ 
            auth_user_id: authData.user.id,
            email: email,
            mobile: mobile,
          }).eq("id", existingArtist.id);
        } else {
          await adminClient.from("artists").insert({
            name: artist_name || full_name,
            email: email,
            mobile: mobile,
            experience: experience || null,
            auth_user_id: authData.user.id,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
