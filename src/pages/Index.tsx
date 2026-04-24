import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Calendar, Sparkles, Star, Plus, Minus,
  CheckCircle2, Users, Award, Quote, Trophy, Heart, Image as ImageIcon, PlayCircle,
  MessageCircle, Instagram,
} from "lucide-react";
import { useSiteSetting } from "@/hooks/useSiteSetting";
import { MAIN_SITE_URL } from "@/lib/site-config";
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
import SiteFooter from "@/components/SiteFooter";
import HomepageImageLightbox from "@/components/homepage/HomepageImageLightbox";
import WatermarkedImage from "@/components/WatermarkedImage";

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
    <div className={`mx-auto max-w-7xl rounded-3xl p-5 sm:p-10 lg:p-14 ${soft ? "bg-section-soft" : "card-soft-white"}`}>
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

const HeroMarquee = ({ images, onImageClick }: { images: string[]; onImageClick?: (i: number) => void }) => {
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
          <button
            type="button"
            key={i}
            onClick={() => onImageClick?.(i % images.length)}
            className="shrink-0 w-56 sm:w-72 md:w-80 lg:w-96 aspect-[3/4] rounded-2xl overflow-hidden border border-border/40 bg-card shadow-[0_20px_50px_-25px_hsl(252_60%_40%/0.35)] transition-transform hover:scale-[1.02] cursor-zoom-in"
            aria-label={`Open image ${(i % images.length) + 1}`}
          >
            <WatermarkedImage
              src={src}
              alt={`Live caricature ${(i % images.length) + 1}`}
              loading={i < 4 ? "eager" : "lazy"}
              className="w-full h-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

const Hero = ({ onBook, onQuote, images, config, onImageClick }: { onBook: () => void; onQuote: () => void; images: string[]; config?: any; onImageClick?: (i: number) => void }) => {
  const c = config || {};
  const headline: string = c.headline || "Live Caricature For Unforgettable Events";
  const highlight: string = c.headline_highlight || "Caricature";
  // Render the highlight word in gradient inside the headline if present.
  const renderHeadline = () => {
    if (!highlight || !headline.includes(highlight)) {
      return <>{headline}</>;
    }
    const [before, ...rest] = headline.split(highlight);
    const after = rest.join(highlight);
    return (
      <>
        {before}
        <span className="text-gradient-violet">{highlight}</span>
        {after}
      </>
    );
  };
  return (
    // Hero: contained inside a centered rounded card (matches the rest of the
    // homepage) so the violet fade reads premium instead of full-bleed cheap.
    //  • Outer wrapper provides the same side-padding rhythm as <Section/>.
    //  • Card pulls up to tuck under the FloatingNav via negative top margin.
    //  • A subtle radial wash + ambient orb give the gradient a focal centre
    //    without bleeding to the screen edges.
    <section className="px-3 sm:px-4 pt-3 sm:pt-4">
      <div className="relative mx-auto max-w-7xl rounded-[28px] sm:rounded-[36px] overflow-hidden bg-hero-violet border border-border/50 shadow-[0_30px_80px_-40px_hsl(252_60%_40%/0.35)] -mt-[60px] sm:-mt-[68px] md:-mt-[80px]">
        {/* Soft ambient orb behind the headline */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[78%] max-w-[820px] h-[360px] rounded-full opacity-55 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.22), transparent 70%)" }} />
        {/* Soft corner glow */}
        <div className="pointer-events-none absolute -bottom-28 -right-20 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.20), transparent 70%)" }} />

        <div className="relative px-5 sm:px-10 lg:px-16 pt-[96px] sm:pt-[120px] md:pt-[140px] lg:pt-[160px] pb-6 sm:pb-10 text-center max-w-4xl mx-auto">
          <div className="chip-violet mx-auto mb-5 sm:mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {c.chip_text || "India's #1 Live Caricature Studio"}
          </div>
          <h1 className="text-[2.25rem] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-black tracking-tight text-foreground leading-[1.05] sm:leading-[1] max-w-3xl mx-auto">
            {renderHeadline()}
          </h1>
          <p className="mt-4 sm:mt-5 max-w-xl mx-auto text-[14.5px] sm:text-base md:text-lg text-foreground/70 leading-relaxed">
            {c.subtext || "Book professional caricature artists for weddings, corporate parties, baby showers & brand activations across India and worldwide."}
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
            <button onClick={onBook} className="btn-square-violet justify-center">
              <Calendar className="w-5 h-5" /> {c.primary_cta || "Book Your Event"} <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onQuote} className="btn-square-outline justify-center">
              <Sparkles className="w-5 h-5" /> {c.secondary_cta || "Get Free Quote"}
            </button>
          </div>
        </div>
        {/* Continuous right-to-left marquee */}
        <HeroMarquee images={images} onImageClick={onImageClick} />
        <div className="h-6 sm:h-10" />
      </div>
    </section>
  );
};

