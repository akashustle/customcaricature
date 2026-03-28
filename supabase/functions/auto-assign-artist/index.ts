import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { event_id, artist_count } = await req.json();
    if (!event_id) {
      return new Response(JSON.stringify({ error: "Missing event_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if auto-assign is enabled
    const { data: setting } = await supabase.from("admin_site_settings").select("value").eq("id", "auto_assign_artist").single();
    if (!setting || !(setting.value as any)?.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "Auto-assign is disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get event details
    const { data: event } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already has artists assigned?
    const { data: existingAssignments } = await supabase
      .from("event_artist_assignments")
      .select("id")
      .eq("event_id", event_id);
    if (existingAssignments && existingAssignments.length >= (artist_count || event.artist_count || 1)) {
      return new Response(JSON.stringify({ skipped: true, reason: "Already has enough artists assigned" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const neededCount = (artist_count || event.artist_count || 1) - (existingAssignments?.length || 0);

    // Get eligible artists (from auto_assign_eligible_artists table, or all if none set)
    const { data: eligibleRows } = await supabase.from("auto_assign_eligible_artists").select("artist_id");
    const { data: allArtists } = await supabase.from("artists").select("id, name, auth_user_id");
    if (!allArtists || allArtists.length === 0) {
      return new Response(JSON.stringify({ error: "No artists available" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to eligible only (if table has entries)
    const eligibleIds = eligibleRows && eligibleRows.length > 0 ? new Set(eligibleRows.map((r: any) => r.artist_id)) : null;
    const candidateArtists = eligibleIds ? allArtists.filter((a: any) => eligibleIds.has(a.id)) : allArtists;
    if (candidateArtists.length === 0) {
      return new Response(JSON.stringify({ error: "No eligible artists for auto-assign" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get blocked dates for event date
    const eventDate = event.event_date;
    const { data: blockedDates } = await supabase
      .from("artist_blocked_dates")
      .select("artist_id, blocked_date, blocked_start_time, blocked_end_time")
      .eq("blocked_date", eventDate);

    const blockedArtistIds = new Set((blockedDates || []).map((b: any) => b.artist_id));

    // Get existing assignments for this date (artists already busy)
    const { data: dateEvents } = await supabase
      .from("event_bookings")
      .select("id")
      .eq("event_date", eventDate)
      .in("status", ["upcoming", "confirmed"])
      .neq("id", event_id);

    const busyArtistIds = new Set<string>();
    if (dateEvents && dateEvents.length > 0) {
      const dateEventIds = dateEvents.map((e: any) => e.id);
      const { data: dateAssignments } = await supabase
        .from("event_artist_assignments")
        .select("artist_id")
        .in("event_id", dateEventIds);
      if (dateAssignments) {
        dateAssignments.forEach((a: any) => busyArtistIds.add(a.artist_id));
      }
    }

    // Already assigned to this event
    const alreadyAssignedIds = new Set((existingAssignments || []).map((a: any) => a.artist_id));

    // Filter available artists
    const availableArtists = candidateArtists.filter((a: any) =>
      !blockedArtistIds.has(a.id) &&
      !busyArtistIds.has(a.id) &&
      !alreadyAssignedIds.has(a.id)
    );

    if (availableArtists.length === 0) {
      // Notify admins that no artists are available
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "⚠️ No Artists Available",
            message: `Auto-assign failed for event on ${eventDate} (${event.client_name}). All artists are blocked or busy.`,
            type: "event",
            link: "/admin-panel",
          });
        }
      }
      return new Response(JSON.stringify({ error: "No available artists for this date", assigned: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign artists (pick first N available, could be enhanced with load balancing)
    const toAssign = availableArtists.slice(0, neededCount);
    const assignedNames: string[] = [];

    for (const artist of toAssign) {
      await supabase.from("event_artist_assignments").insert({
        event_id,
        artist_id: artist.id,
      });
      assignedNames.push(artist.name);

      // Log the action
      await supabase.from("artist_action_logs").insert({
        artist_id: artist.id,
        artist_name: artist.name,
        action_type: "auto_assigned",
        description: `Auto-assigned to event ${event.client_name} on ${eventDate}`,
        metadata: { event_id, event_date: eventDate, client_name: event.client_name },
      });
    }

    // Update event with first assigned artist (legacy field)
    if (toAssign.length > 0 && !event.assigned_artist_id) {
      await supabase.from("event_bookings").update({ assigned_artist_id: toAssign[0].id }).eq("id", event_id);
    }

    // Notify admins
    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (admins) {
      for (const admin of admins) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "🤖 Artist Auto-Assigned",
          message: `${assignedNames.join(", ")} auto-assigned to ${event.client_name}'s event on ${eventDate}`,
          type: "event",
          link: "/admin-panel",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, assigned: assignedNames }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto-assign error:", error instanceof Error ? error.message : "Unknown");
    return new Response(JSON.stringify({ error: "Auto-assign failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
