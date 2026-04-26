/**
 * Tiny IndexedDB-backed blob store for the offline sync queue.
 *
 * Why not just stash dataURLs in localStorage?
 *   • localStorage is capped at ~5MB and is synchronous — large photos
 *     (5–10MB each) blow the quota immediately and freeze the UI.
 *   • IndexedDB stores native Blobs efficiently, so a queued upload can
 *     survive page refreshes and **resume** from disk on reconnect without
 *     re-encoding the original File.
 *
 * Each blob is keyed by a stable id (the sync-queue action id) so the
 * upload handler can fetch the binary, retry as many times as it needs,
 * and only `delete()` once the storage upload returns success.
 */

const DB_NAME = "ccc-blob-store";
const STORE = "blobs";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
};

const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await getDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const putBlob = (key: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, key));
export const getBlob = (key: string) => tx<Blob | undefined>("readonly", (s) => s.get(key) as IDBRequest<Blob | undefined>);
export const deleteBlob = (key: string) => tx("readwrite", (s) => s.delete(key));

/** Convert a dataURL to a Blob — for legacy queue entries that pre-date IDB. */
export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};
