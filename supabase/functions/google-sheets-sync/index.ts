import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
const SHEET_HEADERS = [
  "DATE","VENUE","TIME","ARTIST NAME","PAYMENT STATUS","PENDING AMOUNT",
  "BOOKING ID","CLIENT NAME","MOBILE","EMAIL","CITY","STATE",
  "EVENT TYPE","BOOKING STATUS","TOTAL PRICE","SOURCE","ADDRESS",
];

function ok(body: any) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 500) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getMonthTabName(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

async function getAccessToken(serviceAccountKey: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  };
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
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

/* ── retry wrapper for Google API calls (handles 429) ── */
async function fetchWithRetry(url: string, opts: RequestInit = {}, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429 && attempt < retries - 1) {
      const wait = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
      console.warn(`Rate limited (429), retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return res;
  }
  throw new Error("Max retries exceeded");
}

async function getSheetTabs(accessToken: string, sheetId: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
  const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Failed to get sheet info: ${await res.text()}`);
  const data = await res.json();
  return (data.sheets || []).map((s: any) => ({ title: s.properties.title, sheetId: s.properties.sheetId }));
}

async function readSheet(accessToken: string, sheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Read failed: ${await res.text()}`);
  return await res.json();
}

async function batchReadSheets(accessToken: string, sheetId: string, ranges: string[]) {
  if (ranges.length === 0) return [];
  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${params}`;
  const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Batch read failed: ${await res.text()}`);
  const data = await res.json();
  return data.valueRanges || [];
}

async function updateSheet(accessToken: string, sheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetchWithRetry(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Update failed: ${await res.text()}`);
  return await res.json();
}

async function insertRowAfter(accessToken: string, spreadsheetId: string, tabSheetId: number, afterRowIndex: number) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        insertDimension: {
          range: { sheetId: tabSheetId, dimension: "ROWS", startIndex: afterRowIndex, endIndex: afterRowIndex + 1 },
          inheritFromBefore: true,
        }
      }]
    }),
  });
  if (!res.ok) throw new Error(`Insert row failed: ${await res.text()}`);
}

async function deleteSheetRow(accessToken: string, spreadsheetId: string, tabSheetId: number, rowIndex: number) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: tabSheetId, dimension: "ROWS", startIndex: rowIndex - 1, endIndex: rowIndex }
        }
      }]
    }),
  });
  if (!res.ok) throw new Error(`Delete row failed: ${await res.text()}`);
}

function findTab(tabs: {title: string, sheetId: number}[], targetName: string) {
  return tabs.find(t => t.title.trim().toUpperCase() === targetName.trim().toUpperCase());
}

function findDateRow(rows: any[][], dayNumber: number): { dateRow: number; lastGroupRow: number; isEmpty: boolean } {
  const dayStr = String(dayNumber);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.[0]?.toString().trim() === dayStr) {
      let lastRow = i;
      for (let j = i + 1; j < rows.length; j++) {
        const cellA = rows[j]?.[0]?.toString().trim() || "";
        if (cellA === "" && (rows[j]?.[1] || rows[j]?.[2])) {
          lastRow = j;
        } else {
          break;
        }
      }
      const isEmpty = !rows[i]?.[1] && !rows[i]?.[2];
      return { dateRow: i + 1, lastGroupRow: lastRow + 1, isEmpty };
    }
  }
  return { dateRow: -1, lastGroupRow: -1, isEmpty: true };
}

