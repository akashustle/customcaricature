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

    const { event_id, collection_method, extra_hours, extra_amount } = await req.json();
    if (!event_id || !collection_method) {
      return new Response(JSON.stringify({ error: "Missing event_id or collection_method" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is an artist
    const { data: artist } = await supabase.from("artists").select("id, name").eq("auth_user_id", user.id).single();
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
      .select("id, user_id, total_price, advance_amount, remaining_amount, negotiated, negotiated_total, negotiated_advance, assigned_artist_id, payment_status, extra_hours, client_name")
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

    // Calculate remaining
    const totalAmount = booking.negotiated && booking.negotiated_total ? booking.negotiated_total : booking.total_price;
    const advanceAmount = booking.negotiated && booking.negotiated_advance ? booking.negotiated_advance : booking.advance_amount;
    const baseRemaining = booking.remaining_amount || (totalAmount - advanceAmount);
    const extraHoursNum = extra_hours || 0;
    const extraAmt = extra_amount || 0;
    const totalCollected = baseRemaining + extraAmt;

    // Update payment status and extra hours
    const updateData: any = { payment_status: "fully_paid" };
    if (extraHoursNum > 0) {
      updateData.extra_hours = (booking.extra_hours || 0) + extraHoursNum;
      // Update total price to include extra
      updateData.remaining_amount = 0;
    } else {
      updateData.remaining_amount = 0;
    }

    const { error: updateError } = await supabase
      .from("event_bookings")
      .update(updateData)
      .eq("id", event_id);

    if (updateError) {
      console.error("Update error:", updateError.message);
      throw new Error("Failed to update payment status");
    }

    // Record in payment_history
    await supabase.from("payment_history").insert({
      user_id: booking.user_id,
      booking_id: event_id,
      payment_type: "event_remaining",
      amount: totalCollected,
      status: "confirmed",
      description: `Remaining ₹${totalCollected} collected by artist ${artist.name} (${collection_method})${extraHoursNum > 0 ? ` + ${extraHoursNum} extra hrs (₹${extraAmt})` : ""}`,
    });

    // Auto-create artist event payouts based on payout settings
    try {
      const { data: assignments } = await supabase
        .from("event_artist_assignments")
        .select("artist_id")
        .eq("event_id", event_id);
      
      const artistIds = assignments?.map((a: any) => a.artist_id) || [];
      if (booking.assigned_artist_id && !artistIds.includes(booking.assigned_artist_id)) {
        artistIds.push(booking.assigned_artist_id);
      }

      const finalTotal = booking.negotiated && booking.negotiated_total ? booking.negotiated_total : booking.total_price;
      const finalWithExtra = finalTotal + (extraAmt || 0);

      for (const aid of artistIds) {
        // Check if payout already exists
        const { data: existing } = await supabase.from("artist_event_payouts")
          .select("id").eq("artist_id", aid).eq("event_id", event_id).maybeSingle();
        if (existing) continue;

        const { data: payoutSetting } = await supabase.from("artist_payout_settings")
          .select("payout_type, payout_value").eq("artist_id", aid).eq("is_active", true).maybeSingle();
        
        if (payoutSetting) {
          const perArtistTotal = artistIds.length > 1 ? finalWithExtra / artistIds.length : finalWithExtra;
          const calcAmount = payoutSetting.payout_type === "percentage"
            ? (perArtistTotal * payoutSetting.payout_value / 100)
            : payoutSetting.payout_value;

          await supabase.from("artist_event_payouts").insert({
            artist_id: aid, event_id, payout_type: payoutSetting.payout_type,
            payout_value: payoutSetting.payout_value, event_total: perArtistTotal,
            calculated_amount: calcAmount, status: "pending",
          });

          // Create earning transaction
          await supabase.from("artist_transactions").insert({
            artist_id: aid, transaction_type: "earning", amount: calcAmount,
            description: `Earning from ${booking.client_name}'s event (${payoutSetting.payout_type === "percentage" ? payoutSetting.payout_value + "%" : "₹" + payoutSetting.payout_value} of ₹${perArtistTotal.toLocaleString("en-IN")})`,
            event_id,
          });
        }
      }
    } catch (payoutErr) {
      console.warn("Payout calculation failed (non-fatal):", payoutErr);
    }

    // Notify admin
    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (admins) {
      for (const admin of admins) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "💰 Payment Collected by Artist",
          message: `${artist.name} collected ₹${totalCollected} for ${booking.client_name}'s event (${collection_method})`,
          type: "payment",
          link: "/admin-panel",
        });
      }
    }

    // Notify customer
    if (booking.user_id) {
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "✅ Payment Received",
        message: `Your remaining payment of ₹${totalCollected} has been collected. Event is fully paid!`,
        type: "payment",
        link: "/dashboard",
      });
    }

    // Trigger Google Sheet sync
    try {
      await fetch(`${supabaseUrl}/functions/v1/google-sheets-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
        body: JSON.stringify({ action: "update_event", event_id, event_data: { ...booking, ...updateData, payment_status: "fully_paid" } }),
      });
    } catch (e) {
      console.warn("Sheet sync failed (non-fatal):", e);
    }

    return new Response(JSON.stringify({ success: true, collected: totalCollected }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Collect payment error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Payment collection failed. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
