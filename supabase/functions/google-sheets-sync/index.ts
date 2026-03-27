import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SUMMARY_TAB_NAME = "All Events Summary";

const SUMMARY_HEADERS = [
  "Sr No","Event Created Date","Event Date","Venue","Time","Artist",
  "Total Amount","Advance Paid","Remaining","Full Address","Customer Name",
  "Phone","Email","Event Type","Artists Count","Payment Status",
  "Booking Status","Lead Source","Notes","Booking ID",
];
const SUMMARY_COL_COUNT = SUMMARY_HEADERS.length;

const SHEET_HEADERS = [
  "Date","Booking ID","Venue","Artist Assigned","Total Amount","Advance Paid",
  "Remaining Amount","Full Address","Customer Name","Phone Number","Email",
  "Event Type","Number of Artists","Duration (Hours)","Payment Status",
  "Booking Status","Lead Source","Date of Booking","Package / Service","Notes","Created At",
];
const COL_COUNT = SHEET_HEADERS.length; // 21

// Light color palette
const COLORS = {
  yellow:  { r: 1.0, g: 0.96, b: 0.80 },   // light yellow header
  green:   { r: 0.85, g: 0.95, b: 0.85 },   // light green
  blue:    { r: 0.85, g: 0.92, b: 1.0 },     // light blue
  orange:  { r: 1.0, g: 0.92, b: 0.82 },     // light orange
  yellowBand: { r: 1.0, g: 0.99, b: 0.93 },
  greenBand:  { r: 0.94, g: 0.98, b: 0.94 },
  blueBand:   { r: 0.94, g: 0.96, b: 1.0 },
  orangeBand: { r: 1.0, g: 0.97, b: 0.93 },
};

function ok(body: any) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function err(message: string, status = 500) {
  return new Response(JSON.stringify({ success: false, error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getMonthTabName(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function parseMonthKeyFromTab(title: string): string | null {
  const match = title.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
  if (monthIndex < 0) return null;
  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ── Google Auth ──
async function getAccessToken(serviceAccountKey: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: serviceAccountKey.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const claimB64 = btoa(JSON.stringify(claim)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${headerB64}.${claimB64}`;
  const pemContent = serviceAccountKey.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(unsignedToken));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsignedToken}.${sigB64}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}` });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

async function fetchWithRetry(url: string, opts: RequestInit = {}, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429 && attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
      continue;
    }
    return res;
  }
  throw new Error("Max retries exceeded");
}

// ── Sheet helpers ──
async function getSheetTabs(accessToken: string, sheetId: string) {
  const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Failed to get sheet info: ${await res.text()}`);
  const data = await res.json();
  return (data.sheets || []).map((s: any) => ({ title: s.properties.title, sheetId: s.properties.sheetId, index: s.properties.index }));
}

async function readSheet(accessToken: string, sheetId: string, range: string) {
  const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Read failed: ${await res.text()}`);
  return await res.json();
}

async function batchReadSheets(accessToken: string, sheetId: string, ranges: string[]) {
  if (ranges.length === 0) return [];
  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Batch read failed: ${await res.text()}`);
  return (await res.json()).valueRanges || [];
}

async function updateSheet(accessToken: string, sheetId: string, range: string, values: any[][]) {
  const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Update failed: ${await res.text()}`);
  return await res.json();
}

async function clearSheet(accessToken: string, spreadsheetId: string, range: string) {
  await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({}),
  });
}

function findTab(tabs: { title: string; sheetId: number }[], targetName: string) {
  return tabs.find(t => t.title.trim().toLowerCase() === targetName.trim().toLowerCase());
}

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function fetchArtistNames(supabase: any, eventId: string): Promise<string[]> {
  try {
    const { data } = await supabase.from("event_artist_assignments").select("artist_id, artists(name)").eq("event_id", eventId);
    if (data && data.length > 0) return data.map((a: any) => a.artists?.name).filter(Boolean);
  } catch (_) {}
  return [];
}

