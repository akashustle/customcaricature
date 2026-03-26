import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Google Sheets API helpers
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
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const claimB64 = btoa(JSON.stringify(claim))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${headerB64}.${claimB64}`;

  // Import the RSA private key
  const pemContent = serviceAccountKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function readSheet(accessToken: string, sheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Append failed: ${err}`);
  }
  return await res.json();
}

async function updateSheet(accessToken: string, sheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Update failed: ${err}`);
  }
  return await res.json();
}

function formatEventRow(event: any): any[] {
  return [
    event.event_date || "",
    event.venue_name || "",
    `${event.event_start_time || ""} - ${event.event_end_time || ""}`,
    "", // Artist name - filled by admin on sheet
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
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID");

    if (!serviceAccountKeyRaw || !sheetId) {
      throw new Error("Google Sheets credentials not configured");
    }

    const serviceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);

    const { action, event_data, event_id } = await req.json();

    if (action === "read") {
      // Read all data from sheet
      const data = await readSheet(accessToken, sheetId, "Sheet1!A1:Z1000");
      return new Response(JSON.stringify({ success: true, data: data.values || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_all") {
      // Full sync: read all events from DB and push to sheet
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: events, error } = await supabase
        .from("event_bookings")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;

      // Build header row matching user's sheet format
      const headers = [
        "DATE", "VENUE", "TIME", "ARTIST NAME", "Payment Status",
        "Client Name", "Mobile", "Email", "City", "State",
        "Event Type", "Artist Count", "Total Price", "Advance", "Status",
        "Booking ID", "Notes",
      ];

      const rows = (events || []).map(formatEventRow);
      const allValues = [
        ["EVENT SCHEDULE - Auto Synced from CCC Website"],
        [`No. of Events`, String(rows.length)],
        headers,
        [], // Empty row separator
        ...rows,
      ];

      await updateSheet(accessToken, sheetId, "Sheet1!A1", allValues);

      return new Response(JSON.stringify({ success: true, synced: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "append_event" && event_data) {
      // Append a single new event row
      const row = formatEventRow(event_data);
      await appendToSheet(accessToken, sheetId, "Sheet1!A5", [row]);

      // Also update event count in B2
      const currentData = await readSheet(accessToken, sheetId, "Sheet1!B2");
      const currentCount = parseInt(currentData.values?.[0]?.[0] || "0", 10);
      await updateSheet(accessToken, sheetId, "Sheet1!B2", [[String(currentCount + 1)]]);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_event" && event_data && event_id) {
      // Find and update existing event row by booking ID (column P = index 15)
      const data = await readSheet(accessToken, sheetId, "Sheet1!A1:Q1000");
      const rows = data.values || [];
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i]?.[15] === event_id) {
          rowIndex = i + 1; // 1-indexed
          break;
        }
      }

      if (rowIndex > 0) {
        const updatedRow = formatEventRow(event_data);
        await updateSheet(accessToken, sheetId, `Sheet1!A${rowIndex}`, [updatedRow]);
      } else {
        // Not found, append instead
        const row = formatEventRow(event_data);
        await appendToSheet(accessToken, sheetId, "Sheet1!A5", [row]);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
