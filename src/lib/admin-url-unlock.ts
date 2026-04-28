/**
 * Admin URL unlock — keeps /customcad75, /CFCAdmin936 and /cccworkshop2006
 * permanently 404 unless the visitor explicitly proves they're an admin
 * (via secret keystroke on /login OR via main-admin SSO handoff).
 *
 * Flags are kept in sessionStorage so they vanish when the tab/browser closes.
 * A device fingerprint is also stored so we can match "this device is the
 * same one that unlocked it" for an extra signal.
 */

const KEYS = {
  main: "ccc_admin_url_main_ok",
  shop: "ccc_admin_url_shop_ok",
  workshop: "ccc_admin_url_workshop_ok",
  fp: "ccc_admin_device_fp",
  fpAllow: "ccc_admin_device_fp_ok",
} as const;

export type AdminUrlSlot = "main" | "shop" | "workshop";

const safeWindow = () => (typeof window !== "undefined" ? window : null);

/** Stable per-device/browser fingerprint. Pure-string, no external libs. */
export const computeDeviceFingerprint = (): string => {
  const w = safeWindow();
  if (!w) return "ssr";
  const parts = [
    navigator.userAgent || "",
    navigator.language || "",
    String(screen?.width || 0),
    String(screen?.height || 0),
    String(screen?.colorDepth || 0),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || "0",
    (navigator as any).deviceMemory?.toString() || "0",
  ];
  // Lightweight hash → hex
  let h = 0x811c9dc5;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
};

export const rememberDeviceFingerprint = () => {
  const w = safeWindow();
  if (!w) return;
  const fp = computeDeviceFingerprint();
  localStorage.setItem(KEYS.fp, fp);
  localStorage.setItem(KEYS.fpAllow, fp);
};

export const isDeviceFingerprintTrusted = (): boolean => {
  const w = safeWindow();
  if (!w) return false;
  const stored = localStorage.getItem(KEYS.fpAllow);
  if (!stored) return false;
  return stored === computeDeviceFingerprint();
};

const slotKey = (slot: AdminUrlSlot) =>
  slot === "main" ? KEYS.main : slot === "shop" ? KEYS.shop : KEYS.workshop;

export const unlockAdminUrl = (slot: AdminUrlSlot | "all" = "all") => {
  const w = safeWindow();
  if (!w) return;
  const slots: AdminUrlSlot[] = slot === "all" ? ["main", "shop", "workshop"] : [slot];
  slots.forEach(s => sessionStorage.setItem(slotKey(s), String(Date.now())));
  rememberDeviceFingerprint();
};

export const isAdminUrlUnlocked = (slot: AdminUrlSlot): boolean => {
  const w = safeWindow();
  if (!w) return false;
  return !!sessionStorage.getItem(slotKey(slot));
};

export const lockAdminUrl = (slot: AdminUrlSlot | "all" = "all") => {
  const w = safeWindow();
  if (!w) return;
  const slots: AdminUrlSlot[] = slot === "all" ? ["main", "shop", "workshop"] : [slot];
  slots.forEach(s => sessionStorage.removeItem(slotKey(s)));
};

/**
 * Listen for a secret keystroke sequence on the page. Calls onMatch when the
 * user types the secret in order. Returns a cleanup function.
 *
 * Default secret: "ccc999"  (case-insensitive, ignores everything else).
 */
export const installSecretKeystroke = (
  onMatch: () => void,
  secret = "ccc999"
): (() => void) => {
  const w = safeWindow();
  if (!w) return () => {};
  let buffer = "";
  let timer: number | null = null;
  const reset = () => { buffer = ""; };
  const handler = (e: KeyboardEvent) => {
    // Ignore typing inside inputs/textarea/contenteditable so it never collides
    const target = e.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (target as any).isContentEditable) return;
    }
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-secret.length);
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(reset, 2500);
    if (buffer === secret.toLowerCase()) {
      reset();
      onMatch();
    }
  };
  window.addEventListener("keydown", handler);
  return () => {
    window.removeEventListener("keydown", handler);
    if (timer) window.clearTimeout(timer);
  };
};