// ── Helpers for payment/status labels ──
function getPaymentLabel(event: any): string {
  const ps = event.payment_status || "pending";
  const status = event.status || "upcoming";
  if (status === "completed" || ps === "fully_paid" || ps === "full_paid") return "Paid";
  if (ps === "confirmed" || ps === "paid" || ps === "partial") return "Partial";
  return "Pending";
}

function getBookingStatus(event: any): string {
  const ps = event.payment_status || "pending";
  const status = event.status || "upcoming";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (ps === "confirmed" || ps === "paid" || ps === "fully_paid" || ps === "partial") return "Confirmed";
  return "New";
}

function getAmounts(event: any) {
  const totalPrice = Number(event.total_price) || 0;
  const advancePaid = Number(event.advance_amount) || 0;
  const negotiatedTotal = event.negotiated ? (Number(event.negotiated_total) || totalPrice) : totalPrice;
  const negotiatedAdvance = event.negotiated ? (Number(event.negotiated_advance) || advancePaid) : advancePaid;
  return { negotiatedTotal, negotiatedAdvance };
}

function getArtistLabel(event: any, artistNames: string[]): string {
  return artistNames.length > 0 ? artistNames.join(", ") : (event.artist_count === 1 ? "1 Artist" : `${event.artist_count || 1} Artists`);
}

function getDuration(event: any): string {
  const s = event.event_start_time || "";
  const e = event.event_end_time || "";
  if (s && e) {
    const sP = s.split(":").map(Number);
    const eP = e.split(":").map(Number);
    if (sP.length >= 2 && eP.length >= 2) {
      const diff = (eP[0] * 60 + eP[1]) - (sP[0] * 60 + sP[1]);
      if (diff > 0) return String(Math.round(diff / 60 * 10) / 10);
    }
  }
  return "";
}

// ── Format a row for monthly tabs (21 columns) ──
// Col A = Date (pre-filled), so event data starts from B
function formatMonthlyRow(event: any, artistNames: string[], rowDate: string): any[] {
  const { negotiatedTotal, negotiatedAdvance } = getAmounts(event);
  const venueStr = [event.city, event.venue_name].filter(Boolean).join(" - ");
  const fullAddress = event.full_address || [event.venue_name, event.city, event.state, event.pincode].filter(Boolean).join(", ");

  return [
    rowDate,                                  // A: Date
    event.id || "",                           // B: Booking ID
    venueStr,                                 // C: Venue
    getArtistLabel(event, artistNames),       // D: Artist
    negotiatedTotal,                          // E: Total Amount
    negotiatedAdvance,                        // F: Advance Paid
    `=IF(E{ROW}-F{ROW}<0,0,E{ROW}-F{ROW})`,  // G: Remaining
    fullAddress,                              // H: Full Address
    event.client_name || "",                  // I: Customer Name
    event.client_mobile || "",                // J: Phone
    event.client_email || "",                 // K: Email
    event.event_type || "",                   // L: Event Type
    String(event.artist_count || 1),          // M: Artists Count
    getDuration(event),                       // N: Duration
    getPaymentLabel(event),                   // O: Payment Status
    getBookingStatus(event),                  // P: Booking Status
    event.source || "Website",               // Q: Lead Source
    event.created_at ? new Date(event.created_at).toLocaleDateString("en-IN") : "", // R: Date of Booking
    event.is_international ? "International" : (event.is_mumbai ? "Mumbai Package" : "Pan India"), // S: Package
    event.notes || "",                        // T: Notes
    event.created_at ? new Date(event.created_at).toLocaleString("en-IN") : "", // U: Created At
  ];
}

