// Admin-only edge function: reverts an audit_log entry by restoring old_data
// or deleting an INSERT. Verifies the caller is an admin via JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") || "";

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audit_id } = await req.json();
    if (!audit_id) {
      return new Response(JSON.stringify({ error: "audit_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: entry, error: fetchErr } = await admin
      .from("admin_audit_log")
      .select("*")
      .eq("id", audit_id)
      .maybeSingle();
    if (fetchErr || !entry) {
      return new Response(JSON.stringify({ error: "Audit entry not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { table_name, operation, row_pk, old_data, new_data } = entry as any;

    // Block reverts for sensitive tables
    const blocked = ["admin_audit_log", "user_roles", "auth.users"];
    if (blocked.includes(table_name)) {
      return new Response(
        JSON.stringify({ error: `Revert not allowed on ${table_name}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result: any;
    if (operation === "INSERT") {
      // Undo by deleting the row
      result = await admin.from(table_name).delete().eq("id", row_pk);
    } else if (operation === "DELETE") {
      // Undo by re-inserting old data
      if (!old_data) throw new Error("No old_data to restore");
      result = await admin.from(table_name).insert(old_data);
    } else if (operation === "UPDATE") {
      // Undo by writing old_data back (excluding immutable fields)
      if (!old_data) throw new Error("No old_data to revert to");
      const restore = { ...old_data };
      delete restore.created_at;
      result = await admin.from(table_name).update(restore).eq("id", row_pk);
    }

    if (result?.error) throw result.error;

    return new Response(
      JSON.stringify({ success: true, operation, table_name, row_pk }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("audit-revert error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
