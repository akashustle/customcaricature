/**
 * Tiny IndexedDB key/value cache for admin offline support.
 * - Read-first scaffold: stores the latest snapshot of any Supabase result by key.
 * - Last-write-wins write queue (foundation only — wire up per page later).
 * - No external deps. ~2KB.
 */

const DB_NAME = "ccc_admin_offline";
const DB_VERSION = 1;
const STORE_CACHE = "cache";
const STORE_QUEUE = "write_queue";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

type CacheRow<T> = { key: string; value: T; updatedAt: number };

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, "readwrite");
      tx.objectStore(STORE_CACHE).put({ key, value, updatedAt: Date.now() } satisfies CacheRow<T>);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore — offline cache is best-effort */
  }
}

export async function cacheGet<T>(key: string): Promise<{ value: T; updatedAt: number } | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, "readonly");
      const req = tx.objectStore(STORE_CACHE).get(key);
      req.onsuccess = () => {
        const row = req.result as CacheRow<T> | undefined;
        resolve(row ? { value: row.value, updatedAt: row.updatedAt } : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function cacheClear(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_CACHE, "readwrite");
      tx.objectStore(STORE_CACHE).clear();
      tx.oncomplete = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/* ── Write queue (last-write-wins) ── */

export type QueuedWrite = {
  id?: number;
  table: string;
  op: "insert" | "update" | "upsert" | "delete";
  payload: any;
  match?: Record<string, any>;
  createdAt: number;
};

export async function queueWrite(w: Omit<QueuedWrite, "id" | "createdAt">): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      tx.objectStore(STORE_QUEUE).add({ ...w, createdAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

export async function readQueue(): Promise<QueuedWrite[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, "readonly");
      const req = tx.objectStore(STORE_QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as QueuedWrite[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeQueued(id: number): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      tx.objectStore(STORE_QUEUE).delete(id);
      tx.oncomplete = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/**
 * installOfflineCache — call once on app boot.
 * Currently a no-op (cache opens lazily on first use), but exists so callers
 * have a stable lifecycle hook for future warmup logic (e.g. pre-fetching the
 * admin's most-used queries when the device is idle).
 */
export function installOfflineCache(): void {
  // Reserved for future: pre-warm openDB, register IDB persistence permission, etc.
  // Lazy open is sufficient for now and avoids cost on cold start.
}
