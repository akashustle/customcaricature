import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSetting } from "@/hooks/useSiteSetting";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Instagram, Youtube, Facebook, Sparkles, Pause, Mail, Globe, ExternalLink, MessagesSquare } from "lucide-react";
import { MAIN_SITE_URL } from "@/lib/site-config";
import { openExternal } from "@/lib/pwa-link";

type Link = { label: string; href?: string; coming_soon?: boolean; external?: boolean; icon?: string };
type Column = { title: string; links: Link[] };

const DEFAULT: {
  brand_tagline: string;
  copyright: string;
  tagline_right: string;
  credit_prefix: string;
  credit_name: string;
  credit_instagram_handle: string;
  columns: Column[];
} = {
  brand_tagline:
    "India's #1 live caricature studio. Professional artists for weddings, corporate parties, baby showers and brand activations across India and worldwide.",
  copyright: `© ${new Date().getFullYear()} Creative Caricature Club. All rights reserved.`,
  tagline_right: "Made with ❤️ for live events.",
  credit_prefix: "Designed and prompted by",
  credit_name: "Akash",
  credit_instagram_handle: "akashustle",
  columns: [
    {
      title: "Services",
      links: [
        { label: "Book an Event", href: "/book-event" },
        { label: "Workshop", href: "/workshop" },
        { label: "AI Caricature", coming_soon: true },
        { label: "Order Caricature", coming_soon: true },
        { label: "Shop", coming_soon: true },
        { label: "The Lil Flea", href: "/lil-flea" },
        { label: "Custom Caricature", coming_soon: true },
        { label: "Merchandise", coming_soon: true },
      ],
    },
    {
      title: "Quick Links",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Blog", href: "/blog" },
        { label: "Explore", href: "/explore" },
        { label: "FAQs", href: "/faqs" },
        { label: "Get a Quote", href: "/enquiry" },
        { label: "Track Order", href: "/track-order" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Event Gallery", href: "/gallery/events" },
        { label: "Lil Flea Gallery", href: "/lil-flea-gallery" },
        { label: "Caricature Budgeting", href: "/caricature-budgeting" },
        { label: "Support", href: "/support" },
        { label: "Download App", href: "/download" },
      ],
    },
    {
      title: "Talk to us",
      links: [
        { label: "WhatsApp", icon: "whatsapp" },
        { label: "Call Us", icon: "phone" },
        { label: "Email Us", icon: "email" },
        { label: "Live Chat", href: "/live-chat", icon: "livechat" },
        { label: "Instagram", icon: "instagram" },
        { label: "YouTube", icon: "youtube" },
        { label: "Facebook", icon: "facebook" },
        { label: "Main Web", href: "https://creativecaricatureclub.com", external: true, icon: "website" },
      ],
    },
    {
      title: "Policies",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Refund Policy", href: "/refund" },
        { label: "Cancellation", href: "/cancellation" },
        { label: "Shipping Policy", href: "/shipping" },
        { label: "Event Policy", href: "/event-policy" },
        { label: "Workshop Policy", href: "/workshop-policy" },
        { label: "Intellectual Property", href: "/intellectual-property" },
        { label: "Disclaimer", href: "/disclaimer" },
      ],
    },
  ],
};

let cached: any = null;
let promise: Promise<any> | null = null;
const fetchFooter = async () => {
  if (cached) return cached;
  if (promise) return promise;
  promise = (async () => {
    const { data } = await supabase
      .from("admin_site_settings")
      .select("value")
      .eq("id", "homepage_footer")
      .maybeSingle();
    cached = data?.value || null;
    promise = null;
    return cached;
  })();
  return promise;
};

const ContactIcon = ({ name }: { name?: string }) => {
  const cls = "w-3.5 h-3.5";
  if (name === "whatsapp") return <MessageCircle className={cls} />;
  if (name === "phone") return <Phone className={cls} />;
  if (name === "email") return <Mail className={cls} />;
  if (name === "instagram") return <Instagram className={cls} />;
  if (name === "youtube") return <Youtube className={cls} />;
  if (name === "facebook") return <Facebook className={cls} />;
  if (name === "website") return <Globe className={cls} />;
  if (name === "livechat") return <MessagesSquare className={cls} />;
  return null;
};

