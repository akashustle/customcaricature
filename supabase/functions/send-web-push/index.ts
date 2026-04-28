import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const rawPublicKey = base64UrlDecode(vapidPublicKey);
  const rawPrivateKey = base64UrlDecode(vapidPrivateKey);
  const x = base64UrlEncode(rawPublicKey.slice(1, 33));
  const y = base64UrlEncode(rawPublicKey.slice(33, 65));
  const d = base64UrlEncode(rawPrivateKey);
  const key = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x, y, d }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsignedToken)));
  return `${unsignedToken}.${base64UrlEncode(sig)}`;
}

async function encryptPayload(clientPublicKeyB64: string, clientAuthB64: string, payload: Uint8Array): Promise<{ encrypted: Uint8Array }> {
  // Cast to BufferSource to satisfy strict TS lib check (Uint8Array<ArrayBufferLike> vs ArrayBufferView<ArrayBuffer>)
  const clientPublicKeyRaw = base64UrlDecode(clientPublicKeyB64);
  const clientAuth = base64UrlDecode(clientAuthB64);
  const clientPublicKey = await crypto.subtle.importKey("raw", clientPublicKeyRaw as BufferSource, { name: "ECDH", namedCurve: "P-256" }, true, []);
  const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey));
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientPublicKey }, serverKeyPair.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const saltKey = await crypto.subtle.importKey("raw", (salt.length > 0 ? salt : new Uint8Array(32)) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm as BufferSource));
    const prkKey = await crypto.subtle.importKey("raw", prk as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, new Uint8Array([...info, 1]) as BufferSource));
    return okm.slice(0, length);
  }

  const enc = new TextEncoder();
  const authInfo = new Uint8Array([...enc.encode("WebPush: info\0"), ...clientPublicKeyRaw, ...serverPublicKey]);
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);
  const cek = await hkdf(salt, ikm, new Uint8Array([...enc.encode("Content-Encoding: aes128gcm\0")]), 16);
  const nonce = await hkdf(salt, ikm, new Uint8Array([...enc.encode("Content-Encoding: nonce\0")]), 12);
  const padded = new Uint8Array([...payload, 2]);
  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const paddedBuf = new Uint8Array(new ArrayBuffer(padded.byteLength));
  paddedBuf.set(padded);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, aesKey, paddedBuf));

  const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);

  return { encrypted: new Uint8Array([...header, ...ciphertext]) };
}

async function sendToSubscription(sub: any, payloadBytes: Uint8Array, vapidPublicKey: string, vapidPrivateKey: string, vapidSubject: string, supabase: any) {
  try {
    const { encrypted } = await encryptPayload(sub.p256dh, sub.auth, payloadBytes);
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
      await supabase.from("push_subscriptions").update({
        is_active: true,
        last_active_at: new Date().toISOString(),
      }).eq("id", sub.id);
      console.log(`Push sent to ${sub.id}`);
      return true;
    } else if (response.status === 401 || response.status === 403 || response.status === 404 || response.status === 410) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      console.log(`Subscription ${sub.id} expired, removed`);
      return false;
    } else {
      const errText = await response.text();
      console.error(`Push failed for ${sub.id}: ${response.status} ${errText}`);
      return false;
    }
  } catch (err) {
    console.error(`Push error for ${sub.id}:`, err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:creativecaricatureclub@gmail.com";

    // Return VAPID public key
    if (body.action === "get_vapid_key") {
      return new Response(JSON.stringify({ vapid_public_key: vapidPublicKey || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys missing");
      return new Response(JSON.stringify({ sent: 0, skipped: true, error: "VAPID keys not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // BROADCAST TO A LIST OF USER IDS — single edge call, fans out to all
    // active push_subscriptions for those users. Used by Admin broadcast.
    if (body.action === "broadcast_to_users") {
      const { user_ids, title, message, link, image_url } = body;
      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return new Response(JSON.stringify({ sent: 0, reason: "no user_ids" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: subs, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("is_active", true)
        .in("user_id", user_ids);
      if (error) throw error;
      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ sent: 0, failed: 0, reason: "no active subscriptions" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const payloadStr = JSON.stringify({
        title: title || "Creative Caricature Club",
        body: message || "You have a new notification",
        icon: "/logo.png", badge: "/badge-96.png",
        tag: `ccc-${Date.now()}`,
        url: link || "/notifications",
        image: image_url || undefined,
      });
      const payloadBytes = new TextEncoder().encode(payloadStr);
      // Send in parallel chunks of 25 to keep latency low without overwhelming
      let sent = 0, failed = 0;
      const chunkSize = 25;
      for (let i = 0; i < subs.length; i += chunkSize) {
        const chunk = subs.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map((sub) => sendToSubscription(sub, payloadBytes, vapidPublicKey, vapidPrivateKey, vapidSubject, supabase))
        );
        for (const ok of results) ok ? sent++ : failed++;
      }
      return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BROADCAST TO ALL SUBSCRIBERS (registered + anonymous)
    if (body.action === "broadcast_all") {
      const { title, message, link, image_url } = body;
      const { data: allSubs, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      if (!allSubs || allSubs.length === 0) {
        return new Response(JSON.stringify({ sent: 0, failed: 0, reason: "no active subscriptions" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payloadStr = JSON.stringify({
        title: title || "Creative Caricature Club",
        body: message || "You have a new notification",
        icon: "/logo.png", badge: "/badge-96.png",
        tag: `ccc-${Date.now()}`,
        url: link || "/notifications",
        image: image_url || undefined,
      });
      const payloadBytes = new TextEncoder().encode(payloadStr);

      let sent = 0, failed = 0;
      for (const sub of allSubs) {
        const ok = await sendToSubscription(sub, payloadBytes, vapidPublicKey, vapidPrivateKey, vapidSubject, supabase);
        if (ok) sent++; else failed++;
      }

      return new Response(JSON.stringify({ sent, failed, total: allSubs.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SEND TO SPECIFIC USER
    const { user_id, title, message, type, link, image_url } = body;
    if (!user_id) throw new Error("user_id required");

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions").select("*").eq("user_id", user_id).eq("is_active", true);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payloadStr = JSON.stringify({
      title: title || "Creative Caricature Club",
      body: message || "You have a new notification",
      icon: "/logo.png", badge: "/badge-96.png",
      tag: `ccc-${Date.now()}`,
      url: link || "/notifications",
      image: image_url || undefined,
    });
    const payloadBytes = new TextEncoder().encode(payloadStr);

    let sent = 0;
    const failed: string[] = [];
    for (const sub of subscriptions) {
      const ok = await sendToSubscription(sub, payloadBytes, vapidPublicKey, vapidPrivateKey, vapidSubject, supabase);
      if (ok) sent++; else failed.push(sub.id);
    }

    return new Response(JSON.stringify({ sent, failed: failed.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-web-push error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