function parseMonthKeyFromTab(title: string): string | null {
  const normalized = title.trim().toUpperCase();
  const match = normalized.match(/^([A-Z]+)\s+(\d{4})$/);
  if (!match) return null;
  const monthIndex = MONTHS.indexOf(match[1]);
  if (monthIndex < 0) return null;
  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function formatPaymentStatus(event: any): string {
  const ps = event.payment_status || "pending";
  const status = event.status || "";
  if (status === "completed" || ps === "fully_paid" || ps === "full_paid") return `✅ Full Paid ₹${(event.total_price || 0).toLocaleString("en-IN")}`;
  if (ps === "confirmed" || ps === "paid") return `Advance ₹${(event.advance_amount || 0).toLocaleString("en-IN")}`;
  return ps.charAt(0).toUpperCase() + ps.slice(1);
}

function formatPendingAmount(event: any): string {
  const remaining = (event.total_price || 0) - (event.advance_amount || 0);
  if (remaining <= 0) return "Nil";
  return `₹${remaining.toLocaleString("en-IN")}`;
}

function formatTime(t: string): string {
  if (!t) return "";
  const parts = t.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return t;
}

function getTimeLabel(startTime: string): string {
  if (!startTime) return "Morning";
  const hour = parseInt(startTime.split(":")[0], 10);
  if (isNaN(hour)) return "Morning";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function countSheetEvents(rows: any[][]): number {
  let currentDay = "";
  let count = 0;
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i] || [];
    const firstCell = row[0]?.toString().trim() || "";
    if (firstCell) currentDay = firstCell;
    const hasEventData = row.slice(1).some((cell: any) => {
      const value = cell?.toString().trim() || "";
      return value.length > 0;
    });
    if (currentDay && hasEventData) count += 1;
  }
  return count;
}

function formatSheetRow(event: any, includeDate: boolean, label?: string, artistNames?: string[]): any[] {
  const startTime = formatTime(event.event_start_time || "");
  const endTime = formatTime(event.event_end_time || "");
  const timeStr = startTime && endTime ? `${startTime} - ${endTime}` : (startTime || getTimeLabel(event.event_start_time || ""));
  // Venue = city name only (short)
  const venueRaw = event.city || event.venue_name || "";
  const venueWithLabel = label ? `${venueRaw} (${label})` : venueRaw;
  // Artist names display - use actual names if available, else count
  const artistCount = event.artist_count || 1;
  let artistLabel: string;
  if (artistNames && artistNames.length > 0) {
    artistLabel = artistNames.join(", ");
  } else {
    artistLabel = artistCount === 1 ? "1 Artist" : `${artistCount} Artists`;
  }
  return [
    includeDate ? String(new Date(event.event_date).getDate()) : "",
    venueWithLabel,
    timeStr,
    artistLabel,
    formatPaymentStatus(event),
    formatPendingAmount(event),
    event.id || "",
    event.client_name || "",
    event.client_mobile || "",
    event.client_email || "",
    event.city || "",
    event.state || "",
    event.event_type || "",
    event.status || "",
    event.total_price ? `₹${Number(event.total_price).toLocaleString("en-IN")}` : "",
    event.source || "website",
    event.full_address || event.address || "",
  ];
}

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function ensureSheetHeaders(accessToken: string, spreadsheetId: string, tabTitle: string, tabSheetId?: number) {
  await updateSheet(accessToken, spreadsheetId, `'${tabTitle}'!A3:Q3`, [SHEET_HEADERS]);
  // Auto-resize columns with proper widths
  if (tabSheetId !== undefined) {
    const colWidths = [50, 120, 130, 150, 160, 110, 100, 140, 120, 180, 90, 90, 100, 110, 100, 80, 200];
    const requests: any[] = [];
    colWidths.forEach((px, i) => {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId: tabSheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: px },
          fields: "pixelSize",
        },
      });
    });
    // Bold + background for header row (row 3 = index 2)
    requests.push({
      repeatCell: {
        range: { sheetId: tabSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 17 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.16, green: 0.16, blue: 0.2 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            padding: { top: 4, bottom: 4, left: 4, right: 4 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)",
      },
    });
    // Freeze header rows
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: tabSheetId, gridProperties: { frozenRowCount: 3 } },
        fields: "gridProperties.frozenRowCount",
      },
    });
    try {
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      });
    } catch (e: any) {
      console.warn("Column formatting failed (non-fatal):", e.message);
    }
  }
}

