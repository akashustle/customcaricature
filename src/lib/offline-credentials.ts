/**
 * Offline credential cache for the registration / login flow.
 *
 * On a successful online login we cache the user's identifier + password using
 * Web Crypto AES-GCM with a key derived from a per-device secret stored in
 * localStorage. When the user later opens the app offline, the login screen
 * can validate against the cached hash so they're not locked out of their
 * dashboard, queued orders or workshop content.
 *
 * IMPORTANT: this is offline UX only — the real source of truth is always
 * Supabase Auth. We never use the cached value to mint a token; we only
 * use it to (a) recognise the user is "the same person who logged in before"
 * and (b) optionally replay the credential against Supabase the moment we
 * detect a network. Any cached credential is wiped on explicit logout.
 */

const STORAGE_KEY = "ccc:offline-credentials:v1";
const DEVICE_KEY  = "ccc:offline-credentials-device-key:v1";

type Stored = {
  identifier: string;          // email or phone-form identifier
  iv: string;                  // base64
  cipher: string;              // base64 of {password}
  createdAt: number;
};

const b64encode = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

const b64decode = (s: string) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const getDeviceSecret = (): string => {
  let s = localStorage.getItem(DEVICE_KEY);
  if (!s) {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    s = b64encode(buf.buffer);
    localStorage.setItem(DEVICE_KEY, s);
  }
  return s;
};

const deriveKey = async (): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw", enc.encode(getDeviceSecret()), { name: "PBKDF2" }, false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("ccc-offline-cred-v1"), iterations: 50_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt", "decrypt"],
  );
};

export const saveCredentials = async (identifier: string, password: string) => {
  if (typeof window === "undefined" || !crypto?.subtle) return;
  try {
    const key = await deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(password),
    );
    const payload: Stored = {
      identifier: identifier.trim().toLowerCase(),
      iv: b64encode(iv.buffer),
      cipher: b64encode(cipher),
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* fail closed — offline login just won't be available */
  }
};

export const clearCredentials = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {/* ignore */}
};

export const getCachedIdentifier = (): string | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as Stored).identifier;
  } catch { return null; }
};

/**
 * Verify an identifier + password against the local cache. Returns true only
 * if both match. Used as an offline-only fallback when navigator.onLine is
 * false and Supabase is unreachable.
 */
export const verifyOfflineCredentials = async (identifier: string, password: string): Promise<boolean> => {
  if (typeof window === "undefined" || !crypto?.subtle) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as Stored;
    if (stored.identifier !== identifier.trim().toLowerCase()) return false;
    const key = await deriveKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(stored.iv) },
      key,
      b64decode(stored.cipher),
    );
    return new TextDecoder().decode(plain) === password;
  } catch { return false; }
};

export const hasCachedCredentials = () => {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
};
