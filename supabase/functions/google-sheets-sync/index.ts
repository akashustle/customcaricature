import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

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

async function getSheetTabs(accessToken: string, sheetId: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Failed to get sheet info: ${await res.text()}`);
  const data = await res.json();
  return (data.sheets || []).map((s: any) => ({ title: s.properties.title, sheetId: s.properties.sheetId }));
}

async function readSheet(accessToken: string, sheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Read failed: ${await res.text()}`);
  return await res.json();
}

async function updateSheet(accessToken: string, sheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Update failed: ${await res.text()}`);
  return await res.json();
}

async function insertRowAfter(accessToken: string, spreadsheetId: string, tabSheetId: number, afterRowIndex: number) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetch(url, {
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
  const res = await fetch(url, {
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

function formatPaymentStatus(event: any): string {
  const ps = event.payment_status || "pending";
  if (ps === "confirmed" || ps === "paid") return `Advance ₹${(event.advance_amount || 0).toLocaleString("en-IN")}`;
  if (ps === "full_paid") return `Full Paid ₹${(event.total_price || 0).toLocaleString("en-IN")}`;
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

function parseSheetEventCount(rows: any[][]): number {
  const value = rows?.[1]?.[1];
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMonthKeyFromTab(title: string): string | null {
  const normalized = title.trim().toUpperCase();
  const match = normalized.match(/^([A-Z]+)\s+(\d{4})$/);
  if (!match) return null;
  const monthIndex = MONTHS.indexOf(match[1]);
  if (monthIndex < 0) return null;
  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
}

async function getTabSummary(accessToken: string, sheetId: string, tab: { title: string; sheetId: number }) {
  const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:B2`);
  const rows = data.values || [];
  return {
    title: tab.title,
    sheetId: tab.sheetId,
    normalizedTitle: tab.title.trim(),
    monthKey: parseMonthKeyFromTab(tab.title),
    eventCount: parseSheetEventCount(rows),
  };
}