// ── Format a row for the Summary tab (20 columns) ──
function formatSummaryRow(event: any, artistNames: string[], srNo: number): any[] {
  const { negotiatedTotal, negotiatedAdvance } = getAmounts(event);
  const startTime = event.event_start_time || "";
  const endTime = event.event_end_time || "";
  let timeStr = startTime && endTime ? `${startTime} - ${endTime}` : startTime || "";
  const venueStr = [event.city, event.venue_name].filter(Boolean).join(" - ");
  const fullAddress = event.full_address || [event.venue_name, event.city, event.state, event.pincode].filter(Boolean).join(", ");
  const remaining = Math.max(0, negotiatedTotal - negotiatedAdvance);

  return [
    srNo,
    event.created_at ? new Date(event.created_at).toLocaleDateString("en-IN") : "",
    event.event_date || "",
    venueStr, timeStr, getArtistLabel(event, artistNames),
    negotiatedTotal, negotiatedAdvance, remaining,
    fullAddress, event.client_name || "", event.client_mobile || "",
    event.client_email || "", event.event_type || "", String(event.artist_count || 1),
    getPaymentLabel(event), getBookingStatus(event),
    event.source || "Website", event.notes || "", event.id || "",
  ];
}

function fixRowFormulas(row: any[], rowNum: number): any[] {
  return row.map(cell => {
    if (typeof cell === "string" && cell.includes("{ROW}")) return cell.replace(/\{ROW\}/g, String(rowNum));
    return cell;
  });
}

// ── Build monthly tab with pre-filled dates and events on correct date rows ──
async function buildMonthlyTab(
  accessToken: string, spreadsheetId: string, tab: { title: string; sheetId: number },
  year: number, month: number, events: any[], artistMap: Record<string, string[]>
) {
  const daysInMonth = getDaysInMonth(year, month);
  
  // Row 1 = headers, Row 2..32 = day 1..31
  const allRows: any[][] = [SHEET_HEADERS];
  
  // Group events by day
  const eventsByDay: Record<number, any[]> = {};
  for (const ev of events) {
    const d = new Date(ev.event_date);
    const day = d.getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const displayDate = new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });
    
    const dayEvents = eventsByDay[day] || [];
    
    if (dayEvents.length === 0) {
      // Empty date row placeholder
      const emptyRow = [displayDate, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
      allRows.push(emptyRow);
    } else {
      for (let i = 0; i < dayEvents.length; i++) {
        const ev = dayEvents[i];
        const names = artistMap[ev.id] || [];
        const row = formatMonthlyRow(ev, names, displayDate);
        const rowNum = allRows.length + 1;
        allRows.push(fixRowFormulas(row, rowNum));
      }
    }
  }

  // Clear and write
  await clearSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:U500`);
  const lastCol = "U";
  await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:${lastCol}${allRows.length}`, allRows);

  return allRows.length;
}

