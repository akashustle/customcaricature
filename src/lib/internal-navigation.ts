// Only the Lovable preview/published hosts and the app's *portal* subdomain
// are treated as "internal". The marketing root (creativecaricatureclub.com)
// is intentionally NOT internal — it is a separate site and must open in a
// real browser tab when users click "Main Web" from the portal footer.
const INTERNAL_HOST_PATTERNS = [
  /lovable\.app$/i,
  /lovableproject\.com$/i,
  /^portal\.creativecaricatureclub\.com$/i,
];
const SOCIAL_HOST_PATTERNS = [
  /(^|\.)instagram\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)threads\.net$/i,
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)wa\.me$/i,
  /(^|\.)whatsapp\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)linkedin\.com$/i,
];

const isSocialHost = (hostname: string) => SOCIAL_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
const isInternalHost = (hostname: string) => INTERNAL_HOST_PATTERNS.some((pattern) => pattern.test(hostname));

export const normalizeInternalNavigationTarget = (href?: string | null) => {
  if (typeof window === "undefined") return null;
  if (!href) return null;

  const trimmedHref = href.trim();
  if (!trimmedHref || trimmedHref.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(trimmedHref)) return null;

  if (trimmedHref.startsWith("/")) {
    return trimmedHref;
  }

  try {
    const parsed = new URL(trimmedHref, window.location.origin);
    const hostname = parsed.hostname.toLowerCase();

    if (isSocialHost(hostname)) return null;

    if (parsed.origin === window.location.origin || isInternalHost(hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    }
  } catch {
    return null;
  }

  return null;
};

export const navigateInternally = (href?: string | null) => {
  const target = normalizeInternalNavigationTarget(href);
  if (!target || typeof window === "undefined") {
    if (href) window.location.assign(href);
    return;
  }

  window.dispatchEvent(new CustomEvent("ccc:navigate-internal", { detail: { to: target } }));
};