import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const INDEXING_API = "https://indexing.googleapis.com/v3/urlNotifications";
const MAX_BATCH = 100;
const MAX_URLS_PER_REQUEST = 500;
const SCOPE = "https://www.googleapis.com/auth/indexing";
const ALLOWED_DOMAIN = "portal.creativecaricatureclub.com";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10; // max 10 calls per admin per minute

/* ── In-memory rate limiter ── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

/* ── Input validation ── */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.hostname === ALLOWED_DOMAIN &&
      url.length <= 2048
    );
  } catch {
    return false;
  }
}

function sanitizeUrl(url: string): string {
  return url.trim().replace(/[<>"']/g, "");
}

function validateAction(action: unknown): action is string {
  return (
    typeof action === "string" &&
    ["submit", "batch", "status", "auto_submit_all"].includes(action)
  );
}

function validateType(type: unknown): type is "URL_UPDATED" | "URL_DELETED" {
  return typeof type === "string" && ["URL_UPDATED", "URL_DELETED"].includes(type);
}

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

/* ── Google access token (cached) ── */
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
    await res.json(); // consume body
    return { url, success: true };
  } catch (e) {
    return { url, success: false, error: (e as Error).message };
  }
}

/* ── Batch notification with chunking ── */
async function batchNotify(
  token: string,
  urls: string[],
  type: "URL_UPDATED" | "URL_DELETED"
): Promise<{ sent: number; failed: number; results: any[] }> {
  const results: any[] = [];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i += MAX_BATCH) {
    const chunk = urls.slice(i, i + MAX_BATCH);
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

    if (i + MAX_BATCH < urls.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { sent, failed, results };
}

/* ── Get notification status ── */
async function getStatus(token: string, url: string): Promise<any> {
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

/* ── Auth helper: verify admin ── */
async function verifyAdmin(
  req: Request
): Promise<{ userId: string; error?: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      userId: "",
      error: new Response(
        JSON.stringify({ error: "Unauthorized: Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await sb.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return {
      userId: "",
      error: new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  const userId = claimsData.claims.sub as string;

  // Check admin role using service role client
  const sbService = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: roleData } = await sbService
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return {
      userId: "",
      error: new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  return { userId };
}

/* ── Helper: create service Supabase client ── */
function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/* ── Helper: log indexing activity ── */
async function logActivity(
  sb: any,
  entries: { url: string; action_type: string; success: boolean; error_message: string | null }[]
) {
  if (entries.length === 0) return;
  try {
    await sb.from("google_indexing_log").insert(entries);
  } catch (_e) {
    console.warn("Failed to log indexing activity:", _e);
  }
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate & authorize (admin-only)
    const { userId, error: authError } = await verifyAdmin(req);
    if (authError) return authError;

    // 2. Rate limit per admin
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Max 10 requests per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse & validate service account key
    const saKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyRaw) {
      return new Response(
        JSON.stringify({ error: "Google service account key not configured" }),
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
        JSON.stringify({ error: "Service account key missing required fields" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, urls, url, type = "URL_UPDATED" } = body;

    // 5. Validate action
    if (!validateAction(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: submit, batch, status, auto_submit_all" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Validate type
    if (!validateType(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type. Use URL_UPDATED or URL_DELETED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const googleToken = await getAccessToken(saKey.client_email, saKey.private_key);
    const sb = getServiceClient();

    // ── Action: submit single URL ──
    if (action === "submit") {
      if (!url || typeof url !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid 'url' parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cleanUrl = sanitizeUrl(url);
      if (!isValidUrl(cleanUrl)) {
        return new Response(
          JSON.stringify({ error: `Invalid URL. Must be an https://${ALLOWED_DOMAIN}/... URL under 2048 chars` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await notifyUrl(googleToken, cleanUrl, type);
      await logActivity(sb, [
        { url: cleanUrl, action_type: type, success: result.success, error_message: result.error || null },
      ]);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: batch submit ──
    if (action === "batch") {
      if (!Array.isArray(urls) || urls.length === 0) {
        return new Response(
          JSON.stringify({ error: "Missing or empty 'urls' array" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (urls.length > MAX_URLS_PER_REQUEST) {
        return new Response(
          JSON.stringify({ error: `Max ${MAX_URLS_PER_REQUEST} URLs per batch request` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate & sanitize every URL
      const invalidUrls: string[] = [];
      const validUrls: string[] = [];
      for (const u of urls) {
        if (typeof u !== "string") {
          invalidUrls.push(String(u));
          continue;
        }
        const clean = sanitizeUrl(u);
        if (isValidUrl(clean)) {
          validUrls.push(clean);
        } else {
          invalidUrls.push(u);
        }
      }

      if (validUrls.length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid URLs found", invalidUrls }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await batchNotify(googleToken, validUrls, type);

      const logs = result.results.map((r: any) => ({
        url: r.url,
        action_type: type,
        success: r.success,
        error_message: r.error || null,
      }));
      await logActivity(sb, logs);

      return new Response(
        JSON.stringify({
          sent: result.sent,
          failed: result.failed,
          total: validUrls.length,
          skipped_invalid: invalidUrls.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: check status ──
    if (action === "status") {
      if (!url || typeof url !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing 'url' parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cleanUrl = sanitizeUrl(url);
      if (!isValidUrl(cleanUrl)) {
        return new Response(
          JSON.stringify({ error: `Invalid URL. Must be from ${ALLOWED_DOMAIN}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const status = await getStatus(googleToken, cleanUrl);
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: auto-submit all sitemap URLs ──
    if (action === "auto_submit_all") {
      const BASE_URL = `https://${ALLOWED_DOMAIN}`;

      const staticUrls = [
        "/", "/order", "/book-event", "/shop", "/enquiry", "/about",
        "/blog", "/gallery/caricature", "/gallery/event", "/track-order",
        "/support", "/workshop", "/faqs", "/explore", "/ai-caricature",
        "/caricature-budgeting", "/live-chat", "/register", "/login",
      ].map((p) => `${BASE_URL}${p}`);

      const [blogsRes, cmsRes, seoRes] = await Promise.all([
        sb.from("blog_posts").select("slug").eq("is_published", true),
        sb.from("cms_pages").select("slug").eq("is_active", true),
        sb.from("seo_landing_pages").select("slug").eq("is_active", true),
      ]);

      const blogUrls = (blogsRes.data || []).map((b: any) => `${BASE_URL}/blog/${b.slug}`);
      const cmsUrls = (cmsRes.data || []).map((p: any) => `${BASE_URL}/page/${p.slug}`);
      const seoUrls = (seoRes.data || []).map((p: any) => `${BASE_URL}/${p.slug}`);

      const allUrls = [...staticUrls, ...blogUrls, ...cmsUrls, ...seoUrls];
      const result = await batchNotify(googleToken, allUrls, "URL_UPDATED");

      const logs = result.results.map((r: any) => ({
        url: r.url,
        action_type: "URL_UPDATED",
        success: r.success,
        error_message: r.error || null,
      }));
      await logActivity(sb, logs);

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
      JSON.stringify({ error: "Unhandled action" }),
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