// ── Apply formatting to a monthly tab ──
async function applyMonthlyFormat(accessToken: string, spreadsheetId: string, sid: number, rowCount: number, colorIndex: number) {
  const headerColors = [COLORS.yellow, COLORS.green, COLORS.blue, COLORS.orange];
  const bandColors = [COLORS.yellowBand, COLORS.greenBand, COLORS.blueBand, COLORS.orangeBand];
  const hc = headerColors[colorIndex % 4];
  const bc = bandColors[colorIndex % 4];

  const formatReqs: any[] = [
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: COL_COUNT },
        cell: { userEnteredFormat: {
          backgroundColor: { red: hc.r, green: hc.g, blue: hc.b },
          textFormat: { bold: true, foregroundColor: { red: 0.15, green: 0.15, blue: 0.15 }, fontSize: 10, fontFamily: "Google Sans" },
          horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", wrapStrategy: "WRAP",
        }},
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    { updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
    // Currency format E, F, G
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 1, endRowIndex: Math.max(rowCount, 40), startColumnIndex: 4, endColumnIndex: 7 },
        cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "₹#,##0" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // Date column bold + left align
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 1, endRowIndex: Math.max(rowCount, 40), startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 10 }, backgroundColor: { red: 0.97, green: 0.97, blue: 0.95 } } },
        fields: "userEnteredFormat(textFormat,backgroundColor)",
      },
    },
  ];

  // Column widths
  const widths = [110, 240, 180, 180, 110, 110, 120, 250, 160, 130, 200, 110, 80, 80, 100, 100, 100, 110, 140, 220, 160];
  widths.forEach((px, i) => {
    formatReqs.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: "pixelSize" } });
  });

  // Alternating colors
  formatReqs.push({
    addBanding: {
      bandedRange: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: Math.max(rowCount, 40), startColumnIndex: 0, endColumnIndex: COL_COUNT },
        rowProperties: {
          headerColor: { red: hc.r, green: hc.g, blue: hc.b },
          firstBandColor: { red: 1, green: 1, blue: 1 },
          secondBandColor: { red: bc.r, green: bc.g, blue: bc.b },
        },
      },
    },
  });

  // Conditional formatting for Payment Status (col O = index 14)
  formatReqs.push(
    { addConditionalFormatRule: { rule: { ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 14, endColumnIndex: 15 }], booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Pending" }] }, format: { backgroundColor: { red: 0.98, green: 0.88, blue: 0.88 }, textFormat: { foregroundColor: { red: 0.7, green: 0.15, blue: 0.15 }, bold: true } } } }, index: 0 } },
    { addConditionalFormatRule: { rule: { ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 14, endColumnIndex: 15 }], booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Paid" }] }, format: { backgroundColor: { red: 0.86, green: 0.95, blue: 0.87 }, textFormat: { foregroundColor: { red: 0.15, green: 0.55, blue: 0.2 }, bold: true } } } }, index: 1 } },
    { addConditionalFormatRule: { rule: { ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 14, endColumnIndex: 15 }], booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Partial" }] }, format: { backgroundColor: { red: 1, green: 0.95, blue: 0.85 }, textFormat: { foregroundColor: { red: 0.75, green: 0.5, blue: 0.05 }, bold: true } } } }, index: 2 } },
  );

  // Data validations
  formatReqs.push(
    { setDataValidation: { range: { sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 14, endColumnIndex: 15 }, rule: { condition: { type: "ONE_OF_LIST", values: [{ userEnteredValue: "Pending" }, { userEnteredValue: "Partial" }, { userEnteredValue: "Paid" }] }, showCustomUi: true, strict: false } } },
    { setDataValidation: { range: { sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 15, endColumnIndex: 16 }, rule: { condition: { type: "ONE_OF_LIST", values: [{ userEnteredValue: "New" }, { userEnteredValue: "Confirmed" }, { userEnteredValue: "Completed" }, { userEnteredValue: "Cancelled" }] }, showCustomUi: true, strict: false } } },
  );

  await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: formatReqs }),
  });
}

