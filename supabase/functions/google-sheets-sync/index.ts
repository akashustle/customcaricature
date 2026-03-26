import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  const pemContent = serviceAccountKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );

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

// Get the first sheet's title dynamically
async function getFirstSheetName(accessToken: string, sheetId: string): Promise<string> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get sheet info: ${err}`);
  }
  const data = await res.json();
  return data.sheets?.[0]?.properties?.title || "Sheet1";
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

function formatEventRow(event: any): any[] {
  return [
    event.event_date || "",
    event.venue_name || "",
    `${event.event_start_time || ""} - ${event.event_end_time || ""}`,
    "",
    event.payment_status || "",
    event.client_name || "",
    event.client_mobile || "",
    event.client_email || "",
    event.city || "",
    event.state || "",
    event.event_type || "",
    event.artist_count || 1,
    `₹${event.total_price || 0}`,
    `₹${event.advance_amount || 0}`,
    event.status || "",
    event.id || "",
    event.notes || "",
    event.source || "website",
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
    if (!serviceAccountKeyRaw || !sheetId) throw new Error("Google Sheets credentials not configured");

    const serviceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);
    const sheetName = await getFirstSheetName(accessToken, sheetId);
    console.log("Detected sheet name:", sheetName);

    const { action, event_data, event_id } = await req.json();

    if (action === "read") {
      const data = await readSheet(accessToken, sheetId, `'${sheetName}'!A1:Z1000`);
      return new Response(JSON.stringify({ success: true, data: data.values || [], sheetName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_all") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: events, error } = await supabase
        .from("event_bookings")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;

      const headers = [
        "DATE", "VENUE", "TIME", "ARTIST NAME", "Payment Status",
        "Client Name", "Mobile", "Email", "City", "State",
        "Event Type", "Artist Count", "Total Price", "Advance", "Status",
        "Booking ID", "Notes", "Source",
      ];

      const rows = (events || []).map(formatEventRow);
      const allValues = [
        ["EVENT SCHEDULE - Auto Synced from CCC Website", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `Last Synced: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`],
        ["No. of Events", String(rows.length)],
        headers,
        [],
        ...rows,
      ];

      await updateSheet(accessToken, sheetId, `'${sheetName}'!A1`, allValues);

      return new Response(JSON.stringify({ success: true, synced: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "append_event" && event_data) {
      const row = formatEventRow(event_data);
      await appendToSheet(accessToken, sheetId, `'${sheetName}'!A5`, [row]);

      try {
        const currentData = await readSheet(accessToken, sheetId, `'${sheetName}'!B2`);
        const currentCount = parseInt(currentData.values?.[0]?.[0] || "0", 10);
        await updateSheet(accessToken, sheetId, `'${sheetName}'!B2`, [[String(currentCount + 1)]]);
      } catch (_) { /* non-fatal */ }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_event" && event_data && event_id) {
      const data = await readSheet(accessToken, sheetId, `'${sheetName}'!A1:R1000`);
      const rows = data.values || [];
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i]?.[15] === event_id) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex > 0) {
        const updatedRow = formatEventRow(event_data);
        await updateSheet(accessToken, sheetId, `'${sheetName}'!A${rowIndex}`, [updatedRow]);
      } else {
        const row = formatEventRow(event_data);
        await appendToSheet(accessToken, sheetId, `'${sheetName}'!A5`, [row]);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_manual_event" && event_data) {
      // Add manual event to DB first, then sync to sheet
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: inserted, error } = await supabase
        .from("event_bookings")
        .insert({
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
        })
        .select()
        .single();

      if (error) throw error;

      // The DB trigger will auto-sync to sheet, but also do it directly for reliability
      const row = formatEventRow({ ...inserted, source: "manual" });
      await appendToSheet(accessToken, sheetId, `'${sheetName}'!A5`, [row]);

      try {
        const currentData = await readSheet(accessToken, sheetId, `'${sheetName}'!B2`);
        const currentCount = parseInt(currentData.values?.[0]?.[0] || "0", 10);
        await updateSheet(accessToken, sheetId, `'${sheetName}'!B2`, [[String(currentCount + 1)]]);
      } catch (_) { /* non-fatal */ }

      return new Response(JSON.stringify({ success: true, event: inserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
