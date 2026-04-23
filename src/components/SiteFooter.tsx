import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT = {
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
        { label: "Book Live Event", href: "/book-event" },
        { label: "Get a Quote", href: "/enquiry" },
        { label: "Track Order", href: "/track-order" },
        { label: "Workshop", href: "/workshop" },
        { label: "Shop", href: "/shop" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Blog", href: "/blog" },
        { label: "Gallery", href: "/gallery/events" },
        { label: "FAQs", href: "/faqs" },
        { label: "Support", href: "/support" },
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
  ] as { title: string; links: { label: string; href: string }[] }[],
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

const SiteFooter = () => {
  const [override, setOverride] = useState<any>(cached);

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
  const cols = Array.isArray(f.columns) && f.columns.length ? f.columns : DEFAULT.columns;
  const igHandle = (f.credit_instagram_handle || "akashustle").replace(/^@/, "");

  return (
    <footer className="px-3 sm:px-4 my-6 mb-24 md:mb-6">
      <div className="mx-auto max-w-7xl rounded-3xl bg-hero-violet border border-border/40 p-5 sm:p-10">
        {/* Brand */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="CCC" className="w-10 h-10 rounded-lg" />
            <div className="text-lg font-extrabold text-foreground tracking-tight leading-tight">
              Creative<br />
              <span className="text-gradient-violet">Caricature Club™</span>
            </div>
          </div>
          <p className="text-sm text-foreground/70 mt-3 max-w-xl">{f.brand_tagline}</p>
        </div>

        {/* Mobile: 2-row compact links */}
        <div className="sm:hidden grid grid-cols-2 gap-x-4 gap-y-5 mb-6">
          {cols.map((c: any) => (
            <div key={c.title}>
              <div className="text-[11px] font-bold text-foreground tracking-wider uppercase mb-2">
                {c.title}
              </div>
              <ul className="space-y-1.5">
                {(c.links || []).slice(0, 5).map((l: any) => (
                  <li key={l.href + l.label}>
                    <a
                      href={l.href}
                      className="text-[13px] text-foreground/75 hover:text-primary transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Desktop: original column grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {cols.map((c: any) => (
            <div key={c.title}>
              <div className="text-sm font-bold text-foreground tracking-wider uppercase mb-3">
                {c.title}
              </div>
              <ul className="space-y-2">
                {(c.links || []).map((l: any) => (
                  <li key={l.href + l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-foreground/75 hover:text-primary transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
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
  );
};

export default SiteFooter;