// ── Rebuild the entire Summary tab from DB ──
async function rebuildSummarySheet(accessToken: string, spreadsheetId: string, tabs: any[], supabase: any) {
  let summaryTab = findTab(tabs, SUMMARY_TAB_NAME);
  if (!summaryTab) {
    const createRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SUMMARY_TAB_NAME, index: 0 } } }] }),
    });
    if (!createRes.ok) throw new Error(`Failed to create summary tab: ${await createRes.text()}`);
    const cd = await createRes.json();
    const newId = cd.replies?.[0]?.addSheet?.properties?.sheetId || 0;
    summaryTab = { title: SUMMARY_TAB_NAME, sheetId: newId };
    tabs.unshift(summaryTab);
  } else {
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ updateSheetProperties: { properties: { sheetId: summaryTab.sheetId, index: 0 }, fields: "index" } }] }),
    }).catch(() => {});
  }

  const { data: events, error } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: true });
  if (error) throw new Error(error.message);

  const artistMap: Record<string, string[]> = {};
  if (events && events.length > 0) {
    const { data: assignments } = await supabase.from("event_artist_assignments").select("event_id, artists(name)");
    if (assignments) {
      for (const a of assignments) {
        if (!artistMap[a.event_id]) artistMap[a.event_id] = [];
        if (a.artists?.name) artistMap[a.event_id].push(a.artists.name);
      }
    }
  }

  const allRows: any[][] = [SUMMARY_HEADERS];
  let srNo = 1;
  for (const event of (events || [])) {
    allRows.push(formatSummaryRow(event, artistMap[event.id] || [], srNo++));
  }

  await clearSheet(accessToken, spreadsheetId, `'${SUMMARY_TAB_NAME}'!A1:T5000`);
  if (allRows.length > 0) {
    await updateSheet(accessToken, spreadsheetId, `'${SUMMARY_TAB_NAME}'!A1:T${allRows.length}`, allRows);
  }

  // Format summary with light green
  const sid = summaryTab.sheetId;
  const hc = COLORS.green;
  const formatReqs: any[] = [
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: SUMMARY_COL_COUNT },
        cell: { userEnteredFormat: {
          backgroundColor: { red: hc.r, green: hc.g, blue: hc.b },
          textFormat: { bold: true, foregroundColor: { red: 0.1, green: 0.15, blue: 0.1 }, fontSize: 10, fontFamily: "Google Sans" },
          horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE", wrapStrategy: "WRAP",
        }},
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    { updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 6, endColumnIndex: 9 },
        cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "₹#,##0" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    },
  ];

  const summaryWidths = [50, 110, 100, 180, 120, 180, 110, 110, 110, 250, 160, 120, 200, 110, 80, 100, 100, 100, 220, 240];
  summaryWidths.forEach((px, i) => {
    formatReqs.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: "pixelSize" } });
  });

  formatReqs.push({
    addBanding: {
      bandedRange: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: Math.max(allRows.length, 100), startColumnIndex: 0, endColumnIndex: SUMMARY_COL_COUNT },
        rowProperties: {
          headerColor: { red: hc.r, green: hc.g, blue: hc.b },
          firstBandColor: { red: 1, green: 1, blue: 1 },
          secondBandColor: { red: COLORS.greenBand.r, green: COLORS.greenBand.g, blue: COLORS.greenBand.b },
        },
      },
    },
  });

  // Conditional formatting for Payment Status col (index 15)
  formatReqs.push(
    { addConditionalFormatRule: { rule: { ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 15, endColumnIndex: 16 }], booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Pending" }] }, format: { backgroundColor: { red: 0.98, green: 0.88, blue: 0.88 }, textFormat: { foregroundColor: { red: 0.7, green: 0.15, blue: 0.15 }, bold: true } } } }, index: 0 } },
    { addConditionalFormatRule: { rule: { ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 15, endColumnIndex: 16 }], booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Paid" }] }, format: { backgroundColor: { red: 0.86, green: 0.95, blue: 0.87 }, textFormat: { foregroundColor: { red: 0.15, green: 0.55, blue: 0.2 }, bold: true } } } }, index: 1 } },
    { addConditionalFormatRule: { rule: { ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 15, endColumnIndex: 16 }], booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Partial" }] }, format: { backgroundColor: { red: 1, green: 0.95, blue: 0.85 }, textFormat: { foregroundColor: { red: 0.75, green: 0.5, blue: 0.05 }, bold: true } } } }, index: 2 } },
  );

  await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: formatReqs }),
  });

  return { events: (events || []).length };
}

