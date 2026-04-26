// Admin moderation: ban, unban, delete a customer + send notification + email.
// Uses the service-role key so it can update auth.users and bypass RLS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "ban"
  | "unban"
  | "delete"
  | "verify"
  | "unverify"
  | "schedule_delete"
  | "cancel_scheduled_delete"
  | "process_due_deletions";

interface Body {
  action: Action;
  user_id?: string;
  reason?: string;
  message?: string;
  admin_name?: string;
  notify?: boolean;
  // ISO timestamp for when the account should be deleted (schedule_delete)
  scheduled_deletion_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body: Body = await req.json();
    const { action, user_id, reason, message, admin_name, notify, scheduled_deletion_at } = body;

    // process_due_deletions doesn't need a user_id
    if (action !== "process_due_deletions" && (!user_id || !action)) {
      return new Response(
        JSON.stringify({ error: "user_id and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // === Cron-style processor for due scheduled deletions ===
    if (action === "process_due_deletions") {
      const { data: due } = await admin
        .from("profiles")
        .select("user_id, full_name, email")
        .lte("scheduled_deletion_at", new Date().toISOString())
        .not("scheduled_deletion_at", "is", null);

      const processed: string[] = [];
      for (const row of due ?? []) {
        try {
          await admin.from("orders").delete().eq("user_id", row.user_id);
          await admin.from("profiles").delete().eq("user_id", row.user_id);
          await admin.auth.admin.deleteUser(row.user_id).catch(() => {});
          processed.push(row.user_id);
        } catch (e) {
          console.error("Failed to delete scheduled user", row.user_id, e);
        }
      }
      return new Response(
        JSON.stringify({ success: true, processed_count: processed.length, processed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lookup current profile (for the email + name we may need later)
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("user_id", user_id!)
      .maybeSingle();

    const fullName = profile?.full_name ?? "Customer";
    const email = profile?.email ?? null;
    const by = admin_name ?? "Admin";

    let resultMsg = "";

    switch (action) {
      case "ban": {
        await admin
          .from("profiles")
          .update({
            is_banned: true,
            ban_reason: reason ?? message ?? "Violation of platform terms",
            banned_at: new Date().toISOString(),
          })
          .eq("user_id", user_id);

        // Lock the auth user so they can't sign in
        await admin.auth.admin.updateUserById(user_id, {
          ban_duration: "876000h", // 100 years
        });

        resultMsg = `Account suspended for ${fullName}`;
        break;
      }

      case "unban": {
        await admin
          .from("profiles")
          .update({ is_banned: false, ban_reason: null, banned_at: null })
          .eq("user_id", user_id);

        await admin.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });

        resultMsg = `Account restored for ${fullName}`;
        break;
      }

      case "verify":
      case "unverify": {
        const verified = action === "verify";
        await admin
          .from("profiles")
          .update({
            is_verified: verified,
            verification_status: verified ? "verified" : "unverified",
          })
          .eq("user_id", user_id);
        resultMsg = verified
          ? `${fullName} verified ✓`
          : `Verification removed for ${fullName}`;
        break;
      }

      case "delete": {
        // Cascade-delete app data first (orders + profile)
        await admin.from("orders").delete().eq("user_id", user_id);
        await admin.from("profiles").delete().eq("user_id", user_id);

        // Then remove the auth user
        try {
          await admin.auth.admin.deleteUser(user_id);
        } catch (_) {
          // Already gone — ignore
        }
        resultMsg = `Account permanently deleted for ${fullName}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Notify the user (in-app + email) — except for delete (account is gone)
    if (notify !== false && action !== "delete") {
      const titleMap: Record<string, string> = {
        ban: "Your account has been suspended",
        unban: "Your account has been restored",
        verify: "You're verified! ✓",
        unverify: "Verification removed",
      };
      const title = titleMap[action] ?? "Account update";
      const userMsg =
        message ?? reason ?? `${by} updated your account.`;

      try {
        await admin.from("notifications").insert({
          user_id,
          title,
          message: userMsg,
          type: "broadcast",
          link: "/dashboard",
        });
      } catch (_) {/* non-fatal */}

      // Best-effort email via existing function
      if (email) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              to: email,
              subject: title,
              message: userMsg,
              user_name: fullName,
            }),
          });
        } catch (_) {/* non-fatal */}
      }
    }

    // Log to admin activity
    try {
      await admin.from("admin_activity_logs").insert({
        admin_id: user_id, // using target as fallback if admin id unknown
        admin_name: by,
        action_type: action,
        module: "customers",
        target_id: user_id,
        description: resultMsg,
      });
    } catch (_) {/* non-fatal */}

    return new Response(
      JSON.stringify({ success: true, message: resultMsg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("admin-moderate-user error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