async function fetchArtistNames(supabase: any, eventId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("event_artist_assignments")
      .select("artist_id, artists(name)")
      .eq("event_id", eventId);
    if (data && data.length > 0) {
      return data.map((a: any) => a.artists?.name).filter(Boolean);
    }
  } catch (_) {}
  return [];
}

async function pushEventToSheet(
  accessToken: string, spreadsheetId: string,
  tabs: {title: string, sheetId: number}[],
  event: any, label: string, supabase?: any
) {
  const tabName = getMonthTabName(event.event_date);
  const tab = findTab(tabs, tabName);
  if (!tab) throw new Error(`Sheet tab "${tabName}" not found. Please create it manually.`);

  await ensureSheetHeaders(accessToken, spreadsheetId, tab.title, tab.sheetId);

  // Fetch artist names if supabase client available
  let artistNames: string[] = [];
  if (supabase && event.id) {
    artistNames = await fetchArtistNames(supabase, event.id);
  }

  const dayNumber = new Date(event.event_date).getDate();
  const data = await readSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:Q500`);
  const rows = data.values || [];

  // Check if event already exists by booking ID in column G (index 6)
  let existingRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.[6] === event.id) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow > 0) {
    const row = formatSheetRow(event, !!rows[existingRow - 1]?.[0]?.toString().trim(), label, artistNames);
    await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A${existingRow}:Q${existingRow}`, [row]);
    return { tab: tab.title, action: "updated", row: existingRow };
  }

  const { dateRow, lastGroupRow, isEmpty } = findDateRow(rows, dayNumber);
  if (dateRow < 0) throw new Error(`Date ${dayNumber} not found in ${tab.title}`);

  if (isEmpty) {
    const row = formatSheetRow(event, true, label, artistNames);
    row[0] = String(dayNumber);
    await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A${dateRow}:Q${dateRow}`, [row]);
    return { tab: tab.title, action: "written", row: dateRow };
  } else {
    await insertRowAfter(accessToken, spreadsheetId, tab.sheetId, lastGroupRow);
    const row = formatSheetRow(event, false, label, artistNames);
    await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A${lastGroupRow + 1}:Q${lastGroupRow + 1}`, [row]);
    return { tab: tab.title, action: "inserted", row: lastGroupRow + 1 };
  }
}

