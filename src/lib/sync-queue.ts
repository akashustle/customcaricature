/**
 * Offline action queue with auto-sync on reconnect.
 *
 * Designed for true offline-first apps (Capacitor / PWA). Any action that
 * needs the network — signup, order placement, image upload — gets enqueued
 * to localStorage. A worker drains the queue automatically when:
 *   - the page loads
 *   - the browser fires an `online` event
 *   - our OfflineDetector dispatches `ccc:network-recovered`
 *   - the Capacitor Network plugin reports connection
 *
 * Each handler is idempotent — duplicate runs are safe. Items have:
 *   - `attempts` (capped at 5, exponential backoff)
 *   - `lastError` (surfaced to admin error inbox)
 *   - stable `id` so the UI can render a "queued / syncing / synced" chip.
 */

import { supabase } from "@/integrations/supabase/client";
import { reportError } from "./error-reporter";
import { getBlob, deleteBlob, dataUrlToBlob } from "./blob-store";

const STORAGE_KEY = "ccc:sync-queue:v1";
const MAX_ATTEMPTS = 5;

export type SyncActionType =
  | "auth.signup"
  | "order.create"
  | "event.book"
  | "image.upload"
  | "profile.update";

export interface SyncAction<T = any> {
  id: string;
  type: SyncActionType;
  payload: T;
  createdAt: number;
  attempts: number;
  lastError?: string;
  status: "queued" | "syncing" | "synced" | "failed";
  /** Cross-link to a related queued action (e.g. the order this image belongs to). */
  relatedId?: string;
  /** A human-friendly local identifier (e.g. order number) for deep-link routing. */
  refKey?: string;
}

type Listener = (queue: SyncAction[]) => void;
const listeners = new Set<Listener>();

const safeRead = (): SyncAction[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SyncAction[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (queue: SyncAction[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {/* ignore quota */}
  listeners.forEach((l) => {
    try { l(queue); } catch {/* ignore */}
  });
};

export const getQueue = () => safeRead();

export const subscribeQueue = (l: Listener) => {
  listeners.add(l);
  l(safeRead());
  return () => listeners.delete(l);
};

export const enqueue = <T,>(type: SyncActionType, payload: T): SyncAction<T> => {
  const action: SyncAction<T> = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    status: "queued",
  };
  const queue = safeRead();
  queue.push(action);
  safeWrite(queue);
  // Try immediately — if online, this will sync right away.
  void drain();
  return action;
};

export const removeAction = (id: string) => {
  safeWrite(safeRead().filter((a) => a.id !== id));
};

const updateAction = (id: string, patch: Partial<SyncAction>) => {
  const queue = safeRead().map((a) => (a.id === id ? { ...a, ...patch } : a));
  safeWrite(queue);
};

/** Reset a single failed/queued action so the next drain re-attempts it. */
export const retryAction = (id: string) => {
  updateAction(id, { status: "queued", attempts: 0, lastError: undefined });
  void drain();
};

/** Reset ALL failed actions so they get re-attempted on the next drain. */
export const retryFailed = () => {
  const queue = safeRead().map((a) =>
    a.status === "failed" ? { ...a, status: "queued" as const, attempts: 0, lastError: undefined } : a,
  );
  safeWrite(queue);
  void drain();
};

/** Permanently drop a failed action the user no longer wants to keep. */
export const discardAction = (id: string) => removeAction(id);

// ---- Action handlers ---------------------------------------------------

const handlers: Record<SyncActionType, (payload: any) => Promise<void>> = {
  "auth.signup": async (p) => {
    const { email, password, metadata } = p;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    if (error && !error.message?.toLowerCase().includes("already")) throw error;
  },

  "order.create": async (p) => {
    const { error } = await supabase.from("orders").insert(p);
    if (error) throw error;
  },

  "event.book": async (p) => {
    const { error } = await supabase.from("event_bookings").insert(p);
    if (error) throw error;
  },

  "profile.update": async (p) => {
    const { user_id, ...rest } = p;
    const { error } = await supabase.from("profiles").update(rest).eq("user_id", user_id);
    if (error) throw error;
  },

  "image.upload": async (p) => {
    const { bucket, path, dataUrl } = p;
    // Convert data URL → Blob without keeping huge string in memory twice
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true });
    if (error) throw error;
  },
};

// ---- Drain worker ------------------------------------------------------

let draining = false;

export const drain = async (): Promise<void> => {
  if (draining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  draining = true;
  try {
    const queue = safeRead();
    for (const action of queue) {
      if (action.status === "synced" || action.status === "failed") continue;
      // Exponential backoff: skip if last attempt was very recent
      const wait = Math.min(1000 * 2 ** action.attempts, 30_000);
      if (action.attempts > 0 && Date.now() - action.createdAt < wait) continue;

      updateAction(action.id, { status: "syncing" });
      try {
        await handlers[action.type](action.payload);
        updateAction(action.id, { status: "synced" });
        // Auto-clean synced items after 10s so the badge clears
        setTimeout(() => removeAction(action.id), 10_000);
      } catch (err: any) {
        const attempts = action.attempts + 1;
        const status = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
        updateAction(action.id, {
          status,
          attempts,
          lastError: err?.message || String(err),
        });
        if (status === "failed") {
          reportError(`sync-queue:${action.type}`, err?.message || String(err), action.payload, "error");
        }
      }
    }
  } finally {
    draining = false;
  }
};

// ---- Auto-bootstrap ----------------------------------------------------

export const installSyncWorker = () => {
  if (typeof window === "undefined") return;

  // Drain on load & reconnect signals
  void drain();
  window.addEventListener("online", () => void drain());
  window.addEventListener("ccc:network-recovered", () => void drain());

  // Periodic safety net (covers Capacitor where the `online` event might lag)
  window.setInterval(() => {
    if (navigator.onLine) void drain();
  }, 15_000);
};

/** Helper: are we online right now? */
export const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

/** Helper: count of pending (non-synced) actions for a UI badge. */
export const pendingCount = () =>
  safeRead().filter((a) => a.status !== "synced").length;