// ── Setup all monthly sheets with date-prefilled rows ──
async function setupSheets(accessToken: string, spreadsheetId: string, supabase?: any) {
  const existingTabs = await getSheetTabs(accessToken, spreadsheetId);
  const tabsToCreate: string[] = [];

  for (let year = 2026; year <= 2027; year++) {
    const startMonth = year === 2026 ? 3 : 0;
    for (let m = startMonth; m < 12; m++) {
      const name = `${MONTHS[m]} ${year}`;
      if (!findTab(existingTabs, name)) tabsToCreate.push(name);
    }
  }

  if (tabsToCreate.length > 0) {
    const requests = tabsToCreate.map((title, i) => ({ addSheet: { properties: { title, index: i + 1 } } }));
    const createRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
    if (!createRes.ok) throw new Error(`Failed to create tabs: ${await createRes.text()}`);
  }

  // Now rebuild ALL monthly tabs with date-prefilled rows + events
  const updatedTabs = await getSheetTabs(accessToken, spreadsheetId);
  
  if (supabase) {
    // Fetch all events
    const { data: allEvents } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: true });
    const { data: assignments } = await supabase.from("event_artist_assignments").select("event_id, artists(name)");
    const artistMap: Record<string, string[]> = {};
    if (assignments) {
      for (const a of assignments) {
        if (!artistMap[a.event_id]) artistMap[a.event_id] = [];
        if (a.artists?.name) artistMap[a.event_id].push(a.artists.name);
      }
    }

    // Group events by month tab
    const eventsByTab: Record<string, any[]> = {};
    for (const ev of (allEvents || [])) {
      const tabName = getMonthTabName(ev.event_date);
      if (!eventsByTab[tabName]) eventsByTab[tabName] = [];
      eventsByTab[tabName].push(ev);
    }

    // Build each monthly tab
    let colorIdx = 0;
    for (const tab of updatedTabs) {
      const mk = parseMonthKeyFromTab(tab.title);
      if (!mk) continue; // skip non-month tabs like summary
      const [yearStr, monthStr] = mk.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1;
      const tabEvents = eventsByTab[tab.title] || [];
      
      const rowCount = await buildMonthlyTab(accessToken, spreadsheetId, tab, year, month, tabEvents, artistMap);
      await applyMonthlyFormat(accessToken, spreadsheetId, tab.sheetId, rowCount, colorIdx);
      colorIdx++;
    }

    // Rebuild summary
    const finalTabs = await getSheetTabs(accessToken, spreadsheetId);
    await rebuildSummarySheet(accessToken, spreadsheetId, finalTabs, supabase);
  }

  return { created: tabsToCreate.length, tabs: tabsToCreate, summary: true };
}

// ── Push single event to the correct date row in its monthly tab ──
async function pushEventToSheet(
  accessToken: string, spreadsheetId: string,
  tabs: { title: string; sheetId: number }[],
  event: any, supabase?: any
) {
  const tabName = getMonthTabName(event.event_date);
  let tab = findTab(tabs, tabName);

  if (!tab) {
    const createRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
    });
    if (!createRes.ok) throw new Error(`Failed to create tab ${tabName}: ${await createRes.text()}`);
    const cd = await createRes.json();
    const newId = cd.replies?.[0]?.addSheet?.properties?.sheetId || 0;
    tab = { title: tabName, sheetId: newId };
    tabs.push(tab);
  }

  // Rebuild the entire month tab with correct date rows
  const mk = parseMonthKeyFromTab(tabName);
  if (mk && supabase) {
    const [yearStr, monthStr] = mk.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    // Fetch all events for this month
    const monthStart = `${yearStr}-${monthStr}-01`;
    const nextMonth = month === 11 ? `${year + 1}-01-01` : `${yearStr}-${String(month + 2).padStart(2, "0")}-01`;
    
    const { data: monthEvents } = await supabase.from("event_bookings").select("*")
      .gte("event_date", monthStart).lt("event_date", nextMonth)
      .order("event_date", { ascending: true });

    const { data: assignments } = await supabase.from("event_artist_assignments").select("event_id, artists(name)");
    const artistMap: Record<string, string[]> = {};
    if (assignments) {
      for (const a of assignments) {
        if (!artistMap[a.event_id]) artistMap[a.event_id] = [];
        if (a.artists?.name) artistMap[a.event_id].push(a.artists.name);
      }
    }

    const rowCount = await buildMonthlyTab(accessToken, spreadsheetId, tab, year, month, monthEvents || [], artistMap);
    return { tab: tabName, action: "rebuilt", rows: rowCount };
  }

  // Fallback: just append
  let artistNames: string[] = [];
  if (supabase && event.id) artistNames = await fetchArtistNames(supabase, event.id);
  const eventDate = new Date(event.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });
  const row = formatMonthlyRow(event, artistNames, eventDate);
  const data = await readSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:U500`);
  const rows = data.values || [];
  const nextRow = rows.length + 1;
  const fixed = fixRowFormulas(row, nextRow);
  await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A${nextRow}:U${nextRow}`, [fixed]);
  return { tab: tabName, action: "appended", row: nextRow };
}

