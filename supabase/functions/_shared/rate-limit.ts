/**
 * Tiny shared rate-limit helper for edge functions.
 *
 * Usage:
 *   import { enforceRateLimit } from "../_shared/rate-limit.ts";
 *   const blocked = await enforceRateLimit(req, "ai-chat", { max: 30, windowSec: 60 });
 *   if (blocked) return blocked;
 *
 * Backed by the `public.rate_limit_buckets` table (admins-only, no public RLS).
 * Uses the service-role key so each function shares one global counter per (function, ip).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Opts = {
  /** Max requests within the window before we start blocking. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
  /** When blocked, how long to keep the caller out (defaults to windowSec). */
  blockSec?: number;
  /** Override the identifier (defaults to IP from x-forwarded-for or "unknown"). */
  identifier?: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const client = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : null;

const ipFromReq = (req: Request): string => {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("cf-connecting-ip") || "unknown";
};

export async function enforceRateLimit(
  req: Request,
  scope: string,
  opts: Opts,
): Promise<Response | null> {
  if (!client) return null; // misconfigured – fail open so we never break the function

  const id = `${scope}:${opts.identifier || ipFromReq(req)}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - opts.windowSec * 1000);

  try {
    // Read current bucket
    const { data: row } = await client
      .from("rate_limit_buckets")
      .select("id, window_start, count, blocked_until")
      .eq("id", id)
      .maybeSingle();

    // Already blocked?
    if (row?.blocked_until && new Date(row.blocked_until) > now) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(row.blocked_until).getTime() - now.getTime()) / 1000),
      );
      return new Response(
        JSON.stringify({ error: "Too many requests, slow down.", retry_after_sec: retryAfter }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
        },
      );
    }

    // New / stale window → reset
    if (!row || new Date(row.window_start) < windowStart) {
      await client.from("rate_limit_buckets").upsert({
        id,
        window_start: now.toISOString(),
        count: 1,
        blocked_until: null,
      });
      return null;
    }

    const nextCount = (row.count ?? 0) + 1;
    if (nextCount > opts.max) {
      const blockMs = (opts.blockSec ?? opts.windowSec) * 1000;
      const blockedUntil = new Date(now.getTime() + blockMs).toISOString();
      await client
        .from("rate_limit_buckets")
        .update({ count: nextCount, blocked_until: blockedUntil })
        .eq("id", id);
      return new Response(
        JSON.stringify({
          error: "Too many requests, slow down.",
          retry_after_sec: Math.ceil(blockMs / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(blockMs / 1000)),
          },
        },
      );
    }

    await client.from("rate_limit_buckets").update({ count: nextCount }).eq("id", id);
    return null;
  } catch {
    // Never block legitimate users because rate-limit storage is flaky
    return null;
  }
}
