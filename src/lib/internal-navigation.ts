const INTERNAL_HOST_PATTERNS = [/lovable\.app$/i, /creativecaricatureclub\.com$/i];
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