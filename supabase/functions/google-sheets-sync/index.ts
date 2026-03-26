import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SHEET_HEADERS = [
  "Booking ID",
  "Event Date",
  "Venue",
  "Artist Assigned",
  "Total Amount",
  "Advance Paid",
  "Remaining Amount",
  "Full Address",
  "Customer Name",
  "Phone Number",
  "Email",
  "Event Type",
  "Number of Artists",
  "Duration (Hours)",
  "Payment Status",
  "Booking Status",
  "Lead Source",
  "Date of Booking",
  "Package / Service",
  "Notes",
  "Created At",
];

const COL_COUNT = SHEET_HEADERS.length; // 21

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
  const normalized = title.trim();
  const match = normalized.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
  if (monthIndex < 0) return null;
  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
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
  return (data.sheets || []).map((s: any) => ({ title: s.properties.title, sheetId: s.properties.sheetId }));
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

async function appendSheet(accessToken: string, sheetId: string, range: string, values: any[][]) {
  const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Append failed: ${await res.text()}`);
  return await res.json();
}

async function deleteSheetRow(accessToken: string, spreadsheetId: string, tabSheetId: number, rowIndex: number) {
  await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: tabSheetId, dimension: "ROWS", startIndex: rowIndex - 1, endIndex: rowIndex } } }] }),
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

// ── Format a row for the new rearranged 21-column structure ──
// Order: Booking ID | Event Date | Venue | Artist | Total | Advance | Remaining | Full Address | Name | Phone | Email | Event Type | Artist Count | Duration | Payment Status | Booking Status | Lead Source | Date of Booking | Package | Notes | Created At
function formatSheetRow(event: any, artistNames: string[]): any[] {
  const totalPrice = Number(event.total_price) || 0;
  const advancePaid = Number(event.advance_amount) || 0;
  const negotiatedTotal = event.negotiated ? (Number(event.negotiated_total) || totalPrice) : totalPrice;
  const negotiatedAdvance = event.negotiated ? (Number(event.negotiated_advance) || advancePaid) : advancePaid;

  const ps = event.payment_status || "pending";
  const status = event.status || "upcoming";
  let paymentLabel = "Pending";
  if (status === "completed" || ps === "fully_paid" || ps === "full_paid") paymentLabel = "Paid";
  else if (ps === "confirmed" || ps === "paid" || ps === "partial") paymentLabel = "Partial";

  let bookingStatus = "New";
  if (status === "completed") bookingStatus = "Completed";
  else if (status === "cancelled") bookingStatus = "Cancelled";
  else if (ps === "confirmed" || ps === "paid" || ps === "fully_paid" || ps === "partial") bookingStatus = "Confirmed";

  const artistLabel = artistNames.length > 0 ? artistNames.join(", ") : (event.artist_count === 1 ? "1 Artist" : `${event.artist_count || 1} Artists`);

  const startTime = event.event_start_time || "";
  const endTime = event.event_end_time || "";
  let durationHours = "";
  if (startTime && endTime) {
    const sP = startTime.split(":").map(Number);
    const eP = endTime.split(":").map(Number);
    if (sP.length >= 2 && eP.length >= 2) {
      const diff = (eP[0] * 60 + eP[1]) - (sP[0] * 60 + sP[1]);
      durationHours = diff > 0 ? String(Math.round(diff / 60 * 10) / 10) : "";
    }
  }

  const venueStr = [event.city, event.venue_name].filter(Boolean).join(" - ");
  const fullAddress = event.full_address || [event.venue_name, event.city, event.state, event.pincode].filter(Boolean).join(", ");

  return [
    event.id || "",                                                             // A: Booking ID
    event.event_date || "",                                                     // B: Event Date
    venueStr,                                                                   // C: Venue
    artistLabel,                                                                // D: Artist Assigned
    negotiatedTotal,                                                            // E: Total Amount (raw number)
    negotiatedAdvance,                                                          // F: Advance Paid (raw number)
    `=IF(E{ROW}-F{ROW}<0,0,E{ROW}-F{ROW})`,                                   // G: Remaining Amount (formula)
    fullAddress,                                                                // H: Full Address
    event.client_name || "",                                                    // I: Customer Name
    event.client_mobile || "",                                                  // J: Phone Number
    event.client_email || "",                                                   // K: Email
    event.event_type || "",                                                     // L: Event Type
    String(event.artist_count || 1),                                            // M: Number of Artists
    durationHours,                                                              // N: Duration
    paymentLabel,                                                               // O: Payment Status
    bookingStatus,                                                              // P: Booking Status
    event.source || "Website",                                                  // Q: Lead Source
    event.created_at ? new Date(event.created_at).toLocaleDateString("en-IN") : "", // R: Date of Booking
    event.is_international ? "International" : (event.is_mumbai ? "Mumbai Package" : "Pan India"), // S: Package
    event.notes || "",                                                          // T: Notes
    event.created_at ? new Date(event.created_at).toLocaleString("en-IN") : "", // U: Created At
  ];
}

// Fix remaining amount formula with actual row number
function fixRowFormulas(row: any[], rowNum: number): any[] {
  return row.map(cell => {
    if (typeof cell === "string" && cell.includes("{ROW}")) {
      return cell.replace(/\{ROW\}/g, String(rowNum));
    }
    return cell;
  });
}

// ── Setup all monthly sheets with light formatting ──
async function setupSheets(accessToken: string, spreadsheetId: string) {
  const existingTabs = await getSheetTabs(accessToken, spreadsheetId);
  const tabsToCreate: string[] = [];

  for (let year = 2026; year <= 2027; year++) {
    const startMonth = year === 2026 ? 3 : 0;
    for (let m = startMonth; m < 12; m++) {
      const name = `${MONTHS[m]} ${year}`;
      if (!findTab(existingTabs, name)) tabsToCreate.push(name);
    }
  }

  if (tabsToCreate.length === 0) return { created: 0, message: "All tabs already exist" };

  const requests: any[] = tabsToCreate.map((title, i) => ({
    addSheet: { properties: { title, index: i } },
  }));

  const createRes = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!createRes.ok) throw new Error(`Failed to create tabs: ${await createRes.text()}`);

  const createData = await createRes.json();
  const newTabIds: Record<string, number> = {};
  (createData.replies || []).forEach((r: any, i: number) => {
    if (r.addSheet?.properties) newTabIds[tabsToCreate[i]] = r.addSheet.properties.sheetId;
  });

  const headerValues = [SHEET_HEADERS];
  for (const tabName of tabsToCreate) {
    await updateSheet(accessToken, spreadsheetId, `'${tabName}'!A1:U1`, headerValues);
  }

  // Apply light premium formatting
  const formatRequests: any[] = [];
  for (const tabName of tabsToCreate) {
    const sid = newTabIds[tabName];
    if (sid === undefined) continue;

    // Header styling - soft teal/sage with dark text
    formatRequests.push({
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: COL_COUNT },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.85, green: 0.93, blue: 0.91 },
            textFormat: { bold: true, foregroundColor: { red: 0.15, green: 0.22, blue: 0.25 }, fontSize: 10, fontFamily: "Google Sans" },
            horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
            padding: { top: 6, bottom: 6, left: 4, right: 4 },
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding,wrapStrategy)",
      },
    });

    formatRequests.push({
      updateSheetProperties: {
        properties: { sheetId: sid, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    });

    // Column widths (rearranged)
    const widths = [240, 100, 180, 180, 110, 110, 120, 250, 160, 130, 200, 110, 80, 80, 100, 100, 100, 110, 140, 220, 160];
    widths.forEach((px, i) => {
      formatRequests.push({
        updateDimensionProperties: {
          range: { sheetId: sid, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: px }, fields: "pixelSize",
        },
      });
    });

    // Light alternating row colors
    formatRequests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: sid, startRowIndex: 0, endRowIndex: 100, startColumnIndex: 0, endColumnIndex: COL_COUNT },
          rowProperties: {
            headerColor: { red: 0.85, green: 0.93, blue: 0.91 },
            firstBandColor: { red: 1, green: 1, blue: 1 },
            secondBandColor: { red: 0.96, green: 0.98, blue: 0.97 },
          },
        },
      },
    });

    // Payment Status dropdown (column O = index 14)
    formatRequests.push({
      setDataValidation: {
        range: { sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 14, endColumnIndex: 15 },
        rule: {
          condition: { type: "ONE_OF_LIST", values: [{ userEnteredValue: "Pending" }, { userEnteredValue: "Partial" }, { userEnteredValue: "Paid" }] },
          showCustomUi: true, strict: false,
        },
      },
    });

    // Booking Status dropdown (column P = index 15)
    formatRequests.push({
      setDataValidation: {
        range: { sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 15, endColumnIndex: 16 },
        rule: {
          condition: { type: "ONE_OF_LIST", values: [{ userEnteredValue: "New" }, { userEnteredValue: "Confirmed" }, { userEnteredValue: "Completed" }, { userEnteredValue: "Cancelled" }] },
          showCustomUi: true, strict: false,
        },
      },
    });

    // Lead Source dropdown (column Q = index 16)
    formatRequests.push({
      setDataValidation: {
        range: { sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 16, endColumnIndex: 17 },
        rule: {
          condition: { type: "ONE_OF_LIST", values: [{ userEnteredValue: "Instagram" }, { userEnteredValue: "WhatsApp" }, { userEnteredValue: "Website" }, { userEnteredValue: "Referral" }, { userEnteredValue: "Manual" }] },
          showCustomUi: true, strict: false,
        },
      },
    });

    // Conditional: Pending = soft red
    formatRequests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 14, endColumnIndex: 15 }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Pending" }] },
            format: { backgroundColor: { red: 0.98, green: 0.88, blue: 0.88 }, textFormat: { foregroundColor: { red: 0.7, green: 0.15, blue: 0.15 }, bold: true } },
          },
        },
        index: 0,
      },
    });

    // Conditional: Paid = soft green
    formatRequests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 14, endColumnIndex: 15 }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Paid" }] },
            format: { backgroundColor: { red: 0.86, green: 0.95, blue: 0.87 }, textFormat: { foregroundColor: { red: 0.15, green: 0.55, blue: 0.2 }, bold: true } },
          },
        },
        index: 1,
      },
    });

    // Conditional: Partial = soft amber
    formatRequests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 14, endColumnIndex: 15 }],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "Partial" }] },
            format: { backgroundColor: { red: 1, green: 0.95, blue: 0.85 }, textFormat: { foregroundColor: { red: 0.75, green: 0.5, blue: 0.05 }, bold: true } },
          },
        },
        index: 2,
      },
    });

    // Number format for Total (E) and Advance (F) columns - Indian Rupee
    formatRequests.push({
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 1, endRowIndex: 200, startColumnIndex: 4, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: "₹#,##0" },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    });
  }

  if (formatRequests.length) {
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: formatRequests }),
    });
  }

  return { created: tabsToCreate.length, tabs: tabsToCreate };
}

// ── Push event to sheet ──
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
    await updateSheet(accessToken, spreadsheetId, `'${tabName}'!A1:U1`, [SHEET_HEADERS]);
  }

  let artistNames: string[] = [];
  if (supabase && event.id) artistNames = await fetchArtistNames(supabase, event.id);

  const data = await readSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:U500`);
  const rows = data.values || [];

  let existingRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]?.[0] === event.id) { existingRow = i + 1; break; }
  }

  const row = formatSheetRow(event, artistNames);

  if (existingRow > 0) {
    const fixed = fixRowFormulas(row, existingRow);
    await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A${existingRow}:U${existingRow}`, [fixed]);
    return { tab: tab.title, action: "updated", row: existingRow };
  } else {
    const nextRow = rows.length + 1;
    const fixed = fixRowFormulas(row, nextRow);
    await appendSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:U1`, [fixed]);
    return { tab: tab.title, action: "appended", row: nextRow };
  }
}

