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
    iat: now,
    exp: now + 3600,
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

async function getSheetTabs(accessToken: string, sheetId: string): Promise<{title: string, sheetId: number}[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Failed to get sheet info: ${await res.text()}`);
  const data = await res.json();
  return (data.sheets || []).map((s: any) => ({ title: s.properties.title, sheetId: s.properties.sheetId }));
}

async function createSheetTab(accessToken: string, spreadsheetId: string, tabTitle: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabTitle } } }] }),
  });
  if (!res.ok) throw new Error(`Create tab failed: ${await res.text()}`);
  return await res.json();
}

async function readSheet(accessToken: string, sheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Read failed: ${err}`);
  }
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

async function appendToSheet(accessToken: string, sheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Append failed: ${await res.text()}`);
  return await res.json();
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

function formatPaymentStatus(event: any): string {
  const ps = event.payment_status || "pending";
  if (ps === "confirmed" || ps === "paid") {
    return `Advance Paid ₹${(event.advance_amount || 0).toLocaleString("en-IN")}`;
  }
  if (ps === "full_paid") return `Full Paid ₹${(event.total_price || 0).toLocaleString("en-IN")}`;
  return ps.charAt(0).toUpperCase() + ps.slice(1);
}

function formatEventRow(event: any, label?: string): any[] {
  const dateObj = new Date(event.event_date);
  const dateStr = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = event.event_start_time && event.event_end_time
    ? `${event.event_start_time} - ${event.event_end_time}`
    : event.event_start_time || "";
  return [
    dateStr,
    event.venue_name || "",
    timeStr,
    "", // Artist Name - filled manually
    formatPaymentStatus(event),
    event.client_name || "",
    event.client_mobile || "",
    event.client_email || "",
    event.city || "",
    event.state || "",
    event.event_type || "",
    String(event.artist_count || 1),
    `₹${(event.total_price || 0).toLocaleString("en-IN")}`,
    `₹${(event.advance_amount || 0).toLocaleString("en-IN")}`,
    event.status || "",
    event.id || "",
    event.notes || "",
    label || event.source || "website",
  ];
}

const HEADERS = ["DATE", "VENUE", "TIME", "ARTIST NAME", "Payment Status", "Client Name", "Mobile", "Email", "City", "State", "Event Type", "Artist Count", "Total Price", "Advance", "Status", "Booking ID", "Notes", "Source"];

async function ensureMonthTab(accessToken: string, spreadsheetId: string, tabName: string, tabs: {title: string, sheetId: number}[]): Promise<{title: string, sheetId: number}> {
  const existing = tabs.find(t => t.title.toUpperCase() === tabName.toUpperCase());
  if (existing) return existing;
  const result = await createSheetTab(accessToken, spreadsheetId, tabName);
  const newSheetId = result.replies?.[0]?.addSheet?.properties?.sheetId || 0;
  // Add headers to new tab
  await updateSheet(accessToken, spreadsheetId, `'${tabName}'!A1`, [
    [`${tabName} - EVENT SCHEDULE`, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `Created: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`],
    HEADERS,
  ]);
  return { title: tabName, sheetId: newSheetId };
}

async function findEventRowInTab(accessToken: string, spreadsheetId: string, tabName: string, eventId: string): Promise<number> {
  try {
    const data = await readSheet(accessToken, spreadsheetId, `'${tabName}'!A1:R500`);
    const rows = data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.[15] === eventId) return i + 1; // 1-indexed
    }
  } catch (_) {}
  return -1;
}

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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

    // READ - read all tabs data
    if (action === "read") {
      const allData: Record<string, any[][]> = {};
      for (const tab of tabs) {
        try {
          const data = await readSheet(accessToken, sheetId, `'${tab.title}'!A1:R500`);
          allData[tab.title] = data.values || [];
        } catch (_) {}
      }
      return new Response(JSON.stringify({ success: true, tabs: allData, tabNames: tabs.map(t => t.title) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUSH SINGLE EVENT to correct month tab
    if (action === "push_single" && event_id) {
      const { data: event, error } = await supabase.from("event_bookings").select("*").eq("id", event_id).single();
      if (error || !event) throw new Error("Event not found");

      const tabName = getMonthTabName(event.event_date);
      const tab = await ensureMonthTab(accessToken, sheetId, tabName, tabs);

      // Check if already exists
      const existingRow = await findEventRowInTab(accessToken, sheetId, tabName, event_id);
      const row = formatEventRow(event, "web pushed");

      if (existingRow > 0) {
        await updateSheet(accessToken, sheetId, `'${tabName}'!A${existingRow}`, [row]);
      } else {
        await appendToSheet(accessToken, sheetId, `'${tabName}'!A1`, [row]);
      }

      // Mark as pushed in DB
      await supabase.from("event_bookings").update({
        sheet_pushed: true,
        sheet_pushed_at: new Date().toISOString(),
      } as any).eq("id", event_id);

      return new Response(JSON.stringify({ success: true, tab: tabName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE from sheet (reverse push) - removes the row from sheet
    if (action === "delete_from_sheet" && event_id) {
      const { data: event } = await supabase.from("event_bookings").select("event_date").eq("id", event_id).single();
      if (!event) throw new Error("Event not found");

      const tabName = getMonthTabName(event.event_date);
      const tab = tabs.find(t => t.title.toUpperCase() === tabName.toUpperCase());
      if (!tab) throw new Error("Sheet tab not found");

      const rowIndex = await findEventRowInTab(accessToken, sheetId, tabName, event_id);
      if (rowIndex > 0) {
        await deleteSheetRow(accessToken, sheetId, tab.sheetId, rowIndex);
      }

      // Mark as not pushed
      await supabase.from("event_bookings").update({
        sheet_pushed: false,
        sheet_pushed_at: null,
      } as any).eq("id", event_id);

      return new Response(JSON.stringify({ success: true, removed: rowIndex > 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SYNC ALL - push all events organized by month tabs
    if (action === "sync_all") {
      const { data: events, error } = await supabase.from("event_bookings").select("*").order("event_date", { ascending: true });
      if (error) throw error;

      // Group events by month
      const byMonth: Record<string, any[]> = {};
      for (const e of (events || [])) {
        const tabName = getMonthTabName(e.event_date);
        if (!byMonth[tabName]) byMonth[tabName] = [];
        byMonth[tabName].push(e);
      }

      let totalSynced = 0;
      for (const [tabName, monthEvents] of Object.entries(byMonth)) {
        const tab = await ensureMonthTab(accessToken, sheetId, tabName, tabs);
        // Don't overwrite existing manual data - only append/update web events
        for (const event of monthEvents) {
          const existingRow = await findEventRowInTab(accessToken, sheetId, tabName, event.id);
          const row = formatEventRow(event, "web pushed");
          if (existingRow > 0) {
            await updateSheet(accessToken, sheetId, `'${tabName}'!A${existingRow}`, [row]);
          } else {
            await appendToSheet(accessToken, sheetId, `'${tabName}'!A1`, [row]);
          }
          totalSynced++;
        }
        // Update pushed status
        const ids = monthEvents.map(e => e.id);
        for (const id of ids) {
          await supabase.from("event_bookings").update({
            sheet_pushed: true,
            sheet_pushed_at: new Date().toISOString(),
          } as any).eq("id", id);
        }
      }

      return new Response(JSON.stringify({ success: true, synced: totalSynced }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // APPEND EVENT (from trigger)
    if (action === "append_event" && event_data) {
      const tabName = getMonthTabName(event_data.event_date);
      await ensureMonthTab(accessToken, sheetId, tabName, tabs);
      const row = formatEventRow(event_data, "web pushed");
      await appendToSheet(accessToken, sheetId, `'${tabName}'!A1`, [row]);

      if (event_data.id) {
        await supabase.from("event_bookings").update({
          sheet_pushed: true,
          sheet_pushed_at: new Date().toISOString(),
        } as any).eq("id", event_data.id);
      }

      return new Response(JSON.stringify({ success: true, tab: tabName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE EVENT (from trigger)
    if (action === "update_event" && event_data && event_id) {
      const tabName = getMonthTabName(event_data.event_date);
      await ensureMonthTab(accessToken, sheetId, tabName, tabs);
      const existingRow = await findEventRowInTab(accessToken, sheetId, tabName, event_id);
      const row = formatEventRow(event_data, "web pushed");
      if (existingRow > 0) {
        await updateSheet(accessToken, sheetId, `'${tabName}'!A${existingRow}`, [row]);
      } else {
        await appendToSheet(accessToken, sheetId, `'${tabName}'!A1`, [row]);
      }

      return new Response(JSON.stringify({ success: true, tab: tabName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        notes: event_data.notes || "Manually added from admin",
        source: "manual",
        sheet_pushed: true,
        sheet_pushed_at: new Date().toISOString(),
      } as any).select().single();
      if (error) throw error;

      const tabName = getMonthTabName(inserted.event_date);
      await ensureMonthTab(accessToken, sheetId, tabName, tabs);
      const row = formatEventRow({ ...inserted, source: "manual" }, "manual");
      await appendToSheet(accessToken, sheetId, `'${tabName}'!A1`, [row]);

      return new Response(JSON.stringify({ success: true, event: inserted, tab: tabName }), {
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
