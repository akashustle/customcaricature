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
    const { event_date, city, state } = await req.json();

    if (!event_date) {
      return new Response(JSON.stringify({ error: "event_date is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all artists
    const { data: artists, error: artistErr } = await supabase
      .from("artists")
      .select("id, name, experience, email, mobile");
    if (artistErr) throw artistErr;

    // Get blocked dates for the event date
    const { data: blockedDates } = await supabase
      .from("artist_blocked_dates")
      .select("artist_id")
      .eq("blocked_date", event_date);
    const blockedArtistIds = new Set((blockedDates || []).map((b: any) => b.artist_id));

    // Get existing bookings for the date
    const { data: existingBookings } = await supabase
      .from("event_bookings")
      .select("assigned_artist_id")
      .eq("event_date", event_date)
      .in("status", ["upcoming", "confirmed"]);

    // Count bookings per artist
    const artistBookingCount = new Map<string, number>();
    (existingBookings || []).forEach((b: any) => {
      if (b.assigned_artist_id) {
        artistBookingCount.set(b.assigned_artist_id, (artistBookingCount.get(b.assigned_artist_id) || 0) + 1);
      }
    });

    // Also check event_artist_assignments for multi-artist events
    const { data: assignments } = await supabase
      .from("event_artist_assignments")
      .select("artist_id, event_id, event_bookings!inner(event_date, status)")
      .eq("event_bookings.event_date", event_date)
      .in("event_bookings.status", ["upcoming", "confirmed"]);

    (assignments || []).forEach((a: any) => {
      artistBookingCount.set(a.artist_id, (artistBookingCount.get(a.artist_id) || 0) + 1);
    });

    // Get reviews for rating
    const { data: reviews } = await supabase
      .from("reviews")
      .select("booking_id, rating, event_bookings:booking_id(assigned_artist_id)")
      .not("booking_id", "is", null);

    // Calculate average rating per artist
    const artistRatings = new Map<string, { total: number; count: number }>();
    (reviews || []).forEach((r: any) => {
      const artistId = r.event_bookings?.assigned_artist_id;
      if (artistId) {
        const current = artistRatings.get(artistId) || { total: 0, count: 0 };
        current.total += r.rating;
        current.count += 1;
        artistRatings.set(artistId, current);
      }
    });

    // Get completed event count per artist
    const { data: completedEvents } = await supabase
      .from("event_bookings")
      .select("assigned_artist_id")
      .eq("status", "completed")
      .not("assigned_artist_id", "is", null);

    const artistCompletedCount = new Map<string, number>();
    (completedEvents || []).forEach((e: any) => {
      artistCompletedCount.set(e.assigned_artist_id, (artistCompletedCount.get(e.assigned_artist_id) || 0) + 1);
    });

    // Score and rank artists
    const scoredArtists = (artists || [])
      .filter((a: any) => !blockedArtistIds.has(a.id))
      .map((a: any) => {
        let score = 50; // base score

        // Availability bonus (less busy = higher score)
        const bookings = artistBookingCount.get(a.id) || 0;
        if (bookings === 0) score += 30;
        else if (bookings === 1) score += 10;
        else score -= 10;

        // Rating bonus
        const ratingData = artistRatings.get(a.id);
        const avgRating = ratingData ? ratingData.total / ratingData.count : 0;
        score += avgRating * 5;

        // Experience bonus
        const completed = artistCompletedCount.get(a.id) || 0;
        score += Math.min(completed * 2, 20);

        return {
          id: a.id,
          name: a.name,
          experience: a.experience,
          avg_rating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
          completed_events: completed,
          bookings_on_date: bookings,
          score: Math.round(score),
          available: true,
        };
      })
      .sort((a: any, b: any) => b.score - a.score);

    return new Response(JSON.stringify({ artists: scoredArtists }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Match artists error:", err);
    return new Response(JSON.stringify({ error: "Failed to match artists" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
