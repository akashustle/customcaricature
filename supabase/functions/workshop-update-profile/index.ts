// Workshop profile updater + verification orchestrator.
// - Students call with their identifying email/mobile to update their own profile.
// - Admins call with `admin_action: "approve" | "reject" | "reset"` to manage verification.
// Every verification state change is logged to `workshop_verification_history`.
// On submit / approve / reject we also drop a notification into the `notifications`
// table so the user sees the update inside the Notifications screen of the app.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    const loginMobile = typeof body.login_mobile === "string" ? body.login_mobile.trim() : "";
    const loginEmail = typeof body.login_email === "string" ? body.login_email.trim().toLowerCase() : "";
    const adminAction: string | undefined = body.admin_action; // "approve" | "reject" | "reset"
    const adminName: string = (body.admin_name || "Admin").toString();
    const adminUserId: string | null = body.admin_user_id || null;

    if (!userId) return json({ success: false, error: "user_id is required" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing } = await supabase
      .from("workshop_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!existing || !existing.is_enabled) {
      return json({ success: false, error: "Workshop user not found" });
    }

    // Auth: either student-self-update (matching mobile/email) OR admin-issued action
    const isAdminAction = !!adminAction;
    if (!isAdminAction) {
      const mobileMatch = loginMobile && existing.mobile === loginMobile;
      const emailMatch = loginEmail && (existing.email || "").toLowerCase() === loginEmail;
      if (!mobileMatch && !emailMatch) {
        return json({ success: false, error: "Profile verification failed" });
      }
    }

    // ---- Build update payload ----
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedFields = [
      "name", "mobile", "email", "instagram_id", "age", "occupation",
      "why_join", "gender", "avatar_url",
      "country", "state", "city", "district",
      "skill_level", "artist_background_type", "artist_background",
      "verification_status", "verification_submitted_at", "verification_notes",
    ];
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = body[field] ?? null;
      }
    }

    // ---- Admin orchestration ----
    let historyEntry: Record<string, unknown> | null = null;
    let notification: { title: string; message: string } | null = null;
    const previousStatus = existing.verification_status || "unverified";

    if (adminAction === "approve") {
      updates.is_verified = true;
      updates.verification_status = "verified";
      updates.verified_at = new Date().toISOString();
      updates.verified_by = adminName;
      updates.verification_notes = body.notes || existing.verification_notes || null;
      historyEntry = {
        workshop_user_id: userId,
        action: "approve",
        previous_status: previousStatus,
        new_status: "verified",
        performed_by: adminName,
        performed_by_user_id: adminUserId,
        notes: body.notes || null,
      };
      notification = {
        title: "✅ You're verified!",
        message: "Your profile has been approved by the workshop team. A blue tick now shows on your profile.",
      };
    } else if (adminAction === "reject") {
      updates.is_verified = false;
      updates.verification_status = "rejected";
      updates.verified_by = adminName;
      updates.verification_notes = body.notes || null;
      historyEntry = {
        workshop_user_id: userId,
        action: "reject",
        previous_status: previousStatus,
        new_status: "rejected",
        performed_by: adminName,
        performed_by_user_id: adminUserId,
        notes: body.notes || null,
      };
      notification = {
        title: "Verification needs another look",
        message: body.notes
          ? `Your verification request was not approved. Reason: ${body.notes}`
          : "Your verification request was not approved. Please update your profile and resubmit.",
      };
    } else if (adminAction === "reset") {
      updates.is_verified = false;
      updates.verification_status = "unverified";
      updates.verification_submitted_at = null;
      updates.verified_at = null;
      updates.verified_by = null;
      historyEntry = {
        workshop_user_id: userId,
        action: "reset",
        previous_status: previousStatus,
        new_status: "unverified",
        performed_by: adminName,
        performed_by_user_id: adminUserId,
        notes: body.notes || null,
      };
    } else if (updates.verification_status === "pending") {
      // Student submitted for review
      historyEntry = {
        workshop_user_id: userId,
        action: "submit",
        previous_status: previousStatus,
        new_status: "pending",
        performed_by: existing.name || "Student",
        performed_by_user_id: null,
        notes: null,
      };
      notification = {
        title: "📨 Verification submitted",
        message: "Thanks! Your profile is under review. You'll get a notification within 24 hours.",
      };
    }

    const { data, error } = await supabase
      .from("workshop_users")
      .update(updates)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) return json({ success: false, error: error.message });

    // History (best-effort, non-fatal)
    if (historyEntry) {
      try {
        await supabase.from("workshop_verification_history").insert(historyEntry);
      } catch (e) {
        console.warn("history insert failed", e);
      }
    }

    // In-app notification (best-effort, non-fatal). We DO NOT need an auth user here —
    // the workshop_user_id is enough to surface in their dashboard "Notifications" tab.
    if (notification) {
      try {
        await supabase.from("notifications").insert({
          user_id: userId, // workshop_user.id (not auth uid) — surfaced in workshop dashboard
          title: notification.title,
          message: notification.message,
          type: "workshop",
          link: "/workshop-dashboard",
        });
      } catch (e) {
        console.warn("notification insert failed", e);
      }
    }

    return json({ success: true, user: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ success: false, error: message });
  }
});
