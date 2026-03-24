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
    const { secret_code, action } = body;

    if (secret_code !== "01022006") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "cleanup") {
      // Delete old auth users
      const oldUserIds = body.user_ids || [];
      for (const uid of oldUserIds) {
        try {
          await adminClient.auth.admin.deleteUser(uid);
        } catch (e) {
          console.warn("Could not delete user", uid, e);
        }
      }
      return new Response(JSON.stringify({ success: true, message: "Cleanup done" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_admins") {
      const admins = body.admins || [];
      const results: any[] = [];

      for (const admin of admins) {
        try {
          // Try to create, if exists update
          let userId: string;
          
          const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
            email: admin.email,
            password: admin.password,
            email_confirm: true,
            user_metadata: {
              full_name: admin.full_name,
              mobile: admin.mobile,
              age: admin.age,
            },
          });
          
          if (createError && createError.message?.includes("already been registered")) {
            // Find existing user and update
            const { data: { users } } = await adminClient.auth.admin.listUsers();
            const existingUser = users?.find((u: any) => u.email === admin.email);
            if (!existingUser) {
              results.push({ email: admin.email, success: false, error: "User exists but not found" });
              continue;
            }
            userId = existingUser.id;
            await adminClient.auth.admin.updateUser(userId, { 
              password: admin.password,
              user_metadata: { full_name: admin.full_name, mobile: admin.mobile, age: admin.age }
            });
          } else if (createError || !authData?.user) {
            results.push({ email: admin.email, success: false, error: createError?.message });
            continue;
          } else {
            userId = authData.user.id;
          }

          // Update profile
          await adminClient.from("profiles").upsert({
            user_id: userId,
            full_name: admin.full_name,
            mobile: admin.mobile,
            email: admin.email,
            age: admin.age,
          }, { onConflict: "user_id" });

          // Ensure admin role
          await adminClient.from("user_roles").upsert({
            user_id: userId,
            role: "admin",
          }, { onConflict: "user_id,role" });

          // Set up login tracking
          await adminClient.from("admin_login_tracking").upsert({
            user_id: userId,
            total_logins: 0,
            otp_required: false,
          }, { onConflict: "user_id" });

          results.push({ email: admin.email, success: true, user_id: userId });
        } catch (err: any) {
          results.push({ email: admin.email, success: false, error: err.message });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Bootstrap error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
