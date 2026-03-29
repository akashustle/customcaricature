import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { link_code } = await req.json();
    if (!link_code || typeof link_code !== "string" || link_code.length > 64) {
      return new Response(JSON.stringify({ error: "Invalid link code" }), { status: 400, headers: corsHeaders });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Get the link
    const { data: link, error: linkErr } = await admin
      .from("lead_links")
      .select("*")
      .eq("link_code", link_code)
      .single();

    if (linkErr || !link) {
      return new Response(JSON.stringify({ error: "Link not found" }), { status: 404, headers: corsHeaders });
    }
    if (!link.is_active) {
      return new Response(JSON.stringify({ error: "Link is no longer active" }), { status: 410, headers: corsHeaders });
    }
    if (link.is_used) {
      return new Response(JSON.stringify({ error: "Link has already been used" }), { status: 410, headers: corsHeaders });
    }

    // Get user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email, mobile, city, state, address")
      .eq("user_id", user.id)
      .single();

    // Get caricature pricing for this link
    const { data: caricPricing } = await admin
      .from("lead_link_caricature_pricing")
      .select("caricature_type_slug, custom_price")
      .eq("lead_link_id", link.id);

    // Get event pricing for this link
    const { data: eventPricing } = await admin
      .from("lead_link_event_pricing")
      .select("region, artist_count, custom_total_price, custom_advance_amount, custom_extra_hour_rate")
      .eq("lead_link_id", link.id);

    // Apply caricature pricing to customer_pricing
    if (caricPricing && caricPricing.length > 0) {
      for (const cp of caricPricing) {
        await admin.from("customer_pricing").upsert({
          user_id: user.id,
          caricature_type_slug: cp.caricature_type_slug,
          custom_price: cp.custom_price,
        }, { onConflict: "user_id,caricature_type_slug" });
      }
    }

    // Apply event pricing to customer_event_pricing
    if (eventPricing && eventPricing.length > 0) {
      for (const ep of eventPricing) {
        await admin.from("customer_event_pricing").upsert({
          user_id: user.id,
          region: ep.region,
          artist_count: ep.artist_count,
          custom_total_price: ep.custom_total_price,
          custom_advance_amount: ep.custom_advance_amount,
          custom_extra_hour_rate: ep.custom_extra_hour_rate,
        }, { onConflict: "user_id,region,artist_count" });
      }
    }

    // Mark link as used
    await admin.from("lead_links").update({
      is_used: true,
      used_at: new Date().toISOString(),
      used_by_user_id: user.id,
      used_by_name: profile?.full_name || user.email || "",
      used_by_email: profile?.email || user.email || "",
      used_by_mobile: profile?.mobile || "",
      updated_at: new Date().toISOString(),
    }).eq("id", link.id);

    // Log action
    await admin.from("lead_link_actions").insert({
      lead_link_id: link.id,
      user_id: user.id,
      action_type: "claimed",
      details: `Link claimed by ${profile?.full_name || user.email}`,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Custom pricing applied successfully!",
      label: link.label,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: corsHeaders });
  }
});
