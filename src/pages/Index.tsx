import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Calendar, Sparkles, Star, Plus, Minus,
  CheckCircle2, Users, Award, Quote, Trophy, Heart, Image as ImageIcon, PlayCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useMaintenanceCheck } from "@/hooks/useMaintenanceCheck";
import { useHomepageContent } from "@/hooks/useHomepageContent";
import SEOHead from "@/components/SEOHead";
import JsonLd from "@/components/JsonLd";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import FloatingNav from "@/components/FloatingNav";
import HomepageUrgencyStrip from "@/components/homepage/HomepageUrgencyStrip";
import HomepageStickyCTA from "@/components/homepage/HomepageStickyCTA";
import HomepageVideo from "@/components/homepage/HomepageVideo";
import HomepageTrustedBrands from "@/components/HomepageTrustedBrands";

import g1 from "@/assets/gallery/gallery-1.jpeg";
import g2 from "@/assets/gallery/gallery-2.jpeg";
import g3 from "@/assets/gallery/gallery-3.jpeg";
import g4 from "@/assets/gallery/gallery-4.jpeg";
import g5 from "@/assets/gallery/gallery-5.jpeg";
import g6 from "@/assets/gallery/gallery-6.jpeg";
import g7 from "@/assets/gallery/gallery-7.jpeg";
import g8 from "@/assets/gallery/gallery-8.jpeg";

const fallbackImages = [g1, g2, g3, g4, g5, g6, g7, g8];

/* ----------------------------- Section Wrapper ---------------------------- */

