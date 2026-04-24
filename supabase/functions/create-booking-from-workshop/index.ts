// Auto-creates a booking (auth) account for a logged-in workshop student.
//
// Why an edge function (instead of plain supabase.auth.signUp from the
// client)?
//   1. We can mark the email as already verified (`email_confirm: true`) so
//      the student doesn't get bounced into an OTP / email-link flow. The
//      workshop admin already verified them when they enrolled.
//   2. We seed the `profiles` row with ALL of their workshop data (name,
//      mobile, instagram, age, gender, country/state/city/district, etc.)
//      using `raw_user_meta_data` — the existing `handle_new_user` trigger
//      copies that into the profile.
//   3. We tag the profile with `created_from_workshop = true` so admins see
//      an "Auto Created" badge in the customer list.
//   4. We immediately link `workshop_users.auth_user_id` so the two
//      identities are interconnected.
//
// Body: { workshop_user_id: string, password: string, email?: string,
//         mobile?: string, full_name?: string }
//
// Response: { success, user_id, email, status: "created" | "linked_existing" }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as any));
    const workshop_user_id: string = String(body.workshop_user_id || "").trim();
    const password: string = String(body.password || "");
    const overrideEmail: string = String(body.email || "").trim().toLowerCase();
    const overrideMobile: string = String(body.mobile || "").replace(/\D/g, "");
    const overrideName: string = String(body.full_name || "").trim();

    if (!workshop_user_id) return json({ success: false, error: "workshop_user_id is required" }, 400);
    if (!password || password.length < 6) return json({ success: false, error: "Password must be at least 6 characters" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Load the workshop_users row
    const { data: ws, error: wsErr } = await supabase
      .from("workshop_users")
      .select("*")
      .eq("id", workshop_user_id)
      .maybeSingle();
    if (wsErr) return json({ success: false, error: wsErr.message }, 500);
    if (!ws) return json({ success: false, error: "Workshop record not found" }, 404);

    const email = (overrideEmail || (ws.email || "").toLowerCase()).trim();
    const mobile = overrideMobile || (ws.mobile || "").replace(/\D/g, "");
    const full_name = overrideName || ws.name || "Student";

    if (!email) return json({ success: false, error: "Email required to create booking account" }, 400);

    // 2) If workshop_users already linked, just return success
    if (ws.auth_user_id) {
      // Make sure the corresponding profile is flagged as auto-created
      await supabase
        .from("profiles")
        .update({ created_from_workshop: true })
        .eq("user_id", ws.auth_user_id);
      return json({ success: true, user_id: ws.auth_user_id, email, status: "already_linked" });
    }

    // 3) If a profile with this email already exists, simply link the
    //    existing auth user. We don't reset their password.
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.user_id) {
      const linkedUserId = existingProfile.user_id;
      await supabase
        .from("workshop_users")
        .update({ auth_user_id: linkedUserId, updated_at: new Date().toISOString() })
        .eq("id", workshop_user_id);
      await supabase
        .from("profiles")
        .update({ created_from_workshop: true })
        .eq("user_id", linkedUserId);
      return json({ success: true, user_id: linkedUserId, email, status: "linked_existing" });
    }

    // 4) Create a new auth user with email pre-confirmed (no OTP needed).
    //    The handle_new_user trigger will read raw_user_meta_data and seed
    //    the profiles row with everything we pass here.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        mobile,
        instagram_id: ws.instagram_id || null,
        city: ws.city || null,
        state: ws.state || null,
        district: ws.district || null,
        country: ws.country || "India",
        age: ws.age || null,
        gender: ws.gender || null,
        created_from_workshop: true,
      },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message || "Failed to create booking account";
      return json({ success: false, error: msg }, 500);
    }

    const newUserId = created.user.id;

    // 5) Mirror the workshop attributes onto the profile row in case the
    //    trigger missed any (e.g. country wasn't part of the trigger's
    //    INSERT). This is idempotent.
    await supabase
      .from("profiles")
      .update({
        full_name,
        mobile: mobile || null,
        instagram_id: ws.instagram_id || null,
        age: ws.age || null,
        gender: ws.gender || null,
        city: ws.city || null,
        state: ws.state || null,
        district: ws.district || null,
        email_verified: true,
        verification_method: "workshop_auto",
        created_from_workshop: true,
      })
      .eq("user_id", newUserId);

    // 6) Link workshop_users → auth user
    await supabase
      .from("workshop_users")
      .update({ auth_user_id: newUserId, updated_at: new Date().toISOString() })
      .eq("id", workshop_user_id);

    return json({ success: true, user_id: newUserId, email, status: "created" });
  } catch (e) {
    return json({
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    }, 500);
  }
});