const WA_PREFILL = "Hi Creative Caricature Club! 👋 I just visited your website and would love to know more about your live caricature services for my event. Can you help me?";

const SiteFooter = () => {
  const [override, setOverride] = useState<any>(cached);
  const [comingSoonOpen, setComingSoonOpen] = useState<string | null>(null);
  const contact = useSiteSetting<any>("global_contact", {});

  useEffect(() => {
    let mounted = true;
    fetchFooter().then((v) => {
      if (mounted) setOverride(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const f = { ...DEFAULT, ...(override || {}) };
  // Always merge fresh defaults if admin hasn't migrated to new column layout yet.
  // If saved footer columns don't include "Talk" + "Policies", fall back to DEFAULT.columns.
  const savedCols: Column[] = Array.isArray(f.columns) && f.columns.length ? f.columns : [];
  const hasNewLayout =
    savedCols.some((c) => /talk|contact/i.test(c.title)) &&
    savedCols.some((c) => /polic|legal/i.test(c.title)) &&
    savedCols.some((c) => /resource|quick/i.test(c.title));
  const cols: Column[] = hasNewLayout ? savedCols : DEFAULT.columns;

  const igHandle = (contact?.instagram_handle || f.credit_instagram_handle || "akashustle").replace(/^@/, "");
  const wa = (contact?.whatsapp_number || "918369594271").replace(/[^0-9]/g, "");
  const phone = contact?.phone_number || contact?.whatsapp_number || "918369594271";
  const email = contact?.email || "creativecaricatureclub@gmail.com";
  const igUrl = contact?.instagram_url || `https://instagram.com/creativecaricatureclub`;
  const ytUrl = contact?.youtube_url || `https://www.youtube.com/@creativecaricatureclub`;
  const waMessage = contact?.whatsapp_prefill_message || WA_PREFILL;

  const fbUrl = contact?.facebook_url || `https://facebook.com/creativecaricatureclub`;

  const resolveContactHref = (icon?: string, fallbackHref?: string) => {
    if (icon === "whatsapp") return `https://wa.me/${wa}?text=${encodeURIComponent(waMessage)}`;
    if (icon === "phone") return `tel:+${phone.replace(/[^0-9]/g, "")}`;
    if (icon === "email") return `mailto:${email}?subject=${encodeURIComponent("Enquiry from website")}`;
    if (icon === "instagram") return igUrl;
    if (icon === "youtube") return ytUrl;
    if (icon === "facebook") return fbUrl;
    if (icon === "website") return fallbackHref || MAIN_SITE_URL;
    if (icon === "livechat") return fallbackHref || "/live-chat";
    return fallbackHref || "#";
  };

  // External / outbound icons that should leave the app via openExternal.
  const OUTBOUND_ICONS = new Set(["whatsapp", "phone", "email", "instagram", "youtube", "facebook", "website"]);

  const handleLinkClick = (e: React.MouseEvent, link: Link) => {
    if (link.coming_soon) {
      e.preventDefault();
      setComingSoonOpen(link.label);
      return;
    }
    const isOutbound = (link.icon && OUTBOUND_ICONS.has(link.icon)) || link.external;
    if (isOutbound) {
      e.preventDefault();
      const href = link.icon && OUTBOUND_ICONS.has(link.icon)
        ? resolveContactHref(link.icon, link.href)
        : (link.href || "#");
      openExternal(href);
    }
    // Internal links (e.g. Live Chat → /live-chat) fall through to default <a> nav.
  };

  const renderLink = (l: Link) => {
    const isOutbound = (l.icon && OUTBOUND_ICONS.has(l.icon)) || l.external;
    const href = isOutbound
      ? resolveContactHref(l.icon, l.href)
      : (l.href || "#");
    const externalProps = isOutbound ? { target: "_blank" as const, rel: "noopener noreferrer" } : {};
    const baseClass = "text-foreground/75 hover:text-primary transition-colors flex items-center gap-1.5 leading-snug cursor-pointer";
    return (
      <a
        href={l.coming_soon ? "#" : href}
        onClick={(e) => handleLinkClick(e, l)}
        className={baseClass}
        {...(!l.coming_soon ? externalProps : {})}
      >
        {l.icon && <ContactIcon name={l.icon} />}
        <span className="truncate">{l.label}</span>
        {l.coming_soon && <Pause className="w-3 h-3 text-warning flex-shrink-0" aria-label="Coming soon" />}
      </a>
    );
  };

  return (
    <>
      <footer className="px-3 sm:px-4 my-6 mb-24 md:mb-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-hero-violet border border-border/40 p-6 sm:p-10 lg:p-12">
          {/* Brand */}
          <div className="mb-7 sm:mb-10 max-w-xl">
            <a
              href={MAIN_SITE_URL}
              onClick={(e) => { e.preventDefault(); openExternal(MAIN_SITE_URL); }}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 mb-3 group"
            >
              <img src="/logo.png" alt="Creative Caricature Club" className="w-11 h-11 rounded-xl shadow-sm"  loading="lazy" decoding="async" />
              <div className="text-lg font-extrabold tracking-tight leading-tight">
                <span className="text-gradient-violet">Creative</span><br />
                <span className="text-gradient-violet">Caricature Club</span>
                <span className="align-super text-[0.55em] font-semibold text-foreground/60 ml-0.5">™</span>
              </div>
            </a>
            <p className="text-sm text-foreground/70 mt-3">{f.brand_tagline}</p>
            <a
              href={MAIN_SITE_URL}
              onClick={(e) => { e.preventDefault(); openExternal(MAIN_SITE_URL); }}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <Globe className="w-3.5 h-3.5" /> Main Web <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Mobile: 2 cols (shows up to 6 columns wrapped) */}
          <div className="sm:hidden grid grid-cols-2 gap-x-4 gap-y-5 mb-6">
            {cols.slice(0, 6).map((c) => (
              <div key={c.title}>
                <div className="text-[11px] font-bold text-foreground tracking-wider uppercase mb-2">
                  {c.title}
                </div>
                <ul className="space-y-1.5 text-[13px]">
                  {(c.links || []).slice(0, 12).map((l, i) => (
                    <li key={(l.href || l.label) + i}>{renderLink(l)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Desktop: auto-grid up to 5 columns */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-8">
            {cols.map((c) => (
              <div key={c.title}>
                <div className="text-sm font-bold text-foreground tracking-wider uppercase mb-3">
                  {c.title}
                </div>
                <ul className="space-y-2 text-sm">
                  {(c.links || []).map((l, i) => (
                    <li key={(l.href || l.label) + i}>{renderLink(l)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground text-center sm:text-left">
            <p>{f.copyright}</p>
            <p className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="hidden sm:inline">{f.tagline_right}</span>
              <span className="hidden sm:inline opacity-50">·</span>
              <span>{f.credit_prefix}</span>
              <a
                href={`https://instagram.com/${igHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
                aria-label={`${f.credit_name} on Instagram`}
              >
                {f.credit_name}
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Coming soon modal */}
      <Dialog open={!!comingSoonOpen} onOpenChange={(o) => !o && setComingSoonOpen(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-2">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              {comingSoonOpen}
            </DialogTitle>
            <DialogDescription className="text-center pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 text-warning px-3 py-1 text-xs font-semibold mb-3">
                <Pause className="w-3 h-3" />
                {comingSoonOpen && /order caricature|custom caricature/i.test(comingSoonOpen)
                  ? "Paused due to high demand"
                  : "Coming soon"}
              </span>
              <br />
              {comingSoonOpen && /order caricature|custom caricature/i.test(comingSoonOpen)
                ? "We're temporarily paused due to overwhelming demand 🎨 — our artists are catching up. Please check back shortly or message us on WhatsApp to be notified."
                : "We're polishing this experience and it's coming soon. In the meantime, explore our other services or get in touch — we'd love to help."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild className="rounded-full">
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi! I'm interested in ${comingSoonOpen}. When will it be available?`)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Us
              </a>
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setComingSoonOpen(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SiteFooter;
