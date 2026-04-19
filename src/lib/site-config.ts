/**
 * Site configuration & external links.
 *
 * Brand structure:
 *  - MAIN_SITE_URL = the public-facing brand site (creativecaricatureclub.com).
 *    Use this for "back to main site" CTAs, footer brand link, and outbound shares.
 *  - PORTAL_URL  = this app — the event-booking & order portal.
 *    Use this for canonical URLs of order/event pages and admin links.
 *
 * Always import from this file instead of hard-coding the domain.
 */
export const MAIN_SITE_URL = "https://creativecaricatureclub.com";
export const PORTAL_URL = "https://portal.creativecaricatureclub.com";

export const BRAND_NAME = "Creative Caricature Club™";
export const BRAND_SHORT = "CCC";

/** Use for CTAs that should leave the booking portal and go to the main brand site. */
export const mainSiteLink = (path = "") =>
  `${MAIN_SITE_URL}${path.startsWith("/") ? path : path ? `/${path}` : ""}`;

/** Use for canonical / shareable URLs that live inside this booking portal. */
export const portalLink = (path = "") =>
  `${PORTAL_URL}${path.startsWith("/") ? path : path ? `/${path}` : ""}`;
