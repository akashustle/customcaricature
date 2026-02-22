import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push with proper payload encryption using Web Crypto
// Following RFC 8291 (Message Encryption for Web Push)

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64UrlEncode(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function createVapidJwt(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string, subject: string) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const rawPublicKey = base64UrlDecode(vapidPublicKey);
  const rawPrivateKey = base64UrlDecode(vapidPrivateKey);

  const x = base64UrlEncode(rawPublicKey.slice(1, 33));
  const y = base64UrlEncode(rawPublicKey.slice(33, 65));
  const d = base64UrlEncode(rawPrivateKey);

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  ));

  return `${unsignedToken}.${base64UrlEncode(sig)}`;
}

// Encrypt payload per RFC 8291 using aes128gcm content encoding
async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payload: Uint8Array
): Promise<{ encrypted: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  const clientPublicKeyRaw = base64UrlDecode(clientPublicKeyB64);
  const clientAuth = base64UrlDecode(clientAuthB64);

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  // Generate server ephemeral key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey));

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  ));

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF helper (RFC 5869)
  async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    // Extract: PRK = HMAC-SHA256(salt, IKM)
    const saltKey = await crypto.subtle.importKey(
      "raw",
      salt.length > 0 ? salt : new Uint8Array(32),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));
    // Expand: OKM = HMAC-SHA256(PRK, info || 0x01)
    const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const infoWithCounter = new Uint8Array([...info, 1]);
    const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
    return okm.slice(0, length);
  }

  // auth_info for IKM
  const enc = new TextEncoder();
  const authInfo = new Uint8Array([
    ...enc.encode("WebPush: info\0"),
    ...clientPublicKeyRaw,
    ...serverPublicKey,
  ]);

  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  // Derive CEK and nonce
  const cekInfo = new Uint8Array([...enc.encode("Content-Encoding: aes128gcm\0")]);
  const nonceInfo = new Uint8Array([...enc.encode("Content-Encoding: nonce\0")]);

  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad the payload (add delimiter byte 0x02 and optional padding)
  const padded = new Uint8Array([...payload, 2]);

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    padded
  ));

  // Build aes128gcm header: salt (16) + rs (4) + keyid_len (1) + keyid (65)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  const encrypted = new Uint8Array([...header, ...ciphertext]);

  return { encrypted, serverPublicKey, salt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Return VAPID public key for client-side registration
    if (body.action === "get_vapid_key") {
      const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
      return new Response(JSON.stringify({ vapid_public_key: vapidPublicKey || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, title, message, type, link } = body;
    if (!user_id) throw new Error("user_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:creativecaricatureclub@gmail.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payloadStr = JSON.stringify({
      title: title || "Creative Caricature Club",
      body: message || "You have a new notification",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: `ccc-${Date.now()}`,
      url: link || "/notifications",
    });
    const payloadBytes = new TextEncoder().encode(payloadStr);

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Convert stored base64 keys to base64url
        const p256dhB64url = sub.p256dh.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        const authB64url = sub.auth.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

        // Encrypt the payload
        const { encrypted } = await encryptPayload(p256dhB64url, authB64url, payloadBytes);

        // Create VAPID JWT
        const jwt = await createVapidJwt(sub.endpoint, vapidPublicKey, vapidPrivateKey, vapidSubject);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            "TTL": "86400",
            "Urgency": "high",
            "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
          },
          body: encrypted,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
          console.log(`Push sent to subscription ${sub.id}`);
        } else if (response.status === 404 || response.status === 410) {
          // Subscription expired, remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          failed.push(sub.id);
          console.log(`Subscription ${sub.id} expired, removed`);
        } else {
          const errText = await response.text();
          console.error(`Push failed for ${sub.id}: ${response.status} ${errText}`);
          failed.push(sub.id);
        }
      } catch (err) {
        console.error(`Push error for ${sub.id}:`, err);
        failed.push(sub.id);
      }
    }

    return new Response(JSON.stringify({ sent, failed: failed.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-web-push error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
