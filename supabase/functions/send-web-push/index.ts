import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push implementation using Web Crypto API
async function generateVapidAuth(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;
  
  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:creativecaricatureclub@gmail.com",
  };

  // Base64url encode
  const b64url = (data: Uint8Array) => btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const enc = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const rawPrivateKey = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  
  // Build PKCS8 from raw 32-byte private key + public key
  const rawPublicKey = Uint8Array.from(atob(vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  
  // Create JWK from raw keys
  const x = b64url(rawPublicKey.slice(1, 33));
  const y = b64url(rawPublicKey.slice(33, 65));
  const d = b64url(rawPrivateKey);

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(unsignedToken)
  );

  // Convert DER signature to raw format (if needed)
  const sigArray = new Uint8Array(signature);
  const tokenSignature = b64url(sigArray);
  const jwt = `${unsignedToken}.${tokenSignature}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
  };
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

    const payload = JSON.stringify({
      title: title || "Creative Caricature Club",
      body: message || "You have a new notification",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: `ccc-${Date.now()}`,
      url: link || "/notifications",
    });

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions) {
      try {
        const { authorization } = await generateVapidAuth(sub.endpoint, vapidPublicKey, vapidPrivateKey);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "TTL": "86400",
            Authorization: authorization,
          },
          body: new TextEncoder().encode(payload),
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          // Subscription expired, remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          failed.push(sub.id);
        } else {
          console.error(`Push failed for ${sub.id}: ${response.status} ${await response.text()}`);
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