const Section = ({
  id, eyebrow, title, subtitle, children, soft = false, className = "",
}: {
  id?: string; eyebrow?: string; title?: React.ReactNode; subtitle?: React.ReactNode;
  children: React.ReactNode; soft?: boolean; className?: string;
}) => (
  <section id={id} className={`px-3 sm:px-4 my-5 sm:my-6 ${className}`}>
    <div className={`mx-auto max-w-6xl rounded-3xl p-5 sm:p-10 lg:p-14 ${soft ? "bg-section-soft" : "card-soft-white"}`}>
      {(eyebrow || title) && (
        <div className="text-center mb-7 sm:mb-12">
          {eyebrow && <div className="chip-violet mb-4">{eyebrow}</div>}
          {title && (
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              {title}
            </h2>
          )}
          {subtitle && <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  </section>
);

/* ----------------------- Hero with continuous marquee ---------------------- */

const HeroMarquee = ({ images }: { images: string[] }) => {
  // Duplicate the array so the -50% transform creates a seamless loop
  const tracks = [...images, ...images];
  const duration = Math.max(28, images.length * 4);
  return (
    <div className="marquee-mask overflow-hidden mt-10 sm:mt-14">
      <div
        className="marquee-track gap-3 sm:gap-4"
        style={{ ["--marquee-duration" as any]: `${duration}s` }}
      >
        {tracks.map((src, i) => (
          <div
            key={i}
            className="shrink-0 w-56 sm:w-72 md:w-80 lg:w-96 aspect-[3/4] rounded-2xl overflow-hidden border border-border/40 bg-card shadow-[0_20px_50px_-25px_hsl(252_60%_40%/0.35)]"
          >
            <img
              src={src}
              alt={`Live caricature ${(i % images.length) + 1}`}
              className="w-full h-full object-cover"
              loading={i < 4 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const Hero = ({ onBook, onQuote, images }: { onBook: () => void; onQuote: () => void; images: string[] }) => (
  <section className="relative px-3 sm:px-4 mt-3">
    <div className="mx-auto max-w-6xl rounded-3xl bg-hero-violet overflow-hidden border border-border/40">
      <div className="px-4 sm:px-10 lg:px-14 pt-10 sm:pt-16 lg:pt-24 pb-8 sm:pb-14 lg:pb-20 text-center">
        <div className="chip-violet mx-auto mb-5 sm:mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          India's #1 Live Caricature Studio
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-foreground leading-[0.95]">
          Live <span className="text-gradient-violet">Caricature</span>
          <br />
          For Unforgettable Events
        </h1>
        <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-sm sm:text-lg text-foreground/70 px-2">
          Book professional caricature artists for weddings, corporate parties, baby showers
          &amp; brand activations across India and worldwide.
        </p>
        <div className="mt-6 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={onBook} className="btn-square-violet w-full sm:w-auto justify-center">
            <Calendar className="w-5 h-5" /> Book Your Event <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onQuote} className="btn-square-outline w-full sm:w-auto justify-center">
            <Sparkles className="w-5 h-5" /> Get Free Quote
          </button>
        </div>
      </div>
      {/* Continuous right-to-left marquee */}
      <HeroMarquee images={images} />
      <div className="h-6 sm:h-10" />
    </div>
  </section>
);

/* ------------------------------- Stat Strip ------------------------------ */

const Stats = ({ items }: { items: { label: string; value: string }[] }) => {
  const icons = [Calendar, Users, Award, Star];
  return (
    <Section id="stats">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {items.map((s, i) => {
          const Icon = icons[i % icons.length];
          return (
            <div key={s.label} className="rounded-2xl bg-secondary/60 border border-border/30 p-4 sm:p-5 text-center">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-primary mb-2" />
              <div className="text-xl sm:text-3xl font-extrabold text-foreground">{s.value}</div>
              <div className="text-[11px] sm:text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

/* ----------------------------- Event Gallery ----------------------------- */

const EventGallery = ({ images, onView }: { images: string[]; onView: () => void }) => {
  if (images.length === 0) return null;
  const preview = images.slice(0, 8);
  return (
    <Section
      id="gallery"
      eyebrow="Live Events • Live Events"
      title={<>Our <span className="text-gradient-violet">event gallery</span></>}
      subtitle="Real moments from real events — weddings, corporate parties, baby showers and brand activations."
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
        {preview.map((src, i) => (
          <div key={i} className={`rounded-2xl overflow-hidden border border-border/40 bg-card ${i === 0 ? "md:row-span-2 md:col-span-2 aspect-square md:aspect-auto" : "aspect-[4/5]"}`}>
            <img src={src} alt={`Event ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
      <div className="text-center mt-7">
        <button onClick={onView} className="btn-square-violet">
          <ImageIcon className="w-4 h-4" /> View Full Gallery <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Section>
  );
};

/* -------------------------------- Services ------------------------------- */

const Services = ({ onBook }: { onBook: () => void }) => {
  const items = [
    { icon: Calendar, title: "Live Event Caricatures", body: "Professional artists drawing guests live at weddings, corporate parties, baby showers and brand activations across India." },
    { icon: Sparkles, title: "International Bookings", body: "We travel worldwide. Custom packages for destination weddings and global corporate events." },
    { icon: Trophy, title: "Brand Activations", body: "Engage your audience at expos, mall activations and product launches with on-the-spot caricatures." },
    { icon: Heart, title: "Personal Celebrations", body: "Birthdays, anniversaries, baby showers, retirements — make every guest feel special." },
  ];
  return (
    <Section
      id="services"
      eyebrow="Services • Services"
      title={<>What we <span className="text-gradient-violet">do best</span></>}
      subtitle="Our full focus is on live event caricatures — fast, fun, photo-perfect entertainment your guests will remember forever."
    >
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {items.map((s) => (
          <div key={s.title} className="card-gradient-blob p-5 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{s.title}</h3>
                <p className="text-sm sm:text-base text-foreground/70 mt-1.5">{s.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-8">
        <button onClick={onBook} className="btn-square-violet">
          <Calendar className="w-4 h-4" /> Book for your event <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Section>
  );
};

/* -------------------------- How it Starts -------------------------------- */

const HowItStarts = ({ onBook, images }: { onBook: () => void; images: string[] }) => {
  const steps = [
    { n: "1", title: "Share your event", body: "Tell us your date, city, guest count and event type. We'll match the right artists." },
    { n: "2", title: "Lock the booking", body: "Pay a small advance to confirm your slot. We handle artists, travel and logistics." },
    { n: "3", title: "Wow your guests", body: "Our artists arrive on time and create stunning live caricatures your guests take home." },
  ];
  const previews = (images.length >= 4 ? images : fallbackImages).slice(0, 4);
  return (
    <Section
      id="how"
      eyebrow="Onboarding • Onboarding"
      title={<>How it <span className="text-gradient-violet">starts?</span></>}
    >
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="space-y-6">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4 sm:gap-5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center shrink-0 border-2 border-primary/20">
                {s.n}
              </div>
              <div className="pt-1">
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{s.title}</h3>
                <p className="text-foreground/70 mt-1 text-sm sm:text-base">{s.body}</p>
              </div>
            </div>
          ))}
          <button onClick={onBook} className="btn-square-violet mt-3">
            <Calendar className="w-4 h-4" /> Start your booking
          </button>
        </div>
        <div className="card-gradient-blob p-4 sm:p-8">
          <div className="grid grid-cols-2 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="rounded-2xl overflow-hidden aspect-square border border-border/40">
                <img src={src} alt={`Live event caricature ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};

/* ------------------------------- Why Us / VS ----------------------------- */

const WhyUnique = () => {
  const others = ["Slow turnaround time", "Inconsistent artist quality", "Hidden charges & surprises", "Hard to reach when needed"];
  const ours = ["On-time, every time", "Trained, vetted top artists", "Transparent flat pricing", "Dedicated event manager"];
  return (
    <Section
      id="why-us"
      eyebrow="Special • Special"
      title={<>What makes us <span className="text-gradient-violet">unique?</span></>}
      subtitle="Creative Caricature Club V/S Others"
    >
      <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
        <div className="rounded-2xl bg-secondary/40 border border-border/40 p-5 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold tracking-wider text-foreground/70">OTHERS</div>
          <ul className="mt-5 space-y-3">
            {others.map((t) => (
              <li key={t} className="flex items-center gap-3 text-foreground/70 text-sm sm:text-base">
                <Minus className="w-5 h-5 rounded-full p-1 bg-foreground/10" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-card border border-primary/20 p-5 sm:p-8 shadow-[0_20px_60px_-30px_hsl(252_85%_62%/0.45)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1.5 text-xs font-bold tracking-wider text-white">CREATIVE CARICATURE CLUB</div>
          <ul className="mt-5 space-y-3">
            {ours.map((t) => (
              <li key={t} className="flex items-center gap-3 text-foreground font-medium text-sm sm:text-base">
                <CheckCircle2 className="w-5 h-5 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
};

/* --------------------------------- Reviews ------------------------------- */

const Reviews = () => {
  const reviews = [
    { name: "Naman D.", role: "Wedding · Mumbai", text: "Booked 3 artists for our reception — guests loved their caricatures so much they were the talk of the night!" },
    { name: "Rahul R.", role: "Corporate Event · Delhi", text: "Smooth booking, professional artists, perfect timing. Our team got 200+ caricatures done in 4 hours flawlessly." },
    { name: "Priya S.", role: "Baby Shower · Bengaluru", text: "Such a unique gift idea for guests! Everyone took home their own caricature. Highly recommend." },
  ];
  return (
    <Section
      id="reviews"
      eyebrow="Reviews • Reviews"
      title={<>Hear from <span className="text-gradient-violet">them</span></>}
    >
      <div className="grid md:grid-cols-3 gap-5">
        {reviews.map((r, i) => (
          <div key={i} className="card-gradient-blob p-5 sm:p-6 flex flex-col">
            <Quote className="w-7 h-7 text-primary/40" />
            <p className="mt-3 text-foreground/80 leading-relaxed text-sm sm:text-base">{r.text}</p>
            <div className="mt-5 pt-5 border-t border-border/40">
              <div className="font-bold text-foreground">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.role}</div>
            </div>
            <div className="flex gap-0.5 mt-3">
              {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-warning text-warning" />)}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

/* --------------------------------- FAQs ---------------------------------- */

const FAQs = () => {
  const items = [
    { q: "Why should I choose Creative Caricature Club over other studios?", a: "We are India's largest live-caricature network — 12+ years of craft, 800+ events, vetted top artists, transparent flat pricing and a dedicated event manager for every booking." },
    { q: "How far in advance should I book my event?", a: "We recommend 2–4 weeks for weddings and corporate events. For peak season (Nov–Feb) lock your date as early as possible. Last-minute bookings may still be possible based on availability." },
    { q: "Do you travel outside Mumbai or India?", a: "Yes! We serve all major Indian cities and travel worldwide for destination weddings and global corporate events. Contact us for an international quote." },
    { q: "How many artists do I need for my event?", a: "As a thumb rule, 1 artist completes ~15–20 caricatures per hour. Our team will recommend the right number based on your guest count and event duration." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section
      id="faqs"
      eyebrow="Help • Help"
      title={<>Need <span className="text-gradient-violet">help?</span></>}
    >
      <div className="divide-y divide-border/60">
        {items.map((it, i) => (
          <button
            key={i}
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left py-5 sm:py-6 flex items-start justify-between gap-4 group"
          >
            <div className="flex-1">
              <div className="font-bold text-foreground text-base sm:text-lg">{it.q}</div>
              {open === i && <p className="mt-3 text-foreground/70 text-sm sm:text-base">{it.a}</p>}
            </div>
            <span className="w-8 h-8 rounded-full border border-border flex items-center justify-center shrink-0 text-foreground/70 group-hover:border-primary group-hover:text-primary transition-colors">
              {open === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
};

/* --------------------------------- Footer -------------------------------- */

const DEFAULT_FOOTER = {
  brand_title: "Creative Caricature Club™",
  brand_tagline: "India's #1 live caricature studio. Professional artists for weddings, corporate parties, baby showers and brand activations across India and worldwide.",
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
  ],
};

const Footer = ({ override }: { override?: any }) => {
  const f = { ...DEFAULT_FOOTER, ...(override || {}) };
  const cols: { title: string; links: { label: string; href: string }[] }[] =
    Array.isArray(f.columns) && f.columns.length ? f.columns : DEFAULT_FOOTER.columns;
  const igHandle = (f.credit_instagram_handle || "akashustle").replace(/^@/, "");
  const instaUrl = `https://instagram.com/${igHandle}`;
  return (
    <footer className="px-3 sm:px-4 my-6 mb-24 md:mb-6">
      <div className="mx-auto max-w-6xl rounded-3xl bg-hero-violet border border-border/40 p-6 sm:p-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="CCC" className="w-10 h-10 rounded-lg" />
              <div className="text-lg font-extrabold text-foreground tracking-tight leading-tight">
                Creative<br /><span className="text-gradient-violet">Caricature Club™</span>
              </div>
            </div>
            <p className="text-sm text-foreground/70 mt-3">{f.brand_tagline}</p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-sm font-bold text-foreground tracking-wider uppercase mb-3">{c.title}</div>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <a href={l.href} className="text-sm text-foreground/75 hover:text-primary transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>{f.copyright}</p>
          <p className="flex items-center gap-1.5">
            <span>{f.tagline_right}</span>
            <span className="opacity-50">·</span>
            <span>{f.credit_prefix}</span>
            <a
              href={instaUrl}
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

/* ============================== Main Index =============================== */

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { settings } = useSiteSettings();
  const { content } = useHomepageContent();
  const [redirectChecked, setRedirectChecked] = useState(false);
  const maintenance = useMaintenanceCheck("home");

  const [eventGallery, setEventGallery] = useState<string[]>([]);

  // Fetch event gallery (admin-managed) — fallback to bundled images so hero never empty.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("event_gallery").select("image_url").order("sort_order");
      if (mounted && data && data.length > 0) {
        setEventGallery(data.map((r: any) => r.image_url));
      }
    })();
    const ch = supabase
      .channel("event-gallery-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_gallery" }, async () => {
        const { data } = await supabase.from("event_gallery").select("image_url").order("sort_order");
        if (mounted && data) setEventGallery(data.map((r: any) => r.image_url));
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const heroImages = useMemo(() => {
    const list = eventGallery.length >= 4 ? eventGallery : fallbackImages;
    return list.slice(0, Math.min(12, list.length));
  }, [eventGallery]);

  const stats = useMemo(() => ([
    { label: "Events Served", value: "800+" },
    { label: "Happy Clients", value: "5,000+" },
    { label: "Years of Craft", value: "12+" },
    { label: "Average Rating", value: "4.9 / 5" },
  ]), []);

  // Logged-in users get routed to their respective dashboards (deferred)
  useEffect(() => {
    if (loading || redirectChecked || !user) { setRedirectChecked(true); return; }
    const t = setTimeout(async () => {
      try {
        const [adminResult, artistResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
          supabase.from("artists").select("id").eq("auth_user_id", user.id).maybeSingle() as any,
        ]);
        if (adminResult.data) { navigate("/admin-panel", { replace: true }); return; }
        if (artistResult.data) { navigate("/artist-dashboard", { replace: true }); return; }
        navigate("/dashboard", { replace: true });
      } catch {}
    }, 100);
    setRedirectChecked(true);
    return () => clearTimeout(t);
  }, [user, loading, redirectChecked, navigate]);

  const onBook = useCallback(() => {
    if (!user) { navigate("/login?redirect=/book-event"); return; }
    navigate("/book-event");
  }, [user, navigate]);
  const onQuote = useCallback(() => navigate("/enquiry"), [navigate]);
  const onViewGallery = useCallback(() => navigate("/gallery/events"), [navigate]);

  if (maintenance.isEnabled) {
    return <MaintenanceScreen title={maintenance.title} message={maintenance.message} estimatedEnd={maintenance.estimatedEnd} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEOHead
        title="Book Live Caricature Artists for Events | Creative Caricature Club"
        description="India's #1 live caricature studio. Book professional caricature artists for weddings, corporate events, baby showers and brand activations across India and worldwide."
        canonical="/"
      />
      <JsonLd />

      <HomepageUrgencyStrip config={content.homepage_urgency} />
      <FloatingNav />

      <main>
        {/* 1. Hero with right-to-left continuous marquee */}
        <Hero onBook={onBook} onQuote={onQuote} images={heroImages} />

        {/* 2. Stats — like reference image */}
        <Stats items={stats} />

        {/* 3. Video — admin editable, hidden if disabled */}
        {(content as any).homepage_video?.enabled && (
          <section id="video" className="px-3 sm:px-4 my-5 sm:my-6">
            <div className="mx-auto max-w-6xl rounded-3xl card-soft-white p-5 sm:p-10 lg:p-14">
              <div className="text-center mb-7 sm:mb-10">
                <div className="chip-violet mb-4"><PlayCircle className="w-3.5 h-3.5" /> Watch • Watch</div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                  See the <span className="text-gradient-violet">experience live</span>
                </h2>
              </div>
              <HomepageVideo config={(content as any).homepage_video} />
            </div>
          </section>
        )}

        {/* 4. Event Gallery preview + view-all */}
        <EventGallery images={eventGallery.length > 0 ? eventGallery : fallbackImages} onView={onViewGallery} />

        {/* 5. Trusted Brands (DB-driven, includes SBI etc.) */}
        <section id="clients" className="px-3 sm:px-4 my-5 sm:my-6">
          <div className="mx-auto max-w-6xl rounded-3xl card-soft-white overflow-hidden">
            <HomepageTrustedBrands />
          </div>
        </section>

        {/* 6. Services */}
        <Services onBook={onBook} />

        {/* 7. How it starts */}
        <HowItStarts onBook={onBook} images={eventGallery} />

        {/* 8. Why us */}
        <WhyUnique />

        {/* 9. Reviews */}
        <Reviews />

        {/* 10. FAQs */}
        <FAQs />
      </main>

      <Footer />

      {(settings as any).homepage_sticky_cta_visible?.enabled && (
        <HomepageStickyCTA config={(content as any).homepage_sticky_cta || { enabled: true, admin_visible: true }} />
      )}
    </div>
  );
};

export default Index;
