/**
 * Google Analytics GA4 helper — centralised event tracking.
 * ID is hard-coded so it stays in sync with index.html.
 */

const GA_ID = "G-VVZX2RDMW3";

export const gtagEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>,
) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
};

/** Fired on every SPA route change (called by usePageTracker) */
export const gtagPageView = (path: string) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("config", GA_ID, {
      page_path: path,
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

/* ── Pre-built conversion events ── */

export const gtagBookingClick = (source: string) =>
  gtagEvent("booking_click", { event_category: "conversion", event_label: source });

export const gtagEnquirySubmit = (source: string) =>
  gtagEvent("enquiry_submit", { event_category: "conversion", event_label: source });

export const gtagWhatsAppClick = (page: string) =>
  gtagEvent("whatsapp_click", { event_category: "engagement", event_label: page });

export const gtagCtaClick = (label: string, page: string) =>
  gtagEvent("cta_click", { event_category: "engagement", event_label: label, page });

export const gtagOrderStart = (orderType: string) =>
  gtagEvent("begin_checkout", { event_category: "conversion", event_label: orderType });

export const gtagOrderComplete = (orderId: string, amount: number) =>
  gtagEvent("purchase", { transaction_id: orderId, value: amount, currency: "INR" });

export const gtagBlogView = (slug: string) =>
  gtagEvent("blog_view", { event_category: "content", event_label: slug });

export const gtagShareClick = (contentType: string, itemId: string) =>
  gtagEvent("share", { content_type: contentType, item_id: itemId });

export const gtagFormStart = (formName: string) =>
  gtagEvent("form_start", { event_category: "engagement", event_label: formName });

export const gtagSignUp = () =>
  gtagEvent("sign_up", { method: "email" });

export const gtagLogin = () =>
  gtagEvent("login", { method: "email" });
