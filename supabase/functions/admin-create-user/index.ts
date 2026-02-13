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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
    if (!roles || !roles.some((r: any) => r.role === "admin")) {
      throw new Error("Not authorized");
    }

    const body = await req.json();
    const { email, password, full_name, mobile, instagram_id, address, city, state, pincode } = body;

    if (!email || !password || !full_name || !mobile) {
      throw new Error("Missing required fields");
    }

    // Check if email already exists
    const { data: existingProfiles } = await adminClient.from("profiles").select("email").eq("email", email);
    if (existingProfiles && existingProfiles.length > 0) {
      throw new Error("A user with this email already exists");
    }

    // Create auth user using admin API (doesn't affect caller session)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    // Create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      user_id: authData.user.id,
      full_name,
      mobile,
      email,
      instagram_id: instagram_id || null,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
    });
    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
