// Admin AI Assistant — Lovable AI gateway with tool calling.
// Tools allow the assistant to perform admin operations on behalf of the admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an autonomous Admin Assistant for the Creative Caricature Club (CCC) admin panel.
You can perform real operations on the database via tools. The admin sees results as Markdown.

Capabilities you have via tools:
- toggle_setting / update_setting / read_setting — site settings (maintenance_mode, custom_caricature_visible, floating_whatsapp, floating_whatsapp_mobile, floating_instagram, hide_shop_from_admin, etc.)
- update_caricature_price(slug, price) — caricature_types
- update_event_price(city|district, price) — enquiry_event_pricing
- send_broadcast_notification(title, message, link) — notify all users
- delete_user_by_email(email) — soft remove a user
- list_users(search, limit) — search profiles
- count_table(table, since_days) — row count
- summarize_revenue(since_days) — revenue rollup
- block_event_date(date, reason) — block date
- list_pending_enquiries(limit) — open enquiries
- update_enquiry_status(id, status)
- add_event_manually(client_name, mobile, email, event_date, event_type, city, state, total_price, advance_amount) — create a new event_bookings row
- list_recent_events(limit, since_days) — recent event bookings
- list_recent_orders(limit, since_days) — recent caricature orders
- update_order_status(order_id, status) — set orders.status
- recent_signups(limit, since_days) — newest profiles
- create_coupon(code, discount_type, discount_value, max_uses, valid_until) — create coupon
- top_cities(metric, limit) — top cities by enquiries/events
- generate_report(kind, since_days) — kind = "revenue" | "events" | "orders" | "enquiries", returns a Markdown table the admin can copy

Behavioral rules (AGENTIC — ACT, DO NOT STALL, DO NOT EXPLAIN INSTEAD OF DOING):
1. **YOU MUST CALL TOOLS.** When the admin asks for ANY action you have a tool for, CALL THE TOOL IMMEDIATELY in this same turn. NEVER reply with text like "I will do X" or "Let me know if you want me to do X" without actually calling the tool first. Talking is failing — calling tools is succeeding.
2. **Default to action.** Do NOT ask "are you sure?" for routine ops: toggle_setting, update_setting, update_caricature_price, update_event_price, update_enquiry_status, update_order_status, block_event_date, create_coupon, list_*, count_*, summarize_revenue, generate_report, recent_signups, top_cities, read_setting. Just do them.
3. **Chain calls.** If the user asks for multiple things in one message, emit MULTIPLE tool_calls in the same turn — do not wait between them.
4. **ONLY** ask for explicit "yes/confirm" before these three destructive ops: delete_user_by_email, send_broadcast_notification (to all users), add_event_manually. For all other tools, execute immediately.
5. For "turn on/off maintenance" — call toggle_setting key="maintenance_mode" enabled=true/false IMMEDIATELY. Don't ask.
6. For "change [caricature] price to X" — call update_caricature_price IMMEDIATELY with the matching slug.
7. For "give me revenue / show users / list orders / how many X" — call the matching tool IMMEDIATELY (summarize_revenue / list_users / list_recent_orders / count_table).
8. After tool calls return, write a SHORT confirmation in Markdown (1-3 lines max). Use bullet lists, bold numbers, tables for reports.
9. If a tool returns ok:false, surface the error verbatim and suggest a one-line fix.
10. NEVER invent data. If you don't have a tool, say "I don't have a tool for that yet" — don't pretend.

Example of CORRECT behaviour:
User: "turn on maintenance mode"
You: [call toggle_setting key=maintenance_mode enabled=true] → "✅ Maintenance mode is **ON**."

