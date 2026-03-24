import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Check admin role
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const { action, logId, code, performedBy } = await req.json();

    if (action === "verify_access") {
      const isValid = code === "01022-006";
      await adminClient.from("reversal_access_logs").insert({
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        device: req.headers.get("user-agent")?.slice(0, 200) || "unknown",
        status: isValid ? "success" : "fail",
      });
      return new Response(JSON.stringify({ success: isValid }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "restore") {
      // Get the snapshot
      const { data: snapshot } = await adminClient.from("reversal_snapshots").select("*").eq("log_id", logId).order("created_at", { ascending: false }).limit(1).single();
      if (!snapshot) {
        return new Response(JSON.stringify({ error: "Snapshot not found" }), { status: 404, headers: corsHeaders });
      }

      const { data: log } = await adminClient.from("reversal_logs").select("*").eq("id", logId).single();
      if (!log) {
        return new Response(JSON.stringify({ error: "Log not found" }), { status: 404, headers: corsHeaders });
      }

      // Attempt restore based on entity type and action
      const restoreData = snapshot.previous_data || snapshot.full_snapshot;
      if (restoreData && log.entity_type && log.entity_id) {
        try {
          // Try to upsert the data back
          const { error: restoreError } = await adminClient
            .from(log.entity_type)
            .upsert({ ...restoreData, id: log.entity_id }, { onConflict: "id" });

          if (restoreError) {
            console.error("Restore error:", restoreError);
          }
        } catch (e) {
          console.error("Restore failed:", e);
        }
      }

      // Log the restore action
      await adminClient.from("reversal_actions").insert({
        log_id: logId,
        action: "restore",
        performed_by: performedBy || userId,
      });

      return new Response(JSON.stringify({ success: true, message: "Data restored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "permanent_delete") {
      if (code !== "0102-2006") {
        return new Response(JSON.stringify({ error: "Invalid deletion code" }), { status: 403, headers: corsHeaders });
      }

      await adminClient.from("reversal_actions").insert({
        log_id: logId,
        action: "permanent_delete",
        performed_by: performedBy || userId,
      });

      // Delete snapshots and the log
      await adminClient.from("reversal_snapshots").delete().eq("log_id", logId);
      await adminClient.from("reversal_actions").delete().eq("log_id", logId);
      await adminClient.from("reversal_logs").delete().eq("id", logId);

      return new Response(JSON.stringify({ success: true, message: "Permanently deleted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("Reversal function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
