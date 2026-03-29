import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const INDEXING_API = "https://indexing.googleapis.com/v3/urlNotifications";
const BATCH_API = "https://indexing.googleapis.com/batch";
const MAX_BATCH = 100; // Google allows max 100 per batch
const SCOPE = "https://www.googleapis.com/auth/indexing";

/* ── JWT helpers (RS256 for Google SA) ── */
function base64url(input: Uint8Array): string {
  return btoa(String.fromCharCode(...input))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function createSignedJWT(
  email: string,
  privateKeyPem: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: email,
        scope: SCOPE,
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  return `${header}.${payload}.${base64url(new Uint8Array(sig))}`;
}

/* ── Get access token ── */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(
  email: string,
  privateKey: string
): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const jwt = await createSignedJWT(email, privateKey);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

/* ── Single URL notification ── */
async function notifyUrl(
  token: string,
  url: string,
  type: "URL_UPDATED" | "URL_DELETED"
): Promise<{ url: string; success: boolean; error?: string }> {
  try {
    const res = await fetch(`${INDEXING_API}:publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { url, success: false, error: `${res.status}: ${err}` };
    }
    return { url, success: true };
  } catch (e) {
    return { url, success: false, error: (e as Error).message };
  }
}

/* ── Batch notification (multipart) ── */
async function batchNotify(
  token: string,
  urls: string[],
  type: "URL_UPDATED" | "URL_DELETED"
): Promise<{ sent: number; failed: number; results: any[] }> {
  const results: any[] = [];
  let sent = 0;
  let failed = 0;

  // Process in chunks of MAX_BATCH
  for (let i = 0; i < urls.length; i += MAX_BATCH) {
    const chunk = urls.slice(i, i + MAX_BATCH);

    // Use individual requests for reliability at scale
    const promises = chunk.map((url) => notifyUrl(token, url, type));
    const chunkResults = await Promise.allSettled(promises);

    for (const r of chunkResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
        if (r.value.success) sent++;
        else failed++;
      } else {
        failed++;
        results.push({ url: "unknown", success: false, error: r.reason?.message });
      }
    }

    // Rate limit: Google allows 200 req/min, pause between chunks
    if (i + MAX_BATCH < urls.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { sent, failed, results };
}

/* ── Get notification status ── */
async function getStatus(
  token: string,
  url: string
): Promise<any> {
  const res = await fetch(
    `${INDEXING_API}/metadata?url=${encodeURIComponent(url)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Status check failed ${res.status}: ${err}`);
  }
  return res.json();
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse service account key
    const saKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyRaw) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let saKey: { client_email: string; private_key: string };
    try {
      saKey = JSON.parse(saKeyRaw);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid service account key format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!saKey.client_email || !saKey.private_key) {
      return new Response(
        JSON.stringify({ error: "Service account key missing client_email or private_key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, urls, url, type = "URL_UPDATED" } = body;

    // Validate type
    if (!["URL_UPDATED", "URL_DELETED"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type. Use URL_UPDATED or URL_DELETED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getAccessToken(saKey.client_email, saKey.private_key);

    // Action: submit single URL
    if (action === "submit" && url) {
      const result = await notifyUrl(token, url, type);

      // Log to DB
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      await sb.from("google_indexing_log").insert({
        url,
        action_type: type,
        success: result.success,
        error_message: result.error || null,
      } as any).catch(() => {});

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: batch submit
    if (action === "batch" && Array.isArray(urls) && urls.length > 0) {
      if (urls.length > 500) {
        return new Response(
          JSON.stringify({ error: "Max 500 URLs per batch request" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await batchNotify(token, urls, type);

      // Log to DB
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      const logs = result.results.map((r: any) => ({
        url: r.url,
        action_type: type,
        success: r.success,
        error_message: r.error || null,
      }));
      if (logs.length > 0) {
        await sb.from("google_indexing_log").insert(logs as any).catch(() => {});
      }

      return new Response(
        JSON.stringify({ sent: result.sent, failed: result.failed, total: urls.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: check status
    if (action === "status" && url) {
      const status = await getStatus(token, url);
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: auto-submit all sitemap URLs
    if (action === "auto_submit_all") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      const BASE_URL = "https://portal.creativecaricatureclub.com";

      const staticUrls = [
        "/", "/order", "/book-event", "/shop", "/enquiry", "/about",
        "/blog", "/gallery/caricature", "/gallery/event", "/track-order",
        "/support", "/workshop", "/faqs", "/explore", "/ai-caricature",
        "/caricature-budgeting", "/live-chat", "/register", "/login",
      ].map((p) => `${BASE_URL}${p}`);

      // Fetch blog posts
      const { data: blogs } = await sb
        .from("blog_posts")
        .select("slug")
        .eq("is_published", true);
      const blogUrls = (blogs || []).map((b: any) => `${BASE_URL}/blog/${b.slug}`);

      // Fetch CMS pages
      const { data: cmsPages } = await sb
        .from("cms_pages")
        .select("slug")
        .eq("is_active", true);
      const cmsUrls = (cmsPages || []).map((p: any) => `${BASE_URL}/page/${p.slug}`);

      // Fetch SEO landing pages
      const { data: seoPages } = await sb
        .from("seo_landing_pages")
        .select("slug")
        .eq("is_active", true);
      const seoUrls = (seoPages || []).map((p: any) => `${BASE_URL}/${p.slug}`);

      const allUrls = [...staticUrls, ...blogUrls, ...cmsUrls, ...seoUrls];
      const result = await batchNotify(token, allUrls, "URL_UPDATED");

      // Log
      const logs = result.results.map((r: any) => ({
        url: r.url,
        action_type: "URL_UPDATED",
        success: r.success,
        error_message: r.error || null,
      }));
      if (logs.length > 0) {
        await sb.from("google_indexing_log").insert(logs as any).catch(() => {});
      }

      return new Response(
        JSON.stringify({
          sent: result.sent,
          failed: result.failed,
          total: allUrls.length,
          breakdown: {
            static: staticUrls.length,
            blog: blogUrls.length,
            cms: cmsUrls.length,
            seo: seoUrls.length,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: submit, batch, status, auto_submit_all" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Google Indexing error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error processing indexing request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