Example of WRONG behaviour (do NOT do this):
User: "turn on maintenance mode"
You: "Sure, I can turn on maintenance mode for you. Should I proceed?"  ← WRONG. Just do it.`;

const tools = [
  { type: "function", function: { name: "toggle_setting", description: "Enable/disable a boolean site setting", parameters: { type: "object", properties: { key: { type: "string" }, enabled: { type: "boolean" } }, required: ["key", "enabled"] } } },
  { type: "function", function: { name: "update_setting", description: "Upsert a JSON value into admin_site_settings. Pass value as a JSON-encoded string.", parameters: { type: "object", properties: { key: { type: "string" }, value_json: { type: "string", description: "The value to store, JSON-encoded (e.g. '{\"enabled\":true}' or '\"some text\"' or '42')" } }, required: ["key", "value_json"] } } },
  { type: "function", function: { name: "read_setting", description: "Read a single admin_site_settings JSON value", parameters: { type: "object", properties: { key: { type: "string" } }, required: ["key"] } } },
  { type: "function", function: { name: "update_caricature_price", description: "Set price for a caricature_types row by slug", parameters: { type: "object", properties: { slug: { type: "string" }, price: { type: "number" } }, required: ["slug", "price"] } } },
  { type: "function", function: { name: "update_event_price", description: "Update enquiry_event_pricing by city or district", parameters: { type: "object", properties: { city: { type: "string" }, district: { type: "string" }, price: { type: "number" } }, required: ["price"] } } },
  { type: "function", function: { name: "send_broadcast_notification", description: "Insert a broadcast notification for all users", parameters: { type: "object", properties: { title: { type: "string" }, message: { type: "string" }, link: { type: "string" } }, required: ["title", "message"] } } },
  { type: "function", function: { name: "list_users", description: "Search profiles by name/email/mobile", parameters: { type: "object", properties: { search: { type: "string" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "delete_user_by_email", description: "Hard delete a profile + auth user by email", parameters: { type: "object", properties: { email: { type: "string" } }, required: ["email"] } } },
  { type: "function", function: { name: "count_table", description: "Count rows in an allowed table", parameters: { type: "object", properties: { table: { type: "string", enum: ["orders", "event_bookings", "enquiries", "profiles", "ai_chat_sessions", "artists"] }, since_days: { type: "number" } }, required: ["table"] } } },
  { type: "function", function: { name: "summarize_revenue", description: "Sum order + event revenue for the last N days", parameters: { type: "object", properties: { since_days: { type: "number" } } } } },
  { type: "function", function: { name: "block_event_date", description: "Block an event date in event_blocked_dates", parameters: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD" }, reason: { type: "string" } }, required: ["date"] } } },
  { type: "function", function: { name: "list_pending_enquiries", description: "List recent enquiries with status=new", parameters: { type: "object", properties: { limit: { type: "number" } } } } },
  { type: "function", function: { name: "update_enquiry_status", description: "Update an enquiry status by id", parameters: { type: "object", properties: { id: { type: "string" }, status: { type: "string" } }, required: ["id", "status"] } } },
  { type: "function", function: { name: "add_event_manually", description: "Create a new event_bookings row manually", parameters: { type: "object", properties: { client_name: { type: "string" }, client_mobile: { type: "string" }, client_email: { type: "string" }, event_date: { type: "string", description: "YYYY-MM-DD" }, event_type: { type: "string" }, city: { type: "string" }, state: { type: "string" }, total_price: { type: "number" }, advance_amount: { type: "number" }, venue_name: { type: "string" }, full_address: { type: "string" }, pincode: { type: "string" }, event_start_time: { type: "string" }, event_end_time: { type: "string" } }, required: ["client_name", "client_mobile", "client_email", "event_date", "event_type", "city", "state", "total_price", "advance_amount"] } } },
  { type: "function", function: { name: "list_recent_events", description: "List recent event bookings", parameters: { type: "object", properties: { limit: { type: "number" }, since_days: { type: "number" } } } } },
  { type: "function", function: { name: "list_recent_orders", description: "List recent caricature orders", parameters: { type: "object", properties: { limit: { type: "number" }, since_days: { type: "number" } } } } },
  { type: "function", function: { name: "update_order_status", description: "Update orders.status by id", parameters: { type: "object", properties: { order_id: { type: "string" }, status: { type: "string" } }, required: ["order_id", "status"] } } },
  { type: "function", function: { name: "recent_signups", description: "Latest user signups", parameters: { type: "object", properties: { limit: { type: "number" }, since_days: { type: "number" } } } } },
  { type: "function", function: { name: "create_coupon", description: "Create a coupon code", parameters: { type: "object", properties: { code: { type: "string" }, discount_type: { type: "string", enum: ["percentage", "fixed"] }, discount_value: { type: "number" }, max_uses: { type: "number" }, valid_until: { type: "string" } }, required: ["code", "discount_type", "discount_value"] } } },
  { type: "function", function: { name: "top_cities", description: "Top cities by enquiries or events", parameters: { type: "object", properties: { metric: { type: "string", enum: ["enquiries", "events"] }, limit: { type: "number" } }, required: ["metric"] } } },
  { type: "function", function: { name: "generate_report", description: "Generate a Markdown report", parameters: { type: "object", properties: { kind: { type: "string", enum: ["revenue", "events", "orders", "enquiries"] }, since_days: { type: "number" } }, required: ["kind"] } } },
];

async function runTool(name: string, args: any, supabase: any, adminId: string): Promise<any> {
  try {
    if (name === "toggle_setting") {
      const { data: existing } = await supabase.from("admin_site_settings").select("value").eq("id", args.key).maybeSingle();
      const cur = existing?.value || {};
      const next = { ...(typeof cur === "object" && cur !== null ? cur : {}), enabled: !!args.enabled };
      await supabase.from("admin_site_settings").upsert({ id: args.key, value: next, updated_at: new Date().toISOString() });
      return { ok: true, key: args.key, value: next };
    }
    if (name === "update_setting") {
      let value: any = args.value;
      if (args.value_json !== undefined) {
        try { value = JSON.parse(args.value_json); } catch { value = args.value_json; }
      }
      await supabase.from("admin_site_settings").upsert({ id: args.key, value, updated_at: new Date().toISOString() });
      return { ok: true, key: args.key, value };
    }
    if (name === "read_setting") {
      const { data } = await supabase.from("admin_site_settings").select("value").eq("id", args.key).maybeSingle();
      return { ok: true, key: args.key, value: data?.value ?? null };
    }
    if (name === "update_caricature_price") {
      const { error } = await supabase.from("caricature_types").update({ price: args.price, updated_at: new Date().toISOString() }).eq("slug", args.slug);
      if (error) return { ok: false, error: error.message };
      return { ok: true, slug: args.slug, price: args.price };
    }
    if (name === "update_event_price") {
      let q: any = supabase.from("enquiry_event_pricing").update({ price: args.price, updated_at: new Date().toISOString() });
      if (args.city) q = q.ilike("city", args.city);
      else if (args.district) q = q.ilike("district", args.district);
      else return { ok: false, error: "city or district required" };
      const { data: rows, error } = await q.select("id");
      if (error) return { ok: false, error: error.message };
      return { ok: true, updated: rows?.length ?? 0, price: args.price };
    }
    if (name === "send_broadcast_notification") {
      const { data: users } = await supabase.from("profiles").select("user_id").limit(5000);
      const rows = (users || []).map((u: any) => ({ user_id: u.user_id, title: args.title, message: args.message, type: "broadcast", link: args.link || "/" }));
      if (!rows.length) return { ok: false, error: "no users" };
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) return { ok: false, error: error.message };
      return { ok: true, sent_to: rows.length };
    }
    if (name === "list_users") {
      const search = (args.search || "").trim();
      let q: any = supabase.from("profiles").select("user_id, full_name, email, mobile, city").limit(args.limit || 10);
      if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,mobile.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, users: data };
    }
    if (name === "count_table") {
      let q: any = supabase.from(args.table).select("id", { count: "exact", head: true });
      if (args.since_days) {
        const since = new Date(Date.now() - args.since_days * 86400000).toISOString();
        q = q.gte("created_at", since);
      }
      const { count, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, table: args.table, count };
    }
    if (name === "summarize_revenue") {
      const since = new Date(Date.now() - (args.since_days || 30) * 86400000).toISOString();
      const { data: orders } = await supabase.from("orders").select("amount, payment_status").gte("created_at", since);
      const { data: events } = await supabase.from("event_bookings").select("advance_amount, negotiated_advance, payment_status").gte("created_at", since);
      const orderRev = (orders || []).filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + (o.amount || 0), 0);
      const eventRev = (events || []).filter((e: any) => ["paid", "fully_paid", "partial_paid"].includes(e.payment_status)).reduce((s: number, e: any) => s + (e.negotiated_advance || e.advance_amount || 0), 0);
      return { ok: true, since_days: args.since_days || 30, orders_revenue: orderRev, events_revenue: eventRev, total: orderRev + eventRev };
    }
    if (name === "block_event_date") {
      const { error } = await supabase.from("event_blocked_dates").insert({ blocked_date: args.date, reason: args.reason || "Blocked via AI", blocked_by: adminId });
      if (error) return { ok: false, error: error.message };
      return { ok: true, date: args.date };
    }
    if (name === "list_pending_enquiries") {
      const { data, error } = await supabase.from("enquiries").select("id, name, mobile, status, created_at").eq("status", "new").order("created_at", { ascending: false }).limit(args.limit || 10);
      if (error) return { ok: false, error: error.message };
      return { ok: true, enquiries: data };
    }
    if (name === "update_enquiry_status") {
      const { error } = await supabase.from("enquiries").update({ status: args.status, updated_at: new Date().toISOString() }).eq("id", args.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: args.id, status: args.status };
    }
    if (name === "delete_user_by_email") {
      const { data: prof } = await supabase.from("profiles").select("user_id").eq("email", args.email).maybeSingle();
      if (!prof) return { ok: false, error: "user not found" };
      await supabase.from("profiles").delete().eq("user_id", prof.user_id);
      try { await supabase.auth.admin.deleteUser(prof.user_id); } catch {}
      return { ok: true, deleted: args.email };
    }
    if (name === "add_event_manually") {
      const row: any = {
        client_name: args.client_name, client_mobile: args.client_mobile, client_email: args.client_email,
        event_date: args.event_date, event_type: args.event_type, city: args.city, state: args.state,
        total_price: args.total_price, advance_amount: args.advance_amount,
        venue_name: args.venue_name || "TBD", full_address: args.full_address || "TBD", pincode: args.pincode || "000000",
        event_start_time: args.event_start_time || "18:00", event_end_time: args.event_end_time || "22:00",
        country: "India", source: "admin_ai", status: "confirmed",
      };
      const { data, error } = await supabase.from("event_bookings").insert(row).select("id").maybeSingle();
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id };
    }
    if (name === "list_recent_events") {
      let q: any = supabase.from("event_bookings").select("id, client_name, event_date, city, total_price, status").order("created_at", { ascending: false }).limit(args.limit || 10);
      if (args.since_days) q = q.gte("created_at", new Date(Date.now() - args.since_days * 86400000).toISOString());
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, events: data };
    }
    if (name === "list_recent_orders") {
      let q: any = supabase.from("orders").select("id, customer_name, amount, status, payment_status, created_at").order("created_at", { ascending: false }).limit(args.limit || 10);
      if (args.since_days) q = q.gte("created_at", new Date(Date.now() - args.since_days * 86400000).toISOString());
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, orders: data };
    }
    if (name === "update_order_status") {
      const { error } = await supabase.from("orders").update({ status: args.status, updated_at: new Date().toISOString() }).eq("id", args.order_id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: args.order_id, status: args.status };
    }
    if (name === "recent_signups") {
      let q: any = supabase.from("profiles").select("user_id, full_name, email, mobile, created_at").order("created_at", { ascending: false }).limit(args.limit || 10);
      if (args.since_days) q = q.gte("created_at", new Date(Date.now() - args.since_days * 86400000).toISOString());
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, signups: data };
    }
    if (name === "create_coupon") {
      const { data, error } = await supabase.from("coupons").insert({
        code: args.code.toUpperCase(), discount_type: args.discount_type, discount_value: args.discount_value,
        max_uses: args.max_uses || null, valid_until: args.valid_until || null, is_active: true,
      }).select("id").maybeSingle();
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id, code: args.code.toUpperCase() };
    }
    if (name === "top_cities") {
      const table = args.metric === "events" ? "event_bookings" : "enquiries";
      const { data } = await supabase.from(table).select("city").limit(2000);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { if (r.city) counts[r.city] = (counts[r.city] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, args.limit || 10);
      return { ok: true, metric: args.metric, top: sorted.map(([city, count]) => ({ city, count })) };
    }
    if (name === "generate_report") {
      const since = new Date(Date.now() - (args.since_days || 30) * 86400000).toISOString();
      let md = "";
      if (args.kind === "revenue") {
        const { data: orders } = await supabase.from("orders").select("amount, payment_status, created_at").gte("created_at", since);
        const { data: events } = await supabase.from("event_bookings").select("advance_amount, negotiated_advance, payment_status, created_at").gte("created_at", since);
        const orderRev = (orders || []).filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + (o.amount || 0), 0);
        const eventRev = (events || []).filter((e: any) => ["paid", "fully_paid", "partial_paid"].includes(e.payment_status)).reduce((s: number, e: any) => s + (e.negotiated_advance || e.advance_amount || 0), 0);
        md = `**Revenue (last ${args.since_days || 30} days)**\n\n| Source | Amount |\n|---|---|\n| Caricature Orders | ₹${orderRev.toLocaleString("en-IN")} |\n| Events | ₹${eventRev.toLocaleString("en-IN")} |\n| **Total** | **₹${(orderRev + eventRev).toLocaleString("en-IN")}** |`;
      } else if (args.kind === "events") {
        const { data } = await supabase.from("event_bookings").select("client_name, event_date, city, total_price, status").gte("created_at", since).order("event_date", { ascending: false }).limit(20);
        md = `**Recent Events**\n\n| Client | Date | City | Total | Status |\n|---|---|---|---|---|\n` + (data || []).map((e: any) => `| ${e.client_name} | ${e.event_date} | ${e.city} | ₹${(e.total_price || 0).toLocaleString("en-IN")} | ${e.status} |`).join("\n");
      } else if (args.kind === "orders") {
        const { data } = await supabase.from("orders").select("customer_name, amount, status, payment_status, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20);
        md = `**Recent Orders**\n\n| Customer | Amount | Status | Payment |\n|---|---|---|---|\n` + (data || []).map((o: any) => `| ${o.customer_name} | ₹${(o.amount || 0).toLocaleString("en-IN")} | ${o.status} | ${o.payment_status} |`).join("\n");
      } else if (args.kind === "enquiries") {
        const { data } = await supabase.from("enquiries").select("name, mobile, city, status, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20);
        md = `**Recent Enquiries**\n\n| Name | Mobile | City | Status |\n|---|---|---|---|\n` + (data || []).map((e: any) => `| ${e.name} | ${e.mobile} | ${e.city || "-"} | ${e.status} |`).join("\n");
      }
      return { ok: true, kind: args.kind, markdown: md };
    }
    return { ok: false, error: `unknown tool ${name}` };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "not admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    // Pull a small training corpus from chatbot_training_data marked "admin"
    const { data: training } = await admin.from("chatbot_training_data").select("question, answer").eq("category", "admin_assistant").eq("is_active", true).limit(50);
    const trainingPrompt = training && training.length
      ? `\n\nAdmin-specific knowledge base:\n${training.map((t: any) => `Q: ${t.question}\nA: ${t.answer}`).join("\n\n")}`
      : "";

    const conv: any[] = [
      { role: "system", content: SYSTEM_PROMPT + trainingPrompt },
      ...messages,
    ];

    // Up to 6 tool-calling rounds
    for (let round = 0; round < 6; round++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: conv, tools, tool_choice: "auto" }),
      });
      if (!aiResp.ok) {
        const t = await aiResp.text();
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit hit, please retry shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted — top up at Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const json = await aiResp.json();
      const msg = json.choices?.[0]?.message;
      if (!msg) break;
      conv.push(msg);
      const calls = msg.tool_calls || [];
      if (!calls.length) {
        return new Response(JSON.stringify({ reply: msg.content || "", trace: conv.slice(1) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      for (const c of calls) {
        let args: any = {};
        try { args = JSON.parse(c.function?.arguments || "{}"); } catch { args = {}; }
        let result: any;
        try {
          result = await runTool(c.function?.name || "", args, admin, user.id);
        } catch (toolErr: any) {
          result = { ok: false, error: `Tool '${c.function?.name}' threw: ${toolErr?.message || String(toolErr)}` };
        }
        // Log for audit (Supabase query builders are PromiseLike but not Promises — wrap in try/catch)
        try {
          await admin.from("admin_action_log").insert({
            user_id: user.id,
            admin_name: "AI Assistant",
            action: `ai_tool:${c.function?.name}`,
            details: JSON.stringify({ args, result }).slice(0, 1000),
          });
        } catch (logErr) {
          console.warn("admin_action_log insert failed (non-fatal):", logErr);
        }
        conv.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result) });
      }
    }

    return new Response(JSON.stringify({ reply: "Reached tool-call limit. Please rephrase the request.", trace: conv.slice(1) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
