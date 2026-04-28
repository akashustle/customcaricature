/**
 * PWA-aware link opener.
 *
 * When the app is running as an installed PWA (display-mode: standalone),
 * we want outbound links to stay inside the app shell instead of opening
 * a separate browser tab. This keeps the user inside our experience and
 * matches how native apps behave.
 *
 * Behaviour:
 *  - PWA / standalone:
 *      • tel:, mailto:, sms:, whatsapp:, intent:  → window.location.assign
 *        (these always need to leave the webview to hit the OS handler)
 *      • everything else                           → window.location.assign
 *        (in-app navigation; no new tab)
 *  - Regular browser tab:
 *      • opens a new tab/window with rel=noopener as usual
 *
 * Use `openExternal(url)` from any onClick handler to honour this rule
 * everywhere in the app.
 */

export const isStandalonePWA = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    if ((window.navigator as any).standalone === true) return true; // iOS Safari
  } catch {
    /* ignore */
  }
  return false;
};

/** Schemes that always need to leave the web context to hit the OS. */
const SYSTEM_SCHEMES = ["tel:", "mailto:", "sms:", "whatsapp:", "intent:"];

export const openExternal = (url: string) => {
  if (!url || url === "#") return;
  const lower = url.toLowerCase();

  // System schemes always hand off to the OS handler.
  if (SYSTEM_SCHEMES.some((s) => lower.startsWith(s))) {
    window.location.href = url;
    return;
  }

  // True cross-origin http(s) links → always open in a new tab/window so the
  // PWA shell isn't replaced by the external site. The wrapped window.open
  // in main.tsx will only intercept when the URL is recognised as internal.
  try {
    const parsed = new URL(url, window.location.origin);
    const isCrossOrigin = parsed.origin !== window.location.origin;
    if (isCrossOrigin) {
      const win = window.open(url, "_blank", "noopener,noreferrer");
      // Standalone PWA without a popup permission falls back to in-place nav.
      if (!win && isStandalonePWA()) window.location.assign(url);
      return;
    }
  } catch {/* fall through */}

  // Same-origin → in-app navigation.
  window.location.assign(url);
};
