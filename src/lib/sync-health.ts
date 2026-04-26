/**
 * Periodically reports this client's offline sync backlog to the server so
 * admins can see live "stuck" clients across the entire user base.
 *
 * - Anonymous-friendly: the row contains only counters and a stable client_id
 *   (no PII besides the optional auth user id).
 * - Cheap: single insert every 60s, but only when there IS a backlog OR the
 *   counts changed since the last report. Avoids spamming the table.
 * - Safe: failures are swallowed — sync health is best-effort, never blocks UX.
 */

import { supabase } from "@/integrations/supabase/client";
import { subscribeQueue, getQueue, type SyncAction } from "./sync-queue";

const CLIENT_ID_KEY = "ccc:client-id:v1";

const getOrCreateClientId = (): string => {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return "c_anon";
  }
};

const detectDeviceType = (): string => {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent || "";
  // Capacitor injects this property at runtime
  const isCapacitor = !!(window as any)?.Capacitor?.isNativePlatform?.();
  if (isCapacitor) {
    if (/android/i.test(ua)) return "capacitor-android";
    if (/iphone|ipad|ipod/i.test(ua)) return "capacitor-ios";
    return "capacitor";
  }
  if (/iphone|ipad|ipod/i.test(ua)) return "web-ios";
  if (/android/i.test(ua)) return "web-android";
  return "web";
};

interface Snapshot {
  pending: number;
  failed: number;
  syncing: number;
  oldest?: number;
  lastError?: string;
}

const summarise = (queue: SyncAction[]): Snapshot => {
  let pending = 0, failed = 0, syncing = 0;
  let oldest: number | undefined;
  let lastError: string | undefined;
  for (const a of queue) {
    if (a.status === "queued") pending++;
    else if (a.status === "failed") failed++;
    else if (a.status === "syncing") syncing++;
    if ((a.status === "queued" || a.status === "syncing") && (!oldest || a.createdAt < oldest)) {
      oldest = a.createdAt;
    }
    if (a.lastError) lastError = a.lastError;
  }
  return { pending, failed, syncing, oldest, lastError };
};

const sameSnapshot = (a: Snapshot, b: Snapshot) =>
  a.pending === b.pending && a.failed === b.failed && a.syncing === b.syncing;

let lastReported: Snapshot | null = null;
let lastReportAt = 0;
const MIN_INTERVAL_MS = 60_000;

const report = async (snapshot: Snapshot, force = false) => {
  // Skip when there's nothing to say AND no prior backlog (fresh install case)
  if (!force && snapshot.pending === 0 && snapshot.failed === 0 && snapshot.syncing === 0) {
    if (lastReported && lastReported.pending === 0 && lastReported.failed === 0) return;
  }
  if (!force && lastReported && sameSnapshot(snapshot, lastReported) && Date.now() - lastReportAt < MIN_INTERVAL_MS) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sync_queue_health").insert({
      client_id: getOrCreateClientId(),
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      device_type: detectDeviceType(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 280) : null,
      pending_count: snapshot.pending,
      failed_count: snapshot.failed,
      syncing_count: snapshot.syncing,
      oldest_queued_at: snapshot.oldest ? new Date(snapshot.oldest).toISOString() : null,
      last_error: snapshot.lastError?.slice(0, 280) ?? null,
    } as any);
    lastReported = snapshot;
    lastReportAt = Date.now();
  } catch {
    /* swallow — best effort */
  }
};

export const installSyncHealthReporter = () => {
  if (typeof window === "undefined") return;

  // Initial heartbeat after a short delay so the auth session is ready.
  setTimeout(() => void report(summarise(getQueue()), true), 4000);

  // Push every queue change through the throttled reporter.
  subscribeQueue((q) => void report(summarise(q)));

  // Periodic safety-net heartbeat
  window.setInterval(() => void report(summarise(getQueue())), MIN_INTERVAL_MS);
};
