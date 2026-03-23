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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find pending scheduled notifications that are due
    const { data: scheduled, error } = await supabase
      .from("scheduled_push_notifications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString());

    if (error) throw error;
    if (!scheduled || scheduled.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    for (const notif of scheduled) {
      try {
        // Get target users
        let targetUserIds: string[] = [];

        if (notif.target_type === "all") {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id");
          targetUserIds = (profiles || []).map((p: any) => p.user_id);
        } else {
          targetUserIds = notif.target_user_ids || [];
        }

        if (targetUserIds.length === 0) {
          await supabase.from("scheduled_push_notifications").update({
            status: "sent", sent_at: new Date().toISOString(), sent_count: 0,
          }).eq("id", notif.id);
          continue;
        }

        // Insert in-app notifications (triggers web push via DB trigger)
        const notifications = targetUserIds.map((uid: string) => ({
          user_id: uid,
          title: notif.title,
          message: notif.message,
          type: "broadcast",
          link: notif.link || null,
        }));

        let sentCount = 0;
        for (let i = 0; i < notifications.length; i += 50) {
          const chunk = notifications.slice(i, i + 50);
          const { error: insertErr } = await supabase.from("notifications").insert(chunk);
          if (!insertErr) sentCount += chunk.length;
        }

        // Update scheduled notification status
        await supabase.from("scheduled_push_notifications").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
        }).eq("id", notif.id);

        totalProcessed++;
      } catch (err) {
        console.error(`Failed to process scheduled notification ${notif.id}:`, err);
        await supabase.from("scheduled_push_notifications").update({
          status: "failed",
        }).eq("id", notif.id);
      }
    }

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("process-scheduled-push error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
