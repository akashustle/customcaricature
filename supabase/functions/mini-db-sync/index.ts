import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function ok(body: any) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function err(msg: string) {
  return new Response(JSON.stringify({ success: false, error: msg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Light pastel color palette: yellow, green, blue, orange
const TAB_COLORS = [
  { header: { r: 1.0, g: 0.96, b: 0.80 }, band: { r: 1.0, g: 0.99, b: 0.93 }, text: { r: 0.35, g: 0.3, b: 0.1 } },   // light yellow
  { header: { r: 0.85, g: 0.95, b: 0.85 }, band: { r: 0.94, g: 0.98, b: 0.94 }, text: { r: 0.1, g: 0.3, b: 0.1 } },    // light green
  { header: { r: 0.85, g: 0.92, b: 1.0 },  band: { r: 0.94, g: 0.96, b: 1.0 },  text: { r: 0.1, g: 0.15, b: 0.35 } },  // light blue
  { header: { r: 1.0, g: 0.92, b: 0.82 },  band: { r: 1.0, g: 0.97, b: 0.93 },  text: { r: 0.4, g: 0.25, b: 0.1 } },   // light orange
];

async function getAccessToken(key: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: key.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const enc = new TextEncoder();
  const hB = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const cB = btoa(JSON.stringify(claim)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsigned = `${hB}.${cB}`;
  const pem = key.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "");
  const bKey = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const cKey = await crypto.subtle.importKey("pkcs8", bKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cKey, enc.encode(unsigned));
  const sB = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsigned}.${sB}`;
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}` });
  const d = await res.json();
  if (!d.access_token) throw new Error(`Token error: ${JSON.stringify(d)}`);
  return d.access_token;
}

async function fetchRetry(url: string, opts: RequestInit = {}, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const r = await fetch(url, opts);
    if (r.status === 429 && i < retries - 1) { await new Promise(r => setTimeout(r, Math.pow(2, i + 1) * 1000)); continue; }
    return r;
  }
  throw new Error("Max retries");
}