/* ------------------------------- Stat Strip ------------------------------ */

const Stats = ({ items, config }: { items: { label: string; value: string }[]; config?: any }) => {
  const list = (config?.items && Array.isArray(config.items) && config.items.length) ? config.items : items;
  const icons = [Calendar, Users, Award, Star];
  return (
    <Section id="stats">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {list.map((s: any, i: number) => {
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

const EventGallery = ({ images, onView, onImageClick }: { images: string[]; onView: () => void; onImageClick?: (i: number) => void }) => {
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
          <button
            type="button"
            key={i}
            onClick={() => onImageClick?.(i)}
            className={`rounded-2xl overflow-hidden border border-border/40 bg-card transition-transform hover:scale-[1.02] cursor-zoom-in ${i === 0 ? "md:row-span-2 md:col-span-2 aspect-square md:aspect-auto" : "aspect-[4/5]"}`}
            aria-label={`Open event image ${i + 1}`}
          >
            <WatermarkedImage src={src} alt={`Event ${i + 1}`} className="w-full h-full" loading="lazy" />
          </button>
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

const ICON_MAP: Record<string, any> = { Calendar, Sparkles, Trophy, Heart, Users, Award, Star };

const Services = ({ onBook, config }: { onBook: () => void; config?: any }) => {
  const c = config || {};
  const items = (c.items && Array.isArray(c.items) && c.items.length ? c.items : [
    { icon: "Calendar", title: "Live Event Caricatures", body: "Professional artists drawing guests live at weddings, corporate parties, baby showers and brand activations across India." },
    { icon: "Sparkles", title: "International Bookings", body: "We travel worldwide. Custom packages for destination weddings and global corporate events." },
    { icon: "Trophy", title: "Brand Activations", body: "Engage your audience at expos, mall activations and product launches with on-the-spot caricatures." },
    { icon: "Heart", title: "Personal Celebrations", body: "Birthdays, anniversaries, baby showers, retirements — make every guest feel special." },
  ]);
  const titlePre = c.title_pre || "What we";
  const titleHl = c.title_highlight || "do best";
  return (
    <Section
      id="services"
      eyebrow={c.eyebrow || "Services • Services"}
      title={<>{titlePre} <span className="text-gradient-violet">{titleHl}</span></>}
      subtitle={c.subtitle || "Our full focus is on live event caricatures — fast, fun, photo-perfect entertainment your guests will remember forever."}
    >
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {items.map((s: any) => {
          const Icon = ICON_MAP[s.icon] || Calendar;
          return (
            <div key={s.title} className="card-gradient-blob p-5 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm sm:text-base text-foreground/70 mt-1.5">{s.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center mt-8">
        <button onClick={onBook} className="btn-square-violet">
          <Calendar className="w-4 h-4" /> {c.cta_label || "Book for your event"} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Section>
  );
};

/* -------------------------- How it Starts -------------------------------- */

const HowItStarts = ({ onBook, images, config, onImageClick }: { onBook: () => void; images: string[]; config?: any; onImageClick?: (allImages: string[], i: number) => void }) => {
  const c = config || {};
  const steps = (c.steps && Array.isArray(c.steps) && c.steps.length) ? c.steps : [
    { n: "1", title: "Share your event", body: "Tell us your date, city, guest count and event type. We'll match the right artists." },
    { n: "2", title: "Lock the booking", body: "Pay a small advance to confirm your slot. We handle artists, travel and logistics." },
    { n: "3", title: "Wow your guests", body: "Our artists arrive on time and create stunning live caricatures your guests take home." },
  ];
  const sourceImgs = images.length >= 4 ? images : fallbackImages;
  const previews = sourceImgs.slice(0, 4);
  return (
    <Section
      id="how"
      eyebrow={c.eyebrow || "Onboarding • Onboarding"}
      title={<>{c.title_pre || "How it"} <span className="text-gradient-violet">{c.title_highlight || "starts?"}</span></>}
    >
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="space-y-6">
          {steps.map((s: any) => (
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
            <Calendar className="w-4 h-4" /> {c.cta_label || "Start your booking"}
          </button>
        </div>
        <div className="card-gradient-blob p-4 sm:p-8">
          <div className="grid grid-cols-2 gap-3">
            {previews.map((src, i) => (
              <button
                type="button"
                key={i}
                onClick={() => onImageClick?.(sourceImgs, i)}
                className="rounded-2xl overflow-hidden aspect-square border border-border/40 transition-transform hover:scale-[1.03] cursor-zoom-in"
                aria-label={`Open image ${i + 1}`}
              >
                <WatermarkedImage src={src} alt={`Live event caricature ${i + 1}`} className="w-full h-full" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};

/* ------------------------------- Why Us / VS ----------------------------- */

const WhyUnique = ({ config }: { config?: any }) => {
  const c = config || {};
  const others = (c.others && Array.isArray(c.others) && c.others.length) ? c.others : ["Slow turnaround time", "Inconsistent artist quality", "Hidden charges & surprises", "Hard to reach when needed"];
  const ours = (c.ours && Array.isArray(c.ours) && c.ours.length) ? c.ours : ["On-time, every time", "Trained, vetted top artists", "Transparent flat pricing", "Dedicated event manager"];
  return (
    <Section
      id="why-us"
      eyebrow={c.eyebrow || "Special • Special"}
      title={<>{c.title_pre || "What makes us"} <span className="text-gradient-violet">{c.title_highlight || "unique?"}</span></>}
      subtitle={c.subtitle || "Creative Caricature Club V/S Others"}
    >
      <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
        <div className="rounded-2xl bg-secondary/40 border border-border/40 p-5 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-4 py-1.5 text-xs font-bold tracking-wider text-foreground/70">{c.others_label || "OTHERS"}</div>
          <ul className="mt-5 space-y-3">
            {others.map((t: string) => (
              <li key={t} className="flex items-center gap-3 text-foreground/70 text-sm sm:text-base">
                <Minus className="w-5 h-5 rounded-full p-1 bg-foreground/10" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-card border border-primary/20 p-5 sm:p-8 shadow-[0_20px_60px_-30px_hsl(252_85%_62%/0.45)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1.5 text-xs font-bold tracking-wider text-white">{c.ours_label || "CREATIVE CARICATURE CLUB"}</div>
          <ul className="mt-5 space-y-3">
            {ours.map((t: string) => (
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

const Reviews = ({ config }: { config?: any }) => {
  const c = config || {};
  const reviews = (c.items && Array.isArray(c.items) && c.items.length) ? c.items : [
    { name: "Naman D.", role: "Wedding · Mumbai", text: "Booked 3 artists for our reception — guests loved their caricatures so much they were the talk of the night!" },
    { name: "Rahul R.", role: "Corporate Event · Delhi", text: "Smooth booking, professional artists, perfect timing. Our team got 200+ caricatures done in 4 hours flawlessly." },
    { name: "Priya S.", role: "Baby Shower · Bengaluru", text: "Such a unique gift idea for guests! Everyone took home their own caricature. Highly recommend." },
  ];
  return (
    <Section
      id="reviews"
      eyebrow={c.eyebrow || "Reviews • Reviews"}
      title={<>{c.title_pre || "Hear from"} <span className="text-gradient-violet">{c.title_highlight || "them"}</span></>}
    >
      <div className="grid md:grid-cols-3 gap-5">
        {reviews.map((r: any, i: number) => (
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

const FAQs = ({ config }: { config?: any }) => {
  const c = config || {};
  const items = (c.items && Array.isArray(c.items) && c.items.length) ? c.items : [
    { q: "Why should I choose Creative Caricature Club over other studios?", a: "We are India's largest live-caricature network — 12+ years of craft, 800+ events, vetted top artists, transparent flat pricing and a dedicated event manager for every booking." },
    { q: "How far in advance should I book my event?", a: "We recommend 2–4 weeks for weddings and corporate events. For peak season (Nov–Feb) lock your date as early as possible. Last-minute bookings may still be possible based on availability." },
    { q: "Do you travel outside Mumbai or India?", a: "Yes! We serve all major Indian cities and travel worldwide for destination weddings and global corporate events. Contact us for an international quote." },
    { q: "How many artists do I need for my event?", a: "As a thumb rule, 1 artist completes ~15–20 caricatures per hour. Our team will recommend the right number based on your guest count and event duration." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section
      id="faqs"
      eyebrow={c.eyebrow || "Help • Help"}
      title={<>{c.title_pre || "Need"} <span className="text-gradient-violet">{c.title_highlight || "help?"}</span></>}
    >
      <div className="divide-y divide-border/60">
        {items.map((it: any, i: number) => (
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

/* ------------------------------ About Us ------------------------------ */

const AboutUs = ({ config }: { config?: any }) => {
  const c = config || {};
  const eyebrow = c.eyebrow || "About • About";
  const titlePre = c.title_pre || "Who is";
  const titleHl = c.title_highlight || "Creative Caricature?";
  const body = c.body
    || "Creative Caricature Club is India's largest live-caricature studio, hand-built by passionate artists over 12+ years. From intimate baby showers to 3,000-guest weddings and global brand activations, our trained network of artists turns every event into a keepsake your guests will frame for life.";
  const points: { label: string; value: string }[] = (c.points && Array.isArray(c.points) && c.points.length)
    ? c.points
    : [
        { label: "Years crafting smiles", value: "12+" },
        { label: "Live events delivered", value: "800+" },
        { label: "Caricatures drawn live", value: "120K+" },
      ];
  return (
    <Section
      id="about"
      eyebrow={eyebrow}
      title={<>{titlePre} <span className="text-gradient-violet">{titleHl}</span></>}
    >
      <div className="grid lg:grid-cols-5 gap-6 sm:gap-8 items-center">
        <div className="lg:col-span-3 space-y-5">
          <p className="text-foreground/80 leading-relaxed text-base sm:text-lg">{body}</p>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2">
            {points.map((p) => (
              <div key={p.label} className="rounded-2xl bg-secondary/60 border border-border/40 p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-extrabold text-gradient-violet">{p.value}</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-tight">{p.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <Heart className="w-3.5 h-3.5" /> Hand-drawn live
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent-foreground px-3 py-1 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" /> Vetted artist network
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 text-warning px-3 py-1 text-xs font-semibold">
              <Award className="w-3.5 h-3.5" /> 4.9/5 rated
            </span>
          </div>
        </div>
        <div className="lg:col-span-2 relative">
          <div className="relative rounded-3xl overflow-hidden bg-hero-violet p-6 sm:p-8 border border-border/40 shadow-[0_20px_60px_-30px_hsl(252_85%_62%/0.45)]">
            <div className="pointer-events-none absolute -top-16 -left-12 w-56 h-56 rounded-full opacity-50 blur-3xl"
              style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.30), transparent 70%)" }} />
            <Quote className="w-8 h-8 text-primary/60" />
            <p className="mt-3 text-foreground/85 italic leading-relaxed text-sm sm:text-base">
              {c.quote
                || "We don't just draw faces — we capture the joy of the room. Every stroke, every laugh, every selfie at the easel — that's why people remember the night."}
            </p>
            <div className="mt-5 pt-5 border-t border-border/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                {(c.signoff_initial || "C")}
              </div>
              <div>
                <div className="font-bold text-foreground text-sm">{c.signoff_name || "The CCC Crew"}</div>
                <div className="text-xs text-muted-foreground">{c.signoff_role || "Creative Caricature Club"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

const StillConfused = ({ config }: { config?: any }) => {
  const c = config || {};
  const contact = useSiteSetting<any>("global_contact", {});
  const wa = (contact?.whatsapp_number || "918369594271").replace(/[^0-9]/g, "");
  const igHandle = (contact?.instagram_handle || "creativecaricatureclub").replace(/^@/, "");
  const igUrl = contact?.instagram_url || `https://instagram.com/${igHandle}`;
  const waMessage = contact?.whatsapp_prefill_message
    || "Hi Creative Caricature Club! 👋 I'm a bit confused about packages — can you help me decide what's best for my event?";

  return (
    <section id="still-confused" className="px-3 sm:px-4 my-5 sm:my-6">
      <div className="relative mx-auto max-w-7xl rounded-3xl overflow-hidden bg-hero-violet border border-border/40 p-6 sm:p-12 lg:p-16 text-center">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.30), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.25), transparent 70%)" }} />

        <div className="relative">
          <div className="chip-violet mx-auto mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            {c.eyebrow || "Still need help?"}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            {c.title_pre || "Still"} <span className="text-gradient-violet">{c.title_highlight || "confused?"}</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-foreground/75 text-sm sm:text-base">
            {c.subtitle || "Talk to our event managers on WhatsApp or slide into our DMs on Instagram. We'll help you pick the perfect package in minutes."}
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white shadow-[0_10px_30px_-10px_hsl(142_70%_40%/0.6)] transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, hsl(142 70% 45%), hsl(150 65% 38%))" }}
            >
              <MessageCircle className="w-5 h-5" />
              {c.whatsapp_label || "Chat on WhatsApp"}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white shadow-[0_10px_30px_-10px_hsl(330_75%_50%/0.6)] transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, hsl(330 80% 55%), hsl(280 70% 55%) 60%, hsl(35 95% 55%))" }}
            >
              <Instagram className="w-5 h-5" />
              {c.instagram_label || "Message on Instagram"}
            </a>
          </div>

          <p className="mt-5 text-xs text-foreground/55">
            Visit{" "}
            <a href={MAIN_SITE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
              creativecaricatureclub.com
            </a>{" "}
            for more about our studio.
          </p>
        </div>
      </div>
    </section>
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
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

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
        {(() => {
          const order: string[] = Array.isArray((content as any).homepage_section_order?.order)
            ? (content as any).homepage_section_order.order
            : ["hero", "stats", "video", "gallery", "clients", "about", "services", "how", "why", "reviews", "faqs", "still_confused"];
          // Always make sure the new About section renders even on legacy
          // saved orders that don't include it yet.
          const finalOrder = order.includes("about")
            ? order
            : [...order.slice(0, Math.max(order.indexOf("clients") + 1, 1)), "about", ...order.slice(Math.max(order.indexOf("clients") + 1, 1))];
          const sections: Record<string, React.ReactNode> = {
            hero: <Hero key="hero" onBook={onBook} onQuote={onQuote} images={heroImages} config={(content as any).homepage_hero} onImageClick={(i) => setLightbox({ images: heroImages, index: i })} />,
            stats: <Stats key="stats" items={stats} config={(content as any).homepage_stats} />,
            video: (content as any).homepage_video?.enabled ? (
              <section key="video" id="video" className="px-3 sm:px-4 my-5 sm:my-6">
                <div className="mx-auto max-w-7xl rounded-3xl card-soft-white p-4 sm:p-8 lg:p-10">
                  <div className="text-center mb-5 sm:mb-7">
                    <div className="chip-violet mb-3"><PlayCircle className="w-3.5 h-3.5" /> Watch • Watch</div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                      See the <span className="text-gradient-violet">experience live</span>
                    </h2>
                  </div>
                  <HomepageVideo config={(content as any).homepage_video} />
                </div>
              </section>
            ) : null,
            gallery: <EventGallery key="gallery" images={eventGallery.length > 0 ? eventGallery : fallbackImages} onView={onViewGallery} onImageClick={(i) => { const imgs = eventGallery.length > 0 ? eventGallery : fallbackImages; setLightbox({ images: imgs.slice(0, 8), index: i }); }} />,
            clients: (
              <section key="clients" id="clients" className="px-3 sm:px-4 my-5 sm:my-6">
                <div className="mx-auto max-w-7xl rounded-3xl card-soft-white overflow-hidden">
                  <HomepageTrustedBrands />
                </div>
              </section>
            ),
            about: <AboutUs key="about" config={(content as any).homepage_about} />,
            services: <Services key="services" onBook={onBook} config={(content as any).homepage_services} />,
            how: <HowItStarts key="how" onBook={onBook} images={eventGallery} config={(content as any).homepage_how_it_starts} onImageClick={(allImgs, i) => setLightbox({ images: allImgs, index: i })} />,
            why: <WhyUnique key="why" config={(content as any).homepage_why_unique} />,
            reviews: <Reviews key="reviews" config={(content as any).homepage_reviews} />,
            faqs: <FAQs key="faqs" config={(content as any).homepage_faqs} />,
            still_confused: <StillConfused key="still_confused" config={(content as any).homepage_still_confused} />,
          };
          return finalOrder.map(id => sections[id]).filter(Boolean);
        })()}
      </main>

      <SiteFooter />

      <HomepageImageLightbox
        images={lightbox?.images || []}
        index={lightbox?.index ?? null}
        onClose={() => setLightbox(null)}
        onChange={(i) => setLightbox((prev) => prev ? { ...prev, index: i } : null)}
      />

      {(settings as any).homepage_sticky_cta_visible?.enabled && (
        <HomepageStickyCTA config={(content as any).homepage_sticky_cta || { enabled: true, admin_visible: true }} />
      )}
    </div>
  );
};

export default Index;
