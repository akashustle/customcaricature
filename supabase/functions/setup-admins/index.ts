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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { setup_key } = body;

    // Simple setup key to prevent unauthorized access
    if (setup_key !== "CCC_SETUP_2026_ADMIN") {
      return new Response(JSON.stringify({ error: "Invalid setup key" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    // 1. Update main admin password (creativecaricatureclub@gmail.com)
    const { data: mainAdminList } = await adminClient.auth.admin.listUsers();
    const mainAdmin = mainAdminList?.users?.find((u: any) => u.email === "creativecaricatureclub@gmail.com");
    
    if (mainAdmin) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(mainAdmin.id, {
        password: "@Pass#akashccc@2006",
      });
      if (updateError) {
        results.push(`Main admin password update failed: ${updateError.message}`);
      } else {
        results.push("Main admin password updated successfully");
      }
      
      // Ensure admin role exists
      const { data: existingRoles } = await adminClient.from("user_roles").select("role").eq("user_id", mainAdmin.id);
      const hasAdmin = existingRoles?.some((r: any) => r.role === "admin");
      if (!hasAdmin) {
        await adminClient.from("user_roles").insert({ user_id: mainAdmin.id, role: "admin" });
      }
    } else {
      // Create main admin
      const { data: newAdmin, error: createError } = await adminClient.auth.admin.createUser({
        email: "creativecaricatureclub@gmail.com",
        password: "@Pass#akashccc@2006",
        email_confirm: true,
        user_metadata: { full_name: "CCC Admin", mobile: "8369594271" },
      });
      if (createError) {
        results.push(`Main admin creation failed: ${createError.message}`);
      } else if (newAdmin.user) {
        await adminClient.from("user_roles").insert({ user_id: newAdmin.user.id, role: "admin" });
        results.push("Main admin created successfully");
      }
    }

    // 2. Create/update shop admin (akashustle@gmail.com) 
    const shopAdmin = mainAdminList?.users?.find((u: any) => u.email === "akashustle@gmail.com");
    
    if (shopAdmin) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(shopAdmin.id, {
        password: "@Pass#akashshop@2006",
      });
      if (updateError) {
        results.push(`Shop admin password update failed: ${updateError.message}`);
      } else {
        results.push("Shop admin password updated");
      }
      // Ensure shop_admin role
      const { data: existingRoles } = await adminClient.from("user_roles").select("role").eq("user_id", shopAdmin.id);
      const hasShopAdmin = existingRoles?.some((r: any) => r.role === "shop_admin");
      if (!hasShopAdmin) {
        await adminClient.from("user_roles").insert({ user_id: shopAdmin.id, role: "shop_admin" });
        results.push("Shop admin role added");
      }
    } else {
      // Create shop admin
      const { data: newShopAdmin, error: createError } = await adminClient.auth.admin.createUser({
        email: "akashustle@gmail.com",
        password: "@Pass#akashshop@2006",
        email_confirm: true,
        user_metadata: { full_name: "Shop Admin", mobile: "0000000000" },
      });
      if (createError) {
        results.push(`Shop admin creation failed: ${createError.message}`);
      } else if (newShopAdmin.user) {
        await adminClient.from("user_roles").insert({ user_id: newShopAdmin.user.id, role: "shop_admin" });
        results.push("Shop admin created with shop_admin role");
      }
    }

    // 3. Set up workshop admin role for akashustle@gmail.com
    // Workshop admin uses same account but with admin role check
    // The workshop admin login checks for 'admin' role, so we need to add that
    const shopAdminRefresh = mainAdminList?.users?.find((u: any) => u.email === "akashustle@gmail.com");
    if (shopAdminRefresh) {
      // Also update password for workshop admin use
      await adminClient.auth.admin.updateUserById(shopAdminRefresh.id, {
        password: "@Pass#akashworkshop@2006",
      });
      // Note: Since workshop and shop share the same email but need different passwords,
      // we'll keep the last set password. The user should use the workshop password.
      // Add admin role for workshop access
      const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", shopAdminRefresh.id);
      const hasAdminRole = roles?.some((r: any) => r.role === "admin");
      if (!hasAdminRole) {
        await adminClient.from("user_roles").insert({ user_id: shopAdminRefresh.id, role: "admin" });
        results.push("Admin role added to shop/workshop admin");
      }
    }

    // 4. Remove old admin roles that shouldn't exist
    // Remove shop_admin from main admin (creativecaricatureclub@gmail.com)
    if (mainAdmin) {
      await adminClient.from("user_roles").delete().eq("user_id", mainAdmin.id).eq("role", "shop_admin");
      results.push("Removed shop_admin role from main admin");
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Setup error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