async function getSheetTabs(token: string, id: string) {
  const r = await fetchRetry(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(await r.text());
  const d = await r.json();
  return (d.sheets || []).map((s: any) => ({ title: s.properties.title, sheetId: s.properties.sheetId }));
}

async function createTab(token: string, spreadId: string, title: string) {
  const r = await fetchRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadId}:batchUpdate`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
  });
  if (!r.ok) throw new Error(await r.text());
  const d = await r.json();
  return d.replies[0].addSheet.properties.sheetId;
}

async function updateSheet(token: string, id: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const r = await fetchRetry(url, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
  if (!r.ok) throw new Error(await r.text());
}

async function clearSheet(token: string, id: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}:clear`;
  await fetchRetry(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
}

async function formatSheet(token: string, spreadId: string, sheetId: number, colorIdx: number, colWidths: number[], frozenRows = 1) {
  const color = TAB_COLORS[colorIdx % TAB_COLORS.length];
  const requests: any[] = [];
  
  colWidths.forEach((px, i) => {
    requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: "pixelSize" } });
  });
  
  // Header row: light pastel color, dark text
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colWidths.length },
      cell: { userEnteredFormat: {
        backgroundColor: { red: color.header.r, green: color.header.g, blue: color.header.b },
        textFormat: { bold: true, foregroundColor: { red: color.text.r, green: color.text.g, blue: color.text.b }, fontSize: 10, fontFamily: "Google Sans" },
        horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
        wrapStrategy: "WRAP",
      } },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)"
    }
  });
  
  requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 36 }, fields: "pixelSize" } });
  
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: colWidths.length },
      cell: { userEnteredFormat: {
        verticalAlignment: "MIDDLE", wrapStrategy: "CLIP",
        textFormat: { fontSize: 10 },
      } },
      fields: "userEnteredFormat(verticalAlignment,wrapStrategy,textFormat.fontSize)"
    }
  });
  
  requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: frozenRows } }, fields: "gridProperties.frozenRowCount" } });
  
  // Alternate row banding with light pastel
  requests.push({
    addBanding: {
      bandedRange: { sheetId, range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: colWidths.length },
        rowProperties: {
          headerColor: { red: color.header.r, green: color.header.g, blue: color.header.b },
          firstBandColor: { red: 1, green: 1, blue: 1 },
          secondBandColor: { red: color.band.r, green: color.band.g, blue: color.band.b }
        }
      }
    }
  });
  
  // Bottom border on header
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colWidths.length },
      bottom: { style: "SOLID", color: { red: color.text.r, green: color.text.g, blue: color.text.b, alpha: 0.3 } }
    }
  });
  
  try {
    await fetchRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadId}:batchUpdate`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests })
    });
  } catch (e: any) { console.warn("Format failed:", e.message); }
}

function getSupabase() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function fmtDate(d: string | null) { return d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }
function fmtShort(d: string | null) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }

// ─── SYNC FUNCTIONS ───

async function syncUsers(token: string, sheetId: string, tabs: any[], supabase: any) {
  const tabTitle = "Users";
  let tab = tabs.find((t: any) => t.title === tabTitle);
  if (!tab) { const id = await createTab(token, sheetId, tabTitle); tab = { title: tabTitle, sheetId: id }; }
  
  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(1000);
  if (!users?.length) return { sheet: tabTitle, rows: 0 };

  const headers = ["#", "User ID", "Full Name", "Email", "Mobile", "Instagram", "Secret Code", "Display ID", "City", "State", "Pincode", "Address", "Age", "Gender", "DOB", "Registered At"];
  const rows = users.map((u: any, i: number) => [
    i + 1, u.user_id || "", u.full_name || "", u.email || "", u.mobile || "", u.instagram_id || "",
    u.secret_code || "", u.display_id || "", u.city || "", u.state || "", u.pincode || "",
    u.address || "", u.age || "", u.gender || "", u.date_of_birth || "", fmtDate(u.created_at)
  ]);

  await clearSheet(token, sheetId, `'${tabTitle}'!A1:Z5000`);
  await updateSheet(token, sheetId, `'${tabTitle}'!A1`, [headers, ...rows]);
  await formatSheet(token, sheetId, tab.sheetId, 2, [40, 280, 160, 220, 130, 130, 90, 80, 110, 110, 90, 240, 50, 70, 110, 170]); // blue
  return { sheet: tabTitle, rows: rows.length };
}

async function syncPaymentHistory(token: string, sheetId: string, tabs: any[], supabase: any) {
  const tabTitle = "Payment History";
  let tab = tabs.find((t: any) => t.title === tabTitle);
  if (!tab) { const id = await createTab(token, sheetId, tabTitle); tab = { title: tabTitle, sheetId: id }; }

  const { data } = await supabase.from("payment_history").select("*").order("created_at", { ascending: false }).limit(1000);
  if (!data?.length) return { sheet: tabTitle, rows: 0 };

  const headers = ["#", "Payment ID", "User ID", "Amount", "Payment Type", "Payment Method", "Razorpay Payment ID", "Razorpay Order ID", "Booking ID", "Order ID", "Status", "Notes", "Created At"];
  const rows = data.map((p: any, i: number) => [
    i + 1, p.id || "", p.user_id || "", p.amount ? `₹${Number(p.amount).toLocaleString("en-IN")}` : "", p.payment_type || "",
    p.payment_method || "", p.razorpay_payment_id || "", p.razorpay_order_id || "", p.booking_id || "", p.order_id || "",
    p.status || "", p.notes || "", fmtDate(p.created_at)
  ]);

  await clearSheet(token, sheetId, `'${tabTitle}'!A1:Z5000`);
  await updateSheet(token, sheetId, `'${tabTitle}'!A1`, [headers, ...rows]);
  await formatSheet(token, sheetId, tab.sheetId, 1, [40, 280, 130, 110, 120, 130, 200, 200, 130, 130, 90, 240, 170]); // green
  return { sheet: tabTitle, rows: rows.length };
}

async function syncEvents(token: string, sheetId: string, tabs: any[], supabase: any) {
  const tabTitle = "Events";
  let tab = tabs.find((t: any) => t.title === tabTitle);
  if (!tab) { const id = await createTab(token, sheetId, tabTitle); tab = { title: tabTitle, sheetId: id }; }

  const { data } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: false }).limit(1000);
  if (!data?.length) return { sheet: tabTitle, rows: 0 };

  const headers = ["#", "Booking ID", "Client Name", "Mobile", "Email", "Instagram", "Event Date", "Start Time", "End Time", "Event Type", "City", "State", "Country", "Venue", "Full Address", "Pincode",
    "Artist Count", "Total Price", "Advance Paid", "Remaining", "Payment Status", "Booking Status", "Source", "Is International", "Travel Confirmed", "Accommodation", "Notes", "Created At"];
  const rows = data.map((e: any, i: number) => [
    i + 1, e.id || "", e.client_name || "", e.client_mobile || "", e.client_email || "", e.client_instagram || "",
    fmtShort(e.event_date), e.event_start_time || "", e.event_end_time || "", e.event_type || "",
    e.city || "", e.state || "", e.country || "", e.venue_name || "", e.full_address || "", e.pincode || "",
    e.artist_count || 1, e.total_price ? `₹${Number(e.total_price).toLocaleString("en-IN")}` : "",
    e.advance_amount ? `₹${Number(e.advance_amount).toLocaleString("en-IN")}` : "",
    e.remaining_amount ? `₹${Number(e.remaining_amount).toLocaleString("en-IN")}` : "",
    e.payment_status || "", e.status || "", e.source || "", e.is_international ? "Yes" : "No",
    e.travel_confirmed ? "Yes" : "No", e.accommodation_confirmed ? "Yes" : "No", e.notes || "", fmtDate(e.created_at)
  ]);

  await clearSheet(token, sheetId, `'${tabTitle}'!A1:Z5000`);
  await updateSheet(token, sheetId, `'${tabTitle}'!A1`, [headers, ...rows]);
  await formatSheet(token, sheetId, tab.sheetId, 3, [40, 280, 150, 130, 200, 130, 110, 90, 90, 120, 110, 90, 90, 140, 240, 90, 60, 110, 110, 110, 110, 110, 90, 60, 60, 60, 240, 170]); // orange
  return { sheet: tabTitle, rows: rows.length };
}

async function syncOrders(token: string, sheetId: string, tabs: any[], supabase: any) {
  const tabTitle = "Orders";
  let tab = tabs.find((t: any) => t.title === tabTitle);
  if (!tab) { const id = await createTab(token, sheetId, tabTitle); tab = { title: tabTitle, sheetId: id }; }

  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(1000);
  if (!data?.length) return { sheet: tabTitle, rows: 0 };

  const headers = ["#", "Order ID", "Customer Name", "Email", "Mobile", "Caricature Type", "Style", "Faces", "Amount", "Payment Status", "Razorpay ID",
    "Status", "Delivery Date", "Address", "City", "State", "Pincode", "Special Instructions", "Created At", "Updated At"];
  const rows = data.map((o: any, i: number) => [
    i + 1, o.id || "", o.customer_name || "", o.customer_email || "", o.customer_mobile || "",
    o.caricature_type || "", o.style || "", o.face_count || "", o.amount ? `₹${Number(o.amount).toLocaleString("en-IN")}` : "",
    o.payment_status || "", o.razorpay_payment_id || "", o.status || "",
    fmtShort(o.expected_delivery_date), o.delivery_address || "", o.delivery_city || "", o.delivery_state || "",
    o.delivery_pincode || "", o.special_instructions || "", fmtDate(o.created_at), fmtDate(o.updated_at)
  ]);

  await clearSheet(token, sheetId, `'${tabTitle}'!A1:Z5000`);
  await updateSheet(token, sheetId, `'${tabTitle}'!A1`, [headers, ...rows]);
  await formatSheet(token, sheetId, tab.sheetId, 0, [40, 280, 160, 200, 130, 130, 90, 60, 100, 120, 200, 90, 110, 240, 110, 90, 90, 240, 170, 170]); // yellow
  return { sheet: tabTitle, rows: rows.length };
}

async function syncEnquiries(token: string, sheetId: string, tabs: any[], supabase: any) {
  const tabTitle = "Enquiries";
  let tab = tabs.find((t: any) => t.title === tabTitle);
  if (!tab) { const id = await createTab(token, sheetId, tabTitle); tab = { title: tabTitle, sheetId: id }; }

  const { data } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(1000);
  if (!data?.length) return { sheet: tabTitle, rows: 0 };

  const headers = ["#", "Enquiry No", "Name", "Mobile", "Email", "Instagram", "Enquiry Type", "Caricature Type", "Event Date", "Event Type",
    "City", "State", "District", "Country", "Budget", "Estimated Price", "Status", "Source", "Admin Notes", "Follow Up Date", "Link Clicked", "Created At"];
  const rows = data.map((e: any, i: number) => [
    i + 1, e.enquiry_number || "", e.name || "", e.mobile || "", e.email || "", e.instagram_id || "",
    e.enquiry_type || "", e.caricature_type || "", fmtShort(e.event_date), e.event_type || "",
    e.city || "", e.state || "", e.district || "", e.country || "", e.budget ? `₹${e.budget}` : "",
    e.estimated_price ? `₹${e.estimated_price}` : "", e.status || "", e.source || "",
    e.admin_notes || "", fmtShort(e.follow_up_date), e.link_clicked ? "Yes" : "No", fmtDate(e.created_at)
  ]);

  await clearSheet(token, sheetId, `'${tabTitle}'!A1:Z5000`);
  await updateSheet(token, sheetId, `'${tabTitle}'!A1`, [headers, ...rows]);
  await formatSheet(token, sheetId, tab.sheetId, 3, [40, 110, 150, 130, 200, 130, 110, 130, 110, 120, 110, 90, 90, 90, 90, 90, 90, 90, 240, 110, 70, 170]); // orange
  return { sheet: tabTitle, rows: rows.length };
}

async function syncAnalytics(token: string, sheetId: string, tabs: any[], supabase: any) {
  const tabTitle = "Analytics";
  let tab = tabs.find((t: any) => t.title === tabTitle);
  if (!tab) { const id = await createTab(token, sheetId, tabTitle); tab = { title: tabTitle, sheetId: id }; }

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [usersRes, ordersRes, eventsRes, enquiriesRes, actionsRes, downloadsRes, chatRes, paymentsRes, workshopRes] = await Promise.all([
    supabase.from("profiles").select("user_id, created_at", { count: "exact" }),
    supabase.from("orders").select("id, amount, status, created_at", { count: "exact" }),
    supabase.from("event_bookings").select("id, total_price, advance_amount, status, created_at", { count: "exact" }),
    supabase.from("enquiries").select("id, status, created_at", { count: "exact" }),
    supabase.from("app_actions").select("id, action_type, screen, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("app_downloads").select("id, platform, created_at", { count: "exact" }),
    supabase.from("ai_chat_sessions").select("id, status, created_at", { count: "exact" }),
    supabase.from("payment_history").select("id, amount, created_at", { count: "exact" }),
    supabase.from("workshop_users").select("id, created_at", { count: "exact" }),
  ]);

  const totalUsers = usersRes.count || 0;
  const totalOrders = ordersRes.count || 0;
  const totalEvents = eventsRes.count || 0;
  const totalEnquiries = enquiriesRes.count || 0;
  const totalDownloads = downloadsRes.count || 0;
  const totalChats = chatRes.count || 0;
  const totalPayments = paymentsRes.count || 0;
  const totalWorkshop = workshopRes.count || 0;

  const actions = actionsRes.data || [];
  const todayActions = actions.filter((a: any) => a.created_at?.startsWith(today)).length;
  const weekActions = actions.filter((a: any) => a.created_at >= weekAgo).length;
  const todayUsers = new Set(actions.filter((a: any) => a.created_at?.startsWith(today)).map((a: any) => a.user_id).filter(Boolean)).size;

  const orders = ordersRes.data || [];
  const totalRevOrders = orders.reduce((s: number, o: any) => s + (o.amount || 0), 0);
  const events = eventsRes.data || [];
  const totalRevEvents = events.reduce((s: number, e: any) => s + (e.total_price || 0), 0);
  const totalAdvance = events.reduce((s: number, e: any) => s + (e.advance_amount || 0), 0);

  const topScreens = Object.entries(actions.reduce((acc: Record<string, number>, a: any) => { if (a.screen) acc[a.screen] = (acc[a.screen] || 0) + 1; return acc; }, {}))
    .sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 15);
  const topActions = Object.entries(actions.reduce((acc: Record<string, number>, a: any) => { acc[a.action_type] = (acc[a.action_type] || 0) + 1; return acc; }, {}))
    .sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 15);

  const dashboardData = [
    ["📊 ANALYTICS DASHBOARD", "", "", `Last Updated: ${new Date().toLocaleString("en-IN")}`],
    [],
    ["🔑 KEY METRICS", "", "📈 TRAFFIC", ""],
    ["Total Users", totalUsers, "Actions Today", todayActions],
    ["Total Orders", totalOrders, "Actions This Week", weekActions],
    ["Total Events", totalEvents, "Active Users Today", todayUsers],
    ["Total Enquiries", totalEnquiries, "App Downloads", totalDownloads],
    ["Total Payments", totalPayments, "Chat Sessions", totalChats],
    ["Workshop Students", totalWorkshop, "", ""],
    [],
    ["💰 REVENUE OVERVIEW", "", "", ""],
    ["Orders Revenue", `₹${totalRevOrders.toLocaleString("en-IN")}`, "", ""],
    ["Events Revenue", `₹${totalRevEvents.toLocaleString("en-IN")}`, "", ""],
    ["Advance Collected", `₹${totalAdvance.toLocaleString("en-IN")}`, "", ""],
    ["Total Revenue", `₹${(totalRevOrders + totalRevEvents).toLocaleString("en-IN")}`, "", ""],
    [],
    ["📱 TOP PAGES", "Views", "🎯 TOP ACTIONS", "Count"],
    ...topScreens.map(([s, c], i) => [s, c, topActions[i]?.[0] || "", topActions[i]?.[1] || ""]),
  ];

  await clearSheet(token, sheetId, `'${tabTitle}'!A1:Z100`);
  await updateSheet(token, sheetId, `'${tabTitle}'!A1`, dashboardData);
  await formatSheet(token, sheetId, tab.sheetId, 2, [220, 160, 220, 160]); // blue
  return { sheet: tabTitle, rows: dashboardData.length };
}

async function syncWorkshopMarch(token: string, sheetId: string, tabs: any[], supabase: any) {
  const tabTitle = "Workshop 14-15 March";
  let tab = tabs.find((t: any) => t.title === tabTitle);
  if (!tab) { const id = await createTab(token, sheetId, tabTitle); tab = { title: tabTitle, sheetId: id }; }

  const { data } = await supabase.from("workshop_users").select("*")
    .or("workshop_date.eq.2025-03-14,workshop_date.eq.2025-03-15,workshop_date.eq.2026-03-14,workshop_date.eq.2026-03-15")
    .order("created_at", { ascending: true }).limit(500);
  
  if (!data?.length) {
    const { data: allWs } = await supabase.from("workshop_users").select("*").order("created_at", { ascending: true }).limit(500);
    const march = (allWs || []).filter((w: any) => {
      const d = w.workshop_date || "";
      return d.includes("-03-14") || d.includes("-03-15");
    });
    return syncWorkshopData(token, sheetId, tab, tabTitle, march, 0);
  }
  return syncWorkshopData(token, sheetId, tab, tabTitle, data, 0);
}

async function syncWorkshopJune(token: string, sheetId: string, tabs: any[], supabase: any) {
  const tabTitle = "June Workshop";
  let tab = tabs.find((t: any) => t.title === tabTitle);
  if (!tab) { const id = await createTab(token, sheetId, tabTitle); tab = { title: tabTitle, sheetId: id }; }

  const { data } = await supabase.from("workshop_users").select("*").order("created_at", { ascending: true }).limit(500);
  const juneUsers = (data || []).filter((w: any) => {
    const d = w.workshop_date || "";
    return !d.includes("-03-14") && !d.includes("-03-15");
  });
  return syncWorkshopData(token, sheetId, tab, tabTitle, juneUsers, 1);
}

async function syncWorkshopData(token: string, sheetId: string, tab: any, tabTitle: string, data: any[], colorIdx: number) {
  if (!data?.length) return { sheet: tabTitle, rows: 0 };

  const headers = ["#", "Roll No", "Name", "Email", "Mobile", "Age", "Gender", "City", "State", "District", "Country",
    "Instagram", "Occupation", "Skill Level", "Artist Background", "Student Type", "Slot", "Workshop Date",
    "Payment Amount", "Payment Status", "Razorpay ID", "Why Join", "Secret Code", "Video Access", "Registered At"];
  const rows = data.map((w: any, i: number) => [
    i + 1, w.roll_number || "", w.name || "", w.email || "", w.mobile || "", w.age || "", w.gender || "",
    w.city || "", w.state || "", w.district || "", w.country || "", w.instagram_id || "",
    w.occupation || "", w.skill_level || "", w.artist_background || "", w.student_type || "", w.slot || "",
    fmtShort(w.workshop_date), w.payment_amount ? `₹${w.payment_amount}` : "", w.payment_status || "",
    w.razorpay_payment_id || "", w.why_join || "", w.secret_code || "",
    w.video_access_enabled ? "Yes" : "No", fmtDate(w.created_at)
  ]);

  await clearSheet(token, sheetId, `'${tabTitle}'!A1:Z5000`);
  await updateSheet(token, sheetId, `'${tabTitle}'!A1`, [headers, ...rows]);
  await formatSheet(token, sheetId, tab.sheetId, colorIdx, [40, 70, 150, 200, 130, 50, 70, 110, 90, 90, 90, 130, 110, 100, 140, 100, 90, 110, 100, 100, 200, 240, 80, 70, 170]);
  return { sheet: tabTitle, rows: rows.length };
}

// ─── Single-table update ───
async function syncSingleTable(token: string, sheetId: string, tabs: any[], supabase: any, table: string) {
  switch (table) {
    case "profiles": return syncUsers(token, sheetId, tabs, supabase);
    case "payment_history": return syncPaymentHistory(token, sheetId, tabs, supabase);
    case "event_bookings": return syncEvents(token, sheetId, tabs, supabase);
    case "orders": return syncOrders(token, sheetId, tabs, supabase);
    case "enquiries": return syncEnquiries(token, sheetId, tabs, supabase);
    case "app_actions": return syncAnalytics(token, sheetId, tabs, supabase);
    case "workshop_users": {
      const r1 = await syncWorkshopMarch(token, sheetId, tabs, supabase);
      const r2 = await syncWorkshopJune(token, sheetId, tabs, supabase);
      return { sheets: [r1, r2] };
    }
    default: return { error: "Unknown table" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const sheetId = Deno.env.get("MINI_DB_SHEET_ID");
    if (!serviceKeyRaw || !sheetId) return err("Mini DB sheet not configured");

    const serviceKey = JSON.parse(serviceKeyRaw);
    const token = await getAccessToken(serviceKey);
    let tabs = await getSheetTabs(token, sheetId);
    const supabase = getSupabase();

    const body = await req.json();
    const { action, table } = body;

    if (action === "sync_all") {
      const results = [];
      results.push(await syncUsers(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncPaymentHistory(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncEvents(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncOrders(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncEnquiries(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncAnalytics(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncWorkshopMarch(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncWorkshopJune(token, sheetId, tabs, supabase));
      return ok({ success: true, results });
    }

    if (action === "sync_table" && table) {
      tabs = await getSheetTabs(token, sheetId);
      const result = await syncSingleTable(token, sheetId, tabs, supabase, table);
      return ok({ success: true, ...result });
    }

    if (action === "sync_users") { return ok({ success: true, ...(await syncUsers(token, sheetId, tabs, supabase)) }); }
    if (action === "sync_payments") { return ok({ success: true, ...(await syncPaymentHistory(token, sheetId, tabs, supabase)) }); }
    if (action === "sync_events") { tabs = await getSheetTabs(token, sheetId); return ok({ success: true, ...(await syncEvents(token, sheetId, tabs, supabase)) }); }
    if (action === "sync_orders") { tabs = await getSheetTabs(token, sheetId); return ok({ success: true, ...(await syncOrders(token, sheetId, tabs, supabase)) }); }
    if (action === "sync_enquiries") { tabs = await getSheetTabs(token, sheetId); return ok({ success: true, ...(await syncEnquiries(token, sheetId, tabs, supabase)) }); }
    if (action === "sync_analytics") { tabs = await getSheetTabs(token, sheetId); return ok({ success: true, ...(await syncAnalytics(token, sheetId, tabs, supabase)) }); }
    if (action === "sync_workshop") {
      tabs = await getSheetTabs(token, sheetId);
      const r1 = await syncWorkshopMarch(token, sheetId, tabs, supabase);
      tabs = await getSheetTabs(token, sheetId);
      const r2 = await syncWorkshopJune(token, sheetId, tabs, supabase);
      return ok({ success: true, results: [r1, r2] });
    }

    if (action === "update_design") {
      const results = [];
      results.push(await syncUsers(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncPaymentHistory(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncEvents(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncOrders(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncEnquiries(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncAnalytics(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncWorkshopMarch(token, sheetId, tabs, supabase));
      tabs = await getSheetTabs(token, sheetId);
      results.push(await syncWorkshopJune(token, sheetId, tabs, supabase));
      return ok({ success: true, message: "Design updated with light pastel colors", results });
    }

    return err("Invalid action. Use: sync_all, update_design, sync_table, sync_users, sync_payments, sync_events, sync_orders, sync_enquiries, sync_analytics, sync_workshop");
  } catch (e: any) {
    console.error("Mini DB sync error:", e);
    return ok({ success: false, error: e.message });
  }
});
