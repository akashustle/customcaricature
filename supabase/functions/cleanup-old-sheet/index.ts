import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OLD_SHEET_ID = "1uj9xgbkgystQxgdYEid_lTLUkFCEquSxs2gzBerKows";

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

async function fetchRetry(url: string, opts: RequestInit = {}, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429 && attempt < retries - 1) { await new Promise(r => setTimeout(r, Math.pow(2, attempt+1)*1000)); continue; }
    return res;
  }
  throw new Error("Max retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceAccountKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountKeyRaw) throw new Error("No service account key");
    const serviceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);

    const metaRes = await fetchRetry(`https://sheets.googleapis.com/v4/spreadsheets/${OLD_SHEET_ID}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const metaData = await metaRes.json();
    const tabs = (metaData.sheets || []).map((s: any) => ({ title: s.properties.title, sheetId: s.properties.sheetId, columnCount: s.properties.gridProperties?.columnCount || 26 }));

    const batchRequests: any[] = [];

    for (const tab of tabs) {
      if (tab.columnCount > 4) {
        const clearRes = await fetchRetry(
          `https://sheets.googleapis.com/v4/spreadsheets/${OLD_SHEET_ID}/values/${encodeURIComponent(`'${tab.title}'!E1:Z500`)}:clear`,
          { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({}) }
        );
        if (!clearRes.ok) console.warn(`Clear failed for ${tab.title}: ${await clearRes.text()}`);
      }

      await fetchRetry(
        `https://sheets.googleapis.com/v4/spreadsheets/${OLD_SHEET_ID}/values/${encodeURIComponent(`'${tab.title}'!A3:D3`)}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [["DATE", "VENUE", "TIMING", "ARTISTS NAME"]] }) }
      );

      batchRequests.push({
        repeatCell: {
          range: { sheetId: tab.sheetId, startRowIndex: 0, endRowIndex: 500, startColumnIndex: 0, endColumnIndex: 26 },
          cell: { userEnteredFormat: {} },
          fields: "userEnteredFormat",
        },
      });

      batchRequests.push({
        repeatCell: {
          range: { sheetId: tab.sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 10 },
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat(textFormat,horizontalAlignment)",
        },
      });

      batchRequests.push({
        repeatCell: {
          range: { sheetId: tab.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 12 },
            },
          },
          fields: "userEnteredFormat(textFormat)",
        },
      });

      const widths = [60, 180, 120, 200];
      widths.forEach((px, i) => {
        batchRequests.push({
          updateDimensionProperties: {
            range: { sheetId: tab.sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px }, fields: "pixelSize",
          },
        });
      });

      batchRequests.push({
        updateSheetProperties: {
          properties: { sheetId: tab.sheetId, gridProperties: { frozenRowCount: 0 } },
          fields: "gridProperties.frozenRowCount",
        },
      });
    }

    if (batchRequests.length) {
      const batchRes = await fetchRetry(`https://sheets.googleapis.com/v4/spreadsheets/${OLD_SHEET_ID}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests: batchRequests }),
      });
      if (!batchRes.ok) throw new Error(`Batch update failed: ${await batchRes.text()}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Old sheet fully restored", tabCount: tabs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