async function removeEventFromSheet(accessToken: string, spreadsheetId: string, tabs: { title: string; sheetId: number }[], event: any) {
  const tabName = getMonthTabName(event.event_date);
  const tab = findTab(tabs, tabName);
  if (!tab) return { removed: false };

  const data = await readSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:U500`);
  const rows = data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]?.[0] === event.id) {
      await deleteSheetRow(accessToken, spreadsheetId, tab.sheetId, i + 1);
      return { removed: true, row: i + 1 };
    }
  }
  return { removed: false };
}

function countSheetEvents(rows: any[][]): number {
  return Math.max(0, rows.length - 1);
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
      const result = await setupSheets(accessToken, sheetId);
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
      return ok({ success: true, ...result });
    }

    if (action === "delete_from_sheet" && event_id) {
      const { data: event } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (!event) return ok({ success: false, error: "Event not found" });
      const result = await removeEventFromSheet(accessToken, sheetId, tabs, event);
      await supabase.from("event_bookings").update({ sheet_pushed: false, sheet_pushed_at: null } as any).eq("id", event_id);
      return ok({ success: true, ...result });
    }

    if (action === "sync_all") {
      const { data: events, error } = await supabase.from("event_bookings").select("*").or("sheet_pushed.is.null,sheet_pushed.eq.false").order("event_date", { ascending: true });
      if (error) return ok({ success: false, error: error.message });

      let totalSynced = 0, totalSkipped = 0;
      for (const event of (events || [])) {
        try {
          await pushEventToSheet(accessToken, sheetId, tabs, event, supabase);
          await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event.id);
          totalSynced++;
        } catch (e: any) {
          console.warn(`Failed to push event ${event.id}: ${e.message}`);
          totalSkipped++;
        }
      }
      return ok({ success: true, synced: totalSynced, skipped: totalSkipped });
    }

    if (action === "append_event" && event_data) {
      try {
        await pushEventToSheet(accessToken, sheetId, tabs, event_data, supabase);
        if (event_data.id) await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_data.id);
      } catch (e: any) { console.warn("Auto-push failed:", e.message); }
      return ok({ success: true });
    }

    if (action === "update_event" && event_data && event_id) {
      try {
        await pushEventToSheet(accessToken, sheetId, tabs, { ...event_data, id: event_id }, supabase);
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
      return ok({ success: true, event: inserted, ...result });
    }

    if (action === "update_design") {
      const formatReqs: any[] = [];
      for (const tab of tabs) {
        // Update headers to new column order
        formatReqs.push({
          repeatCell: {
            range: { sheetId: tab.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: COL_COUNT },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.85, green: 0.93, blue: 0.91 },
                textFormat: { bold: true, foregroundColor: { red: 0.15, green: 0.22, blue: 0.25 }, fontSize: 10, fontFamily: "Google Sans" },
                horizontalAlignment: "CENTER", verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        });
      }
      if (formatReqs.length) {
        await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
          method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ requests: formatReqs }),
        });
      }
      // Also update header text for all existing tabs
      for (const tab of tabs) {
        try {
          await updateSheet(accessToken, sheetId, `'${tab.title}'!A1:U1`, [SHEET_HEADERS]);
        } catch (_) {}
      }
      return ok({ success: true, message: "Design & headers updated", tabs: tabs.length });
    }

    return ok({ success: false, error: "Invalid action" });
  } catch (error: any) {
    console.error("Google Sheets sync error:", error);
    return ok({ success: false, error: error.message });
  }
});
