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

  if (isStandalonePWA()) {
    // Stay inside the PWA — same-window navigation. The browser will still
    // hand off tel:/mailto:/whatsapp: to the OS automatically.
    window.location.assign(url);
    return;
  }

  // Regular tab: system schemes use same-window so the OS opens its handler.
  if (SYSTEM_SCHEMES.some((s) => lower.startsWith(s))) {
    window.location.href = url;
    return;
  }

  // Everything else: new tab with safe rel.
  window.open(url, "_blank", "noopener,noreferrer");
};
