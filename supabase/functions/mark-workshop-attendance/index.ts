import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    const sessionDate = typeof body.session_date === "string" ? body.session_date : toLocalDate();

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "user_id is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: workshopUser } = await supabase
      .from("workshop_users")
      .select("id, slot, is_enabled")
      .eq("id", userId)
      .maybeSingle();

    if (!workshopUser || !workshopUser.is_enabled) {
      return new Response(JSON.stringify({ success: false, error: "Invalid workshop user" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: attendanceSetting } = await supabase
      .from("workshop_settings")
      .select("value")
      .eq("id", "online_attendance_enabled")
      .maybeSingle();

    const attendanceEnabled = attendanceSetting?.value?.enabled !== false;
    if (!attendanceEnabled) {
      return new Response(JSON.stringify({ success: false, error: "Online attendance is disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prompt } = await supabase
      .from("workshop_online_attendance_prompts")
      .select("id, slot")
      .eq("is_active", true)
      .eq("session_date", sessionDate)
      .or(`slot.eq.${workshopUser.slot},slot.eq.all`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prompt) {
      return new Response(JSON.stringify({ success: false, error: "No active prompt for your slot/date" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.from("workshop_attendance").upsert(
      {
        user_id: userId,
        session_date: sessionDate,
        status: "present",
        marked_by: null,
      },
      { onConflict: "user_id,session_date" },
    );

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