function countSheetEvents(rows: any[][]): number {
  // Count rows with a booking ID (col B = index 1)
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]?.[1] && String(rows[i][1]).trim()) count++;
  }
  return count;
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceAccountKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
    if (!serviceAccountKeyRaw || !sheetId) return err("Google Sheets credentials not configured", 200);

    const serviceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);

    let tabs: { title: string; sheetId: number }[];
    try {
      tabs = await getSheetTabs(accessToken, sheetId);
    } catch (e: any) {
      console.error("Sheet tabs error:", e.message);
      return ok({ success: false, error: e.message, tabs: {}, tabNames: [], tabSummaries: [] });
    }

    const body = await req.json();
    const { action, event_data, event_id } = body;
    const supabase = getSupabaseClient();

    if (action === "setup_sheets") {
      const result = await setupSheets(accessToken, sheetId, supabase);
      return ok({ success: true, ...result });
    }

    if (action === "rebuild_summary" || action === "sync_summary") {
      const result = await rebuildSummarySheet(accessToken, sheetId, tabs, supabase);
      return ok({ success: true, ...result });
    }

    if (action === "read_all" || action === "read") {
      const allData: Record<string, any[][]> = {};
      const summaries: any[] = [];
      const ranges = tabs.map((t) => `'${t.title}'!A1:U500`);
      try {
        const batchResults = await batchReadSheets(accessToken, sheetId, ranges);
        for (let i = 0; i < tabs.length; i++) {
          const rows = batchResults[i]?.values || [];
          allData[tabs[i].title] = rows;
          summaries.push({ title: tabs[i].title, sheetId: tabs[i].sheetId, normalizedTitle: tabs[i].title.trim(), monthKey: parseMonthKeyFromTab(tabs[i].title), eventCount: countSheetEvents(rows) });
        }
      } catch (_) {
        for (const tab of tabs) {
          try {
            const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:U500`);
            allData[tab.title] = data.values || [];
            summaries.push({ title: tab.title, sheetId: tab.sheetId, normalizedTitle: tab.title.trim(), monthKey: parseMonthKeyFromTab(tab.title), eventCount: countSheetEvents(data.values || []) });
          } catch (__) {
            summaries.push({ title: tab.title, sheetId: tab.sheetId, normalizedTitle: tab.title.trim(), monthKey: parseMonthKeyFromTab(tab.title), eventCount: 0 });
          }
        }
      }
      return ok({ success: true, tabs: allData, tabNames: tabs.map(t => t.title), tabSummaries: summaries });
    }

    if (action === "read_overview") {
      const summaries = [];
      const ranges = tabs.map((t) => `'${t.title}'!A1:U500`);
      try {
        const batchResults = await batchReadSheets(accessToken, sheetId, ranges);
        for (let i = 0; i < tabs.length; i++) {
          summaries.push({ title: tabs[i].title, sheetId: tabs[i].sheetId, normalizedTitle: tabs[i].title.trim(), monthKey: parseMonthKeyFromTab(tabs[i].title), eventCount: countSheetEvents(batchResults[i]?.values || []) });
        }
      } catch (_) {
        for (const tab of tabs) summaries.push({ title: tab.title, sheetId: tab.sheetId, normalizedTitle: tab.title.trim(), monthKey: parseMonthKeyFromTab(tab.title), eventCount: 0 });
      }
      return ok({ success: true, tabNames: tabs.map(t => t.title), tabSummaries: summaries });
    }

    if (action === "read_tab") {
      const requestedTab = body.tab_name || "";
      if (!requestedTab) return err("Tab name is required", 200);
      const tab = findTab(tabs, requestedTab);
      if (!tab) return ok({ success: false, error: `Sheet tab "${requestedTab}" not found` });
      const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:U500`);
      return ok({ success: true, tabName: tab.title, rows: data.values || [] });
    }

    if ((action === "push_single" || action === "update_pushed") && event_id) {
      const { data: event, error } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (error || !event) return ok({ success: false, error: "Event not found" });
      const result = await pushEventToSheet(accessToken, sheetId, tabs, event, supabase);
      await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_id);
      try { await rebuildSummarySheet(accessToken, sheetId, tabs, supabase); } catch (_) {}
      return ok({ success: true, ...result });
    }

    if (action === "delete_from_sheet" && event_id) {
      const { data: event } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (!event) return ok({ success: false, error: "Event not found" });
      // Rebuild the month tab without deleted event
      await pushEventToSheet(accessToken, sheetId, tabs, event, supabase);
      await supabase.from("event_bookings").update({ sheet_pushed: false, sheet_pushed_at: null } as any).eq("id", event_id);
      try { await rebuildSummarySheet(accessToken, sheetId, tabs, supabase); } catch (_) {}
      return ok({ success: true, removed: true });
    }

    if (action === "sync_all") {
      // Full rebuild of all monthly tabs
      const result = await setupSheets(accessToken, sheetId, supabase);
      // Mark all events as pushed
      await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).is("sheet_pushed", null);
      await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("sheet_pushed", false);
      return ok({ success: true, ...result });
    }

    if (action === "append_event" && event_data) {
      try {
        await pushEventToSheet(accessToken, sheetId, tabs, event_data, supabase);
        if (event_data.id) await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_data.id);
        try { await rebuildSummarySheet(accessToken, sheetId, tabs, supabase); } catch (_) {}
      } catch (e: any) { console.warn("Auto-push failed:", e.message); }
      return ok({ success: true });
    }

    if (action === "update_event" && event_data && event_id) {
      try {
        await pushEventToSheet(accessToken, sheetId, tabs, { ...event_data, id: event_id }, supabase);
        try { await rebuildSummarySheet(accessToken, sheetId, tabs, supabase); } catch (_) {}
      } catch (e: any) { console.warn("Auto-update failed:", e.message); }
      return ok({ success: true });
    }

    if (action === "add_manual_event" && event_data) {
      const { data: inserted, error } = await supabase.from("event_bookings").insert({
        event_date: event_data.event_date, venue_name: event_data.venue_name || null,
        event_start_time: event_data.event_start_time || null, event_end_time: event_data.event_end_time || null,
        client_name: event_data.client_name || "Manual Entry", client_mobile: event_data.client_mobile || "",
        client_email: event_data.client_email || "", city: event_data.city || "", state: event_data.state || "",
        event_type: event_data.event_type || "other", artist_count: event_data.artist_count || 1,
        total_price: event_data.total_price || 0, advance_amount: event_data.advance_amount || 0,
        status: event_data.status || "confirmed", payment_status: event_data.payment_status || "pending",
        notes: event_data.notes || "Manually added", source: "manual",
        sheet_pushed: true, sheet_pushed_at: new Date().toISOString(),
      } as any).select().single();
      if (error) return ok({ success: false, error: error.message });
      const result = await pushEventToSheet(accessToken, sheetId, tabs, inserted, supabase);
      try { await rebuildSummarySheet(accessToken, sheetId, tabs, supabase); } catch (_) {}
      return ok({ success: true, event: inserted, ...result });
    }

    if (action === "update_design") {
      // Full rebuild with new colors
      const result = await setupSheets(accessToken, sheetId, supabase);
      return ok({ success: true, message: "Design updated with light colors", ...result });
    }

    return ok({ success: false, error: "Invalid action" });
  } catch (error: any) {
    console.error("Google Sheets sync error:", error);
    return ok({ success: false, error: error.message });
  }
});
