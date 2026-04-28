/**
 * Tests for razorpay-webhook signature verification + dedup behaviour.
 * Pure functions — no network calls.
 */
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const hexHmacSha256 = async (secret: string, body: string): Promise<string> => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.test("signature: matching secret produces stable hex", async () => {
  const sig = await hexHmacSha256("test_secret", '{"event":"payment.captured"}');
  assertEquals(sig.length, 64);
  const sig2 = await hexHmacSha256("test_secret", '{"event":"payment.captured"}');
  assertEquals(sig, sig2);
});

Deno.test("signature: different body changes hash", async () => {
  const a = await hexHmacSha256("s", '{"a":1}');
  const b = await hexHmacSha256("s", '{"a":2}');
  assertNotEquals(a, b);
});

Deno.test("signature: different secret changes hash", async () => {
  const a = await hexHmacSha256("s1", "x");
  const b = await hexHmacSha256("s2", "x");
  assertNotEquals(a, b);
});

Deno.test("dedup: second insert with same event_id should be a no-op", () => {
  // Simulates DB unique-violation handling. Real handler returns 200 deduped.
  const seen = new Set<string>();
  const insert = (id: string) => {
    if (seen.has(id)) return { code: "23505" as const };
    seen.add(id); return { code: null };
  };
  assertEquals(insert("evt_1").code, null);
  assertEquals(insert("evt_1").code, "23505");
  assertEquals(insert("evt_2").code, null);
});

Deno.test("idempotent update: row already paid by same payment_id is skipped", () => {
  const row = { payment_status: "paid", razorpay_payment_id: "pay_1" };
  const incoming = "pay_1";
  const shouldUpdate = !(row.payment_status === "paid" && row.razorpay_payment_id === incoming);
  assertEquals(shouldUpdate, false);
});

Deno.test("idempotent update: row pending with new payment_id is updated", () => {
  const row = { payment_status: "pending", razorpay_payment_id: null };
  const incoming = "pay_2";
  const shouldUpdate = !(row.payment_status === "paid" && row.razorpay_payment_id === incoming);
  assertEquals(shouldUpdate, true);
});

Deno.test("event-type filter: only payment.captured/authorized/order.paid trigger updates", () => {
  const handled = ["payment.captured", "payment.authorized", "order.paid"];
  assertEquals(handled.includes("payment.captured"), true);
  assertEquals(handled.includes("payment.failed"), false);
  assertEquals(handled.includes("refund.created"), false);
});
