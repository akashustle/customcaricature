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

    if (setup_key !== "CCC_SETUP_2026_ADMIN") {
      return new Response(JSON.stringify({ error: "Invalid setup key" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    // Main admin: creativecaricatureclub@gmail.com -> 54867e8d-f825-4033-b35b-5c0e8ec525b6
    const mainAdminId = "54867e8d-f825-4033-b35b-5c0e8ec525b6";
    const { error: mainErr } = await adminClient.auth.admin.updateUserById(mainAdminId, {
      password: "@Pass#akashccc@2006",
    });
    results.push(mainErr ? `Main admin pw failed: ${mainErr.message}` : "Main admin password updated");

    // Remove shop_admin role from main admin
    await adminClient.from("user_roles").delete().eq("user_id", mainAdminId).eq("role", "shop_admin");
    results.push("Removed shop_admin from main admin");

    // Shop/Workshop admin: akashustle@gmail.com -> 376f6459-6774-4142-b0c1-832b322f851e  
    const shopAdminId = "376f6459-6774-4142-b0c1-832b322f851e";
    
    // Set shop admin password
    const { error: shopErr } = await adminClient.auth.admin.updateUserById(shopAdminId, {
      password: "@Pass#akashshop@2006",
    });
    results.push(shopErr ? `Shop admin pw failed: ${shopErr.message}` : "Shop admin password set");

    // Ensure shop_admin + admin roles for this user
    const { data: existingRoles } = await adminClient.from("user_roles").select("role").eq("user_id", shopAdminId);
    const roles = (existingRoles || []).map((r: any) => r.role);
    
    if (!roles.includes("shop_admin")) {
      await adminClient.from("user_roles").insert({ user_id: shopAdminId, role: "shop_admin" });
      results.push("Added shop_admin role");
    }
    if (!roles.includes("admin")) {
      await adminClient.from("user_roles").insert({ user_id: shopAdminId, role: "admin" });
      results.push("Added admin role for workshop access");
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