async function removeEventFromSheet(
  accessToken: string, spreadsheetId: string,
  tabs: {title: string, sheetId: number}[],
  event: any
) {
  const tabName = getMonthTabName(event.event_date);
  const tab = findTab(tabs, tabName);
  if (!tab) return { removed: false };

  const data = await readSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:Q500`);
  const rows = data.values || [];

  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.[6] === event.id) {
      const rowIndex = i + 1;
      const hasDateNumber = !!rows[i]?.[0]?.toString().trim();
      if (hasDateNumber) {
        await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!B${rowIndex}:Q${rowIndex}`, [["","","","","","","","","","","","","","","",""]]);
      } else {
        await deleteSheetRow(accessToken, spreadsheetId, tab.sheetId, rowIndex);
      }
      return { removed: true, row: rowIndex };
    }
  }
  return { removed: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceAccountKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
    if (!serviceAccountKeyRaw || !sheetId) return err("Google Sheets credentials not configured", 200);

    const serviceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);

    let tabs: {title: string, sheetId: number}[];
    try {
      tabs = await getSheetTabs(accessToken, sheetId);
    } catch (e: any) {
      // Return 200 with error info so frontend doesn't break
      console.error("Sheet tabs error:", e.message);
      return ok({ success: false, error: e.message, tabs: {}, tabNames: [], tabSummaries: [] });
    }

    const body = await req.json();
    const { action, event_data, event_id } = body;
    const supabase = getSupabaseClient();

    /* ── read_all: single call that returns ALL tab data + summaries ── */
    if (action === "read_all") {
      const allData: Record<string, any[][]> = {};
      const summaries: any[] = [];

      // Use batchGet to read all tabs in ONE API call
      const ranges = tabs.map((t) => `'${t.title}'!A1:Q500`);
      try {
        const batchResults = await batchReadSheets(accessToken, sheetId, ranges);
        for (let i = 0; i < tabs.length; i++) {
          const tab = tabs[i];
          const rows = batchResults[i]?.values || [];
          allData[tab.title] = rows;
          summaries.push({
            title: tab.title,
            sheetId: tab.sheetId,
            normalizedTitle: tab.title.trim(),
            monthKey: parseMonthKeyFromTab(tab.title),
            eventCount: countSheetEvents(rows),
          });
        }
      } catch (e: any) {
        console.warn("Batch read failed, falling back:", e.message);
        // Fallback: read one by one
        for (const tab of tabs) {
          try {
            const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:Q500`);
            const rows = data.values || [];
            allData[tab.title] = rows;
            summaries.push({
              title: tab.title, sheetId: tab.sheetId,
              normalizedTitle: tab.title.trim(),
              monthKey: parseMonthKeyFromTab(tab.title),
              eventCount: countSheetEvents(rows),
            });
          } catch (_) {
            summaries.push({
              title: tab.title, sheetId: tab.sheetId,
              normalizedTitle: tab.title.trim(),
              monthKey: parseMonthKeyFromTab(tab.title),
              eventCount: 0,
            });
          }
        }
      }

      return ok({
        success: true,
        tabs: allData,
        tabNames: tabs.map((t) => t.title),
        tabSummaries: summaries,
      });
    }

    // Legacy endpoints kept for backwards compat
    if (action === "read_overview") {
      const summaries = [];
      const ranges = tabs.map((t) => `'${t.title}'!A1:Q500`);
      try {
        const batchResults = await batchReadSheets(accessToken, sheetId, ranges);
        for (let i = 0; i < tabs.length; i++) {
          const rows = batchResults[i]?.values || [];
          summaries.push({
            title: tabs[i].title, sheetId: tabs[i].sheetId,
            normalizedTitle: tabs[i].title.trim(),
            monthKey: parseMonthKeyFromTab(tabs[i].title),
            eventCount: countSheetEvents(rows),
          });
        }
      } catch (_) {
        for (const tab of tabs) {
          summaries.push({ title: tab.title, sheetId: tab.sheetId, normalizedTitle: tab.title.trim(), monthKey: parseMonthKeyFromTab(tab.title), eventCount: 0 });
        }
      }
      return ok({ success: true, tabNames: tabs.map((t) => t.title), tabSummaries: summaries });
    }

    if (action === "read_tab") {
      const requestedTab = typeof body.tab_name === "string" ? body.tab_name : "";
      if (!requestedTab) return err("Tab name is required", 200);
      const tab = findTab(tabs, requestedTab);
      if (!tab) return ok({ success: false, error: `Sheet tab "${requestedTab}" not found` });
      const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:Q500`);
      return ok({ success: true, tabName: tab.title, rows: data.values || [] });
    }

    if (action === "read") {
      const allData: Record<string, any[][]> = {};
      const ranges = tabs.map((t) => `'${t.title}'!A1:Q500`);
      try {
        const batchResults = await batchReadSheets(accessToken, sheetId, ranges);
        for (let i = 0; i < tabs.length; i++) {
          allData[tabs[i].title] = batchResults[i]?.values || [];
        }
      } catch (_) {
        for (const tab of tabs) {
          try {
            const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:Q500`);
            allData[tab.title] = data.values || [];
          } catch (__) {}
        }
      }
      return ok({ success: true, tabs: allData, tabNames: tabs.map(t => t.title) });
    }

    // PUSH SINGLE EVENT
    if (action === "push_single" && event_id) {
      const { data: event, error } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (error || !event) return ok({ success: false, error: "Event not found" });
      const result = await pushEventToSheet(accessToken, sheetId, tabs, event, "web pushed", supabase);
      await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_id);
      return ok({ success: true, ...result });
    }

    // UPDATE SINGLE EVENT
    if (action === "update_pushed" && event_id) {
      const { data: event, error } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (error || !event) return ok({ success: false, error: "Event not found" });
      const result = await pushEventToSheet(accessToken, sheetId, tabs, event, "web pushed", supabase);
      await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_id);
      return ok({ success: true, ...result });
    }

    // DELETE FROM SHEET
    if (action === "delete_from_sheet" && event_id) {
      const { data: event } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (!event) return ok({ success: false, error: "Event not found" });
      const result = await removeEventFromSheet(accessToken, sheetId, tabs, event);
      await supabase.from("event_bookings").update({ sheet_pushed: false, sheet_pushed_at: null } as any).eq("id", event_id);
      return ok({ success: true, ...result });
    }

    // SYNC ALL - only push events NOT already pushed
    if (action === "sync_all") {
      const { data: events, error } = await supabase.from("event_bookings").select("*").or("sheet_pushed.is.null,sheet_pushed.eq.false").order("event_date", { ascending: true });
      if (error) return ok({ success: false, error: error.message });

      let totalSynced = 0;
      let totalSkipped = 0;
      for (const event of (events || [])) {
        try {
          await pushEventToSheet(accessToken, sheetId, tabs, event, "web pushed", supabase);
          await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event.id);
          totalSynced++;
        } catch (e: any) {
          console.warn(`Failed to push event ${event.id}: ${e.message}`);
          totalSkipped++;
        }
      }
      return ok({ success: true, synced: totalSynced, skipped: totalSkipped });
    }

    // APPEND EVENT (from DB trigger)
    if (action === "append_event" && event_data) {
      try {
        await pushEventToSheet(accessToken, sheetId, tabs, event_data, "web pushed", supabase);
        if (event_data.id) {
          await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_data.id);
        }
      } catch (e: any) {
        console.warn("Auto-push failed (non-fatal):", e.message);
      }
      return ok({ success: true });
    }

    // UPDATE EVENT (from DB trigger)
    if (action === "update_event" && event_data && event_id) {
      try {
        await pushEventToSheet(accessToken, sheetId, tabs, { ...event_data, id: event_id }, "web pushed", supabase);
      } catch (e: any) {
        console.warn("Auto-update failed (non-fatal):", e.message);
      }
      return ok({ success: true });
    }

    // ADD MANUAL EVENT
    if (action === "add_manual_event" && event_data) {
      const { data: inserted, error } = await supabase.from("event_bookings").insert({
        event_date: event_data.event_date,
        venue_name: event_data.venue_name || null,
        event_start_time: event_data.event_start_time || null,
        event_end_time: event_data.event_end_time || null,
        client_name: event_data.client_name || "Manual Entry",
        client_mobile: event_data.client_mobile || "",
        client_email: event_data.client_email || "",
        city: event_data.city || "",
        state: event_data.state || "",
        event_type: event_data.event_type || "other",
        artist_count: event_data.artist_count || 1,
        total_price: event_data.total_price || 0,
        advance_amount: event_data.advance_amount || 0,
        status: event_data.status || "confirmed",
        payment_status: event_data.payment_status || "pending",
        notes: event_data.notes || "Manually added",
        source: "manual",
        sheet_pushed: true,
        sheet_pushed_at: new Date().toISOString(),
      } as any).select().single();
      if (error) return ok({ success: false, error: error.message });

      const result = await pushEventToSheet(accessToken, sheetId, tabs, inserted, "manual", supabase);
      return ok({ success: true, event: inserted, ...result });
    }

    return ok({ success: false, error: "Invalid action" });
  } catch (error: any) {
    console.error("Google Sheets sync error:", error);
    // Always return 200 so frontend doesn't get network errors
    return ok({ success: false, error: error.message });
  }
});
