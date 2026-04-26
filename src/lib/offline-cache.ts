/**
 * Essential offline content cache for app mode.
 *
 * On first launch (and once every 24h when online), preloads:
 *   - Brand logo
 *   - Caricature gallery thumbnails
 *   - Pricing rows (caricature_types, calculator_pricing_sets)
 *   - FAQ entries
 *   - The signed-in user's own orders + events (if any)
 *
 * Stored in IndexedDB so it survives app restarts. When the device goes
 * offline, callers (`getCached("pricing")`, etc.) get instant data.
 *
 * Keep the surface tiny — just `primeOfflineCache()` + `getCached(key)`.
 * Existing pages keep working unchanged; this is purely additive.
 */

import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "ccc_offline_v1";
const STORE = "essentials";
const STAMP_KEY = "ccc_offline_primed_at";
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

type CacheKey =
  | "logo"
  | "gallery"
  | "caricature_types"
  | "calculator"
  | "faqs"
  | "my_orders"
  | "my_events"
  | "my_profile"
  | "my_workshop"
  | "my_notifications"
  | "site_settings";

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = async <T = unknown>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
};

export const putCached = (key: CacheKey, value: unknown) =>
  tx("readwrite", (s) => s.put(value, key));

export const getCached = <T = unknown>(key: CacheKey) =>
  tx<T | undefined>("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);

const shouldRefresh = () => {
  if (typeof localStorage === "undefined") return true;
  const stamp = Number(localStorage.getItem(STAMP_KEY) || "0");
  return !stamp || Date.now() - stamp > MAX_AGE_MS;
};

const stamp = () => {
  try { localStorage.setItem(STAMP_KEY, String(Date.now())); } catch {/* ignore */}
};

/**
 * Idempotent: safe to call on every app start. Bails fast if recently primed.
 * Runs in the background — never blocks UI.
 */
export const primeOfflineCache = async (force = false) => {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  if (!navigator.onLine) return;
  if (!force && !shouldRefresh()) return;

  // Run all fetches in parallel; one failure doesn't kill the others.
  const tasks: Promise<unknown>[] = [
    cacheLogo(),
    cacheGallery(),
    cacheCaricatureTypes(),
    cacheCalculator(),
    cacheFaqs(),
    cacheMyOrders(),
    cacheMyEvents(),
    cacheMyProfile(),
    cacheMyWorkshop(),
    cacheMyNotifications(),
    cacheSiteSettings(),
  ];

  await Promise.allSettled(tasks);
  stamp();
};

/* ===================== individual cachers ===================== */

const cacheLogo = async () => {
  try {
    const res = await fetch("/logo.png", { cache: "force-cache" });
    if (!res.ok) return;
    const blob = await res.blob();
    await putCached("logo", blob);
  } catch {/* ignore */}
};

const cacheGallery = async () => {
  const { data } = await supabase
    .from("caricature_gallery")
    .select("id, image_url, caption, sort_order")
    .order("sort_order", { ascending: true })
    .limit(40);
  if (data) await putCached("gallery", data);
};

const cacheCaricatureTypes = async () => {
  const { data } = await supabase
    .from("caricature_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (data) await putCached("caricature_types", data);
};

const cacheCalculator = async () => {
  const { data } = await supabase
    .from("calculator_pricing_sets")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (data) await putCached("calculator", data);
};

const cacheFaqs = async () => {
  // FAQ table name varies by project — guard with try/catch
  try {
    const { data } = await (supabase as any)
      .from("faqs")
      .select("*")
      .order("sort_order", { ascending: true })
      .limit(50);
    if (data) await putCached("faqs", data);
  } catch {/* ignore */}
};

const cacheMyOrders = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("orders")
    .select("id, status, created_at, total_price, tracking_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (data) await putCached("my_orders", data);
};

const cacheMyEvents = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("event_bookings")
    .select("id, event_type, event_date, status, total_price, city")
    .eq("user_id", user.id)
    .order("event_date", { ascending: false })
    .limit(20);
  if (data) await putCached("my_events", data);
};

const cacheMyProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data) await putCached("my_profile", data);
};

const cacheMyWorkshop = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try {
    const { data } = await (supabase as any)
      .from("workshop_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (data) await putCached("my_workshop", data);
  } catch {/* ignore */}
};

const cacheMyNotifications = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try {
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id, title, message, type, link, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) await putCached("my_notifications", data);
  } catch {/* ignore */}
};

const cacheSiteSettings = async () => {
  try {
    const { data } = await (supabase as any)
      .from("admin_site_settings")
      .select("id, value");
    if (data) await putCached("site_settings", data);
  } catch {/* ignore */}
};

/** React-friendly install — call once on app boot in app mode. */
export const installOfflineCache = () => {
  if (typeof window === "undefined") return;

  // Initial prime — wait until idle so we never delay first paint
  const kick = () => { primeOfflineCache().catch(() => {}); };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(kick, { timeout: 5000 });
  } else {
    setTimeout(kick, 2500);
  }

  // Refresh whenever the device comes back online
  window.addEventListener("online", () => {
    primeOfflineCache(true).catch(() => {});
  });
};
