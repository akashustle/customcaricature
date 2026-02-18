import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event_id, collection_method } = await req.json();
    if (!event_id || !collection_method) {
      return new Response(JSON.stringify({ error: "Missing event_id or collection_method" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is an artist
    const { data: artist } = await supabase.from("artists").select("id").eq("auth_user_id", user.id).single();
    if (!artist) {
      return new Response(JSON.stringify({ error: "Not an artist" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify assignment
    const { data: assignment } = await supabase
      .from("event_artist_assignments")
      .select("id")
      .eq("event_id", event_id)
      .eq("artist_id", artist.id)
      .maybeSingle();

    const { data: booking } = await supabase
      .from("event_bookings")
      .select("id, user_id, total_price, advance_amount, remaining_amount, negotiated, negotiated_total, negotiated_advance, assigned_artist_id, payment_status")
      .eq("id", event_id)
      .single();

    if (!booking) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!assignment && booking.assigned_artist_id !== artist.id) {
      return new Response(JSON.stringify({ error: "Not assigned to this event" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.payment_status === "fully_paid") {
      return new Response(JSON.stringify({ error: "Already fully paid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from("event_bookings")
      .update({ payment_status: "fully_paid" })
      .eq("id", event_id);

    if (updateError) throw new Error(`Failed to update: ${updateError.message}`);

    // Calculate remaining
    const totalAmount = booking.negotiated && booking.negotiated_total ? booking.negotiated_total : booking.total_price;
    const advanceAmount = booking.negotiated && booking.negotiated_advance ? booking.negotiated_advance : booking.advance_amount;
    const remaining = booking.remaining_amount || (totalAmount - advanceAmount);

    // Record in payment_history
    await supabase.from("payment_history").insert({
      user_id: booking.user_id,
      booking_id: event_id,
      payment_type: "event_remaining",
      amount: remaining,
      status: "confirmed",
      description: `Remaining collected by artist (${collection_method})`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Collect payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