// Extended row: [date, venue, time, artist, payment, pending, bookingId, client, mobile, city, eventType, status, totalPrice, source]
function formatSheetRow(event: any, includeDate: boolean, label?: string): any[] {
  const startTime = formatTime(event.event_start_time || "");
  const endTime = formatTime(event.event_end_time || "");
  const timeStr = startTime && endTime ? `${startTime} - ${endTime}` : startTime;
  const venueName = event.venue_name || "";
  const venueWithLabel = label ? `${venueName} (${label})` : venueName;
  return [
    includeDate ? String(new Date(event.event_date).getDate()) : "",
    venueWithLabel,
    timeStr,
    "",
    formatPaymentStatus(event),
    formatPendingAmount(event),
    event.id || "",
    event.client_name || "",
    event.client_mobile || "",
    event.city || "",
    event.event_type || "",
    event.status || "",
    event.total_price ? `₹${Number(event.total_price).toLocaleString("en-IN")}` : "",
    event.source || "website",
  ];
}

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function pushEventToSheet(
  accessToken: string, spreadsheetId: string,
  tabs: {title: string, sheetId: number}[],
  event: any, label: string
) {
  const tabName = getMonthTabName(event.event_date);
  const tab = findTab(tabs, tabName);
  if (!tab) throw new Error(`Sheet tab "${tabName}" not found. Please create it manually.`);

  const dayNumber = new Date(event.event_date).getDate();
  const data = await readSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:N500`);
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
    const row = formatSheetRow(event, !!rows[existingRow - 1]?.[0]?.toString().trim(), label);
    await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A${existingRow}:N${existingRow}`, [row]);
    return { tab: tab.title, action: "updated", row: existingRow };
  }

  const { dateRow, lastGroupRow, isEmpty } = findDateRow(rows, dayNumber);
  if (dateRow < 0) throw new Error(`Date ${dayNumber} not found in ${tab.title}`);

  if (isEmpty) {
    const row = formatSheetRow(event, true, label);
    row[0] = String(dayNumber);
    await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A${dateRow}:N${dateRow}`, [row]);
    return { tab: tab.title, action: "written", row: dateRow };
  } else {
    await insertRowAfter(accessToken, spreadsheetId, tab.sheetId, lastGroupRow);
    const row = formatSheetRow(event, false, label);
    await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!A${lastGroupRow + 1}:N${lastGroupRow + 1}`, [row]);
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

  const data = await readSheet(accessToken, spreadsheetId, `'${tab.title}'!A1:N500`);
  const rows = data.values || [];

  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.[6] === event.id) {
      const rowIndex = i + 1;
      const hasDateNumber = !!rows[i]?.[0]?.toString().trim();
      if (hasDateNumber) {
        await updateSheet(accessToken, spreadsheetId, `'${tab.title}'!B${rowIndex}:N${rowIndex}`, [["","","","","","","","","","","","",""]]);
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
    if (!serviceAccountKeyRaw || !sheetId) throw new Error("Google Sheets credentials not configured");

    const serviceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);
    const tabs = await getSheetTabs(accessToken, sheetId);

    const body = await req.json();
    const { action, event_data, event_id } = body;
    const supabase = getSupabaseClient();

    if (action === "read_overview") {
      const summaries = [];
      for (const tab of tabs) {
        try {
          summaries.push(await getTabSummary(accessToken, sheetId, tab));
        } catch (_) {
          summaries.push({ title: tab.title, sheetId: tab.sheetId, normalizedTitle: tab.title.trim(), monthKey: parseMonthKeyFromTab(tab.title), eventCount: 0 });
        }
      }
      return new Response(JSON.stringify({ success: true, tabNames: tabs.map((t) => t.title), tabSummaries: summaries }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "read_tab") {
      const requestedTab = typeof body.tab_name === "string" ? body.tab_name : "";
      if (!requestedTab) throw new Error("Tab name is required");
      const tab = findTab(tabs, requestedTab);
      if (!tab) throw new Error(`Sheet tab "${requestedTab}" not found`);
      const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:N500`);
      return new Response(JSON.stringify({ success: true, tabName: tab.title, rows: data.values || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "read") {
      const allData: Record<string, any[][]> = {};
      for (const tab of tabs) {
        try {
          const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:N500`);
          allData[tab.title] = data.values || [];
        } catch (_) {}
      }
      return new Response(JSON.stringify({ success: true, tabs: allData, tabNames: tabs.map(t => t.title) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUSH SINGLE EVENT
    if (action === "push_single" && event_id) {
      const { data: event, error } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (error || !event) throw new Error("Event not found");
      const result = await pushEventToSheet(accessToken, sheetId, tabs, event, "web pushed");
      await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_id);
      return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // UPDATE SINGLE EVENT (partial update - re-reads from DB and updates sheet row)
    if (action === "update_pushed" && event_id) {
      const { data: event, error } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (error || !event) throw new Error("Event not found");
      const result = await pushEventToSheet(accessToken, sheetId, tabs, event, "web pushed");
      await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_id);
      return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE FROM SHEET
    if (action === "delete_from_sheet" && event_id) {
      const { data: event } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (!event) throw new Error("Event not found");
      const result = await removeEventFromSheet(accessToken, sheetId, tabs, event);
      await supabase.from("event_bookings").update({ sheet_pushed: false, sheet_pushed_at: null } as any).eq("id", event_id);
      return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // SYNC ALL - only push events that are NOT already pushed
    if (action === "sync_all") {
      const { data: events, error } = await supabase.from("event_bookings").select("*").or("sheet_pushed.is.null,sheet_pushed.eq.false").order("event_date", { ascending: true });
      if (error) throw error;

      let totalSynced = 0;
      let totalSkipped = 0;
      for (const event of (events || [])) {
        try {
          await pushEventToSheet(accessToken, sheetId, tabs, event, "web pushed");
          await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event.id);
          totalSynced++;
        } catch (e) {
          console.warn(`Failed to push event ${event.id}: ${e.message}`);
          totalSkipped++;
        }
      }
      return new Response(JSON.stringify({ success: true, synced: totalSynced, skipped: totalSkipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // APPEND EVENT (from DB trigger)
    if (action === "append_event" && event_data) {
      try {
        await pushEventToSheet(accessToken, sheetId, tabs, event_data, "web pushed");
        if (event_data.id) {
          await supabase.from("event_bookings").update({ sheet_pushed: true, sheet_pushed_at: new Date().toISOString() } as any).eq("id", event_data.id);
        }
      } catch (e) {
        console.warn("Auto-push failed (non-fatal):", e.message);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // UPDATE EVENT (from DB trigger)
    if (action === "update_event" && event_data && event_id) {
      try {
        await pushEventToSheet(accessToken, sheetId, tabs, { ...event_data, id: event_id }, "web pushed");
      } catch (e) {
        console.warn("Auto-update failed (non-fatal):", e.message);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      if (error) throw error;

      const result = await pushEventToSheet(accessToken, sheetId, tabs, inserted, "manual");
      return new Response(JSON.stringify({ success: true, event: inserted, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
