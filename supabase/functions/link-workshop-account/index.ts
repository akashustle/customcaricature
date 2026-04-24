// Link or auto-create a workshop_users row for a logged-in auth user.
//
// Use cases:
//   1. User has a profile but no workshop record → we auto-create a minimal
//      workshop_users row so they can immediately use the workshop dashboard
//      (e.g. browse free recorded videos, claim certificates, etc.).
//   2. User already has a workshop_users row matched by email/mobile but
//      `auth_user_id` is NULL → we link it so both dashboards stay in sync.
//   3. User is already linked → we simply return the existing record.
//
// Body: { auth_user_id: string, email?: string, mobile?: string, full_name?: string }
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
    const auth_user_id: string = (body.auth_user_id || "").toString();
    const email: string = (body.email || "").toString().trim().toLowerCase();
    const mobile: string = (body.mobile || "").toString().replace(/\D/g, "");
    const full_name: string = (body.full_name || "Student").toString().trim();

    if (!auth_user_id) return json({ success: false, error: "auth_user_id required" }, 400);
    if (!email && !mobile) return json({ success: false, error: "email or mobile required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Already linked?
    {
      const { data } = await supabase.from("workshop_users").select("*")
        .eq("auth_user_id", auth_user_id).maybeSingle();
      if (data) return json({ success: true, workshop_user: data, status: "already_linked" });
    }

    // 2) Find existing by email or mobile
    let existing: any = null;
    if (email) {
      const { data } = await supabase.from("workshop_users").select("*")
        .ilike("email", email).maybeSingle();
      if (data) existing = data;
    }
    if (!existing && mobile) {
      const { data } = await supabase.from("workshop_users").select("*")
        .eq("mobile", mobile).maybeSingle();
      if (data) existing = data;
    }

    if (existing) {
      const { data: updated, error } = await supabase.from("workshop_users")
        .update({ auth_user_id, updated_at: new Date().toISOString() })
        .eq("id", existing.id).select("*").single();
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, workshop_user: updated, status: "linked_existing" });
    }

    // 3) Auto-create minimal record
    const insertPayload: Record<string, unknown> = {
      auth_user_id,
      name: full_name,
      email: email || null,
      mobile: mobile || null,
      is_enabled: true,
      student_type: "auto",
      payment_status: "pending",
      country: "India",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: insErr } = await supabase.from("workshop_users")
      .insert(insertPayload).select("*").single();
    if (insErr) return json({ success: false, error: insErr.message }, 500);

    return json({ success: true, workshop_user: created, status: "auto_created" });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
