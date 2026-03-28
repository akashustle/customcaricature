import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { MapPin, Calendar, Clock, ArrowRight, Ticket, Phone, ChevronLeft, ChevronRight, X, Instagram, ExternalLink, Sparkles, Users, Palette, Heart, Star, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";

const EVENT_IMAGES = [
  "/images/lil-flea/lf-0.jpeg",
  "/images/lil-flea/lf-1.jpeg",
  "/images/lil-flea/lf-2.jpeg",
  "/images/lil-flea/lf-3.jpeg",
  "/images/lil-flea/lf-4.jpeg",
  "/images/lil-flea/lf-5.jpeg",
  "/images/lil-flea/lf-6.jpeg",
  "/images/lil-flea/lf-7.jpeg",
  "/images/lil-flea/lf-8.jpeg",
];

const DEFAULT_CONFIG = {
  event_name: "The Lil Flea",
  hero_title: "We're Live at The Lil Flea 🎨",
  hero_subtitle: "Get your caricature made in minutes",
  venue: "Jio World Garden, BKC, Mumbai",
  dates: "Apr 3–5 & Apr 10–12",
  time: "From 3 PM onwards",
  ticket_url: "https://www.thelilflea.com/book-tickets-mumbai/",
  district_app_url: "https://play.google.com/store/apps/details?id=com.application.zomato.district&pcampaignid=web_share",
  maps_url: "https://maps.app.goo.gl/JioWorldGardenBKC",
  whatsapp_number: "919819731040",
  show_district: true,
};

type EventConfig = typeof DEFAULT_CONFIG;

const EXPERIENCE_CARDS = [
  { title: "Single Caricature", desc: "Your personality in a fun sketch", icon: Sparkles, gradient: "linear-gradient(135deg, #f59e0b, #ea580c)" },
  { title: "Couple Caricature", desc: "A memorable sketch for two", icon: Heart, gradient: "linear-gradient(135deg, #ec4899, #be123c)" },
  { title: "Family Caricature", desc: "The whole family, one portrait", icon: Users, gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
  { title: "Color & B&W", desc: "Vibrant or classic — your choice", icon: Palette, gradient: "linear-gradient(135deg, #06b6d4, #2563eb)" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Visit Our Stall", desc: "Find us at the event — look for the big Caricature sign!" },
  { step: "02", title: "Sit & Get Sketched", desc: "Relax while our artist captures your likeness in minutes" },
  { step: "03", title: "Take It Home", desc: "Walk away with a unique, hand-drawn caricature memento" },
];

/* ─── Custom Splash Screen for Lil Flea ─── */
const LilFleaSplash = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState(0); // 0=logo, 1=text, 2=exit

  useEffect(() => {
    if (sessionStorage.getItem("lf_splash_done")) {
      onComplete();
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => {
      sessionStorage.setItem("lf_splash_done", "1");
      onComplete();
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  if (sessionStorage.getItem("lf_splash_done")) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #1a1207 0%, #0a0a0a 70%)" }}
      animate={phase === 2 ? { opacity: 0, scale: 1.2 } : {}}
      transition={{ duration: 0.4 }}
    >
      {/* Floating particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 2 + Math.random() * 4,
            height: 2 + Math.random() * 4,
            background: ["#f59e0b", "#fb923c", "#fbbf24", "#ef4444", "#a855f7"][i % 5],
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            y: [0, -60 - Math.random() * 40],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 1.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* CCC Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative"
      >
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-3 border-amber-400/50 shadow-2xl shadow-amber-500/30 overflow-hidden bg-white/10 backdrop-blur-sm p-1">
          <img
            src="/logo.png"
            alt="Creative Caricature Club"
            className="w-full h-full rounded-full object-cover"
            width={112}
            height={112}
          />
        </div>
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-amber-400/40"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3 }}
        className="mt-6 text-center"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Creative Caricature Club
        </h1>
        <p className="text-amber-400/80 text-sm mt-1 tracking-widest uppercase">
          × The Lil Flea
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className="mt-8 w-24 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
};

/* ─── 3D Entry Gate ─── */
const EntryGate = ({ onEnter, config }: { onEnter: () => void; config: EventConfig }) => (
  <motion.div
    className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
    style={{ background: "radial-gradient(ellipse at center, #1a1207 0%, #050505 80%)" }}
    exit={{ opacity: 0, scale: 1.3, rotateX: 30 }}
    transition={{ duration: 0.8 }}
  >
    {/* Ambient particles */}
    {Array.from({ length: 25 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: 2 + Math.random() * 3,
          height: 2 + Math.random() * 3,
          background: ["#f59e0b", "#fb923c", "#a855f7", "#ec4899"][i % 4],
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{ opacity: [0, 1, 0], y: [0, -50], scale: [0, 1.5, 0] }}
        transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
      />
    ))}

    {/* 3D Gate Frame */}
    <motion.div
      initial={{ perspective: 800, rotateX: 40, scale: 0.7, opacity: 0 }}
      animate={{ rotateX: 0, scale: 1, opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="relative"
      style={{ perspective: "800px" }}
    >
      <div
        className="relative border border-amber-500/30 rounded-3xl p-8 md:p-14 flex flex-col items-center gap-6 max-w-lg mx-4"
        style={{
          background: "linear-gradient(145deg, rgba(245,158,11,0.08), rgba(0,0,0,0.6))",
          backdropFilter: "blur(30px)",
          boxShadow: "0 0 80px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
          transform: "translateZ(0)",
        }}
      >
        {/* Top arch glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/20 rounded-full blur-3xl" />

        {/* Logos */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4 flex-wrap justify-center"
        >
          <div className="w-14 h-14 rounded-full border-2 border-amber-400/40 overflow-hidden shadow-lg shadow-amber-500/20 bg-white/10 p-0.5">
            <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" width={56} height={56} />
          </div>
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="text-amber-400/40 text-2xl"
          >
            ✦
          </motion.span>
          <img src="/images/lil-flea-logo.png" alt={config.event_name} className="h-10 md:h-12 object-contain brightness-0 invert opacity-80" width={120} height={48} />
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl md:text-3xl font-bold text-center text-white leading-snug"
        >
          Welcome to the Live<br />Caricature Experience 🎨
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-amber-200/50 text-center text-sm"
        >
          Step into a world of art, laughter & memories
        </motion.p>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }}>
          <Button
            onClick={onEnter}
            size="lg"
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black font-bold hover:from-amber-400 hover:to-red-400 rounded-full gap-2 shadow-xl shadow-amber-500/40 px-8 text-base"
          >
            Enter Experience <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  </motion.div>
);

/* ─── 3D Flip Card ─── */
const FlipCard = ({ card, index }: { card: typeof EXPERIENCE_CARDS[0]; index: number }) => {
  const [flipped, setFlipped] = useState(false);
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateY: -15 }}
      whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, type: "spring", stiffness: 100 }}
      className="perspective-[1000px] h-52 cursor-pointer group"
      onClick={() => setFlipped(!flipped)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl p-6 flex flex-col justify-end border border-white/10"
          style={{
            backfaceVisibility: "hidden",
            background: card.gradient,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">{card.title}</h3>
          <p className="text-white/70 text-sm mt-1">Tap to learn more</p>
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
            }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          />
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-white/10"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <Icon className="w-10 h-10 text-amber-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
          <p className="text-white/60 text-sm">{card.desc}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Main Page ─── */
const LilFlea = () => {
  const navigate = useNavigate();
  const [splashDone, setSplashDone] = useState(!!sessionStorage.getItem("lf_splash_done"));
  const [showGate, setShowGate] = useState(!sessionStorage.getItem("lf_entered"));
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [config, setConfig] = useState<EventConfig>(DEFAULT_CONFIG);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [form, setForm] = useState({ name: "", phone: "", event_type: "", date: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  // Fetch config from admin_site_settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_site_settings").select("*").eq("id", "lil_flea_config").maybeSingle();
      if (data?.value) {
        setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
      }
    })();
  }, []);

  // Fetch gallery
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
      if (data && data.length > 0) setGalleryImages(data as any[]);
    })();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => setCarouselIdx(i => (i + 1) % EVENT_IMAGES.length), 3500);
    return () => clearInterval(timer);
  }, []);

  const handleEnter = () => {
    sessionStorage.setItem("lf_entered", "1");
    setShowGate(false);
  };

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast({ title: "Please fill name and phone", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await supabase.from("enquiries").insert({
      name: form.name,
      mobile: form.phone,
      event_type: form.event_type || "General",
      event_date: form.date || null,
      source: "lil-flea-page",
      enquiry_type: "event",
      enquiry_number: `LF-${Date.now()}`,
      status: "new",
    } as any);
    toast({ title: "Booking request sent! ✅", description: "We'll contact you soon." });
    setForm({ name: "", phone: "", event_type: "", date: "", message: "" });
    setSubmitting(false);
  };

  const allImages = galleryImages.length > 0 ? galleryImages.map(g => g.image_url) : EVENT_IMAGES;
  const displayGallery = allImages.slice(0, 10);

  return (
    <>
      <SEOHead
        title={`Live Caricature at ${config.event_name} Mumbai | Creative Caricature Club`}
        description={`Get your caricature made live at ${config.event_name} Mumbai! Creative Caricature Club brings professional caricature artists to ${config.venue}.`}
        canonical="/lil-flea"
        image="/images/lil-flea/lf-3.jpeg"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: `Live Caricature at ${config.event_name} Mumbai`,
            startDate: "2025-04-03T15:00:00+05:30",
            endDate: "2025-04-12T23:00:00+05:30",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            location: { "@type": "Place", name: config.venue, address: { "@type": "PostalAddress", addressLocality: "Mumbai", addressRegion: "Maharashtra", addressCountry: "IN" } },
            image: ["/images/lil-flea/lf-3.jpeg"],
            description: `Get your caricature made live by professional artists at ${config.event_name} Mumbai.`,
            organizer: { "@type": "Organization", name: "Creative Caricature Club", url: "https://portal.creativecaricatureclub.com" },
            offers: { "@type": "Offer", url: config.ticket_url, availability: "https://schema.org/InStock" },
          }),
        }}
      />

      {/* Custom Splash */}
      {!splashDone && <LilFleaSplash onComplete={handleSplashComplete} />}

      {/* Entry Gate */}
      <AnimatePresence>
        {splashDone && showGate && <EntryGate onEnter={handleEnter} config={config} />}
      </AnimatePresence>

      <div className="min-h-screen text-white" style={{ background: "linear-gradient(180deg, #050505 0%, #0f0a04 20%, #1a0f05 40%, #0a0507 70%, #050505 100%)" }}>

        {/* ─── HERO ─── */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <motion.div style={{ y: heroY }} className="absolute inset-0">
            <img src="/images/lil-flea/lf-3.jpeg" alt={`Live caricature at ${config.event_name}`} className="w-full h-full object-cover opacity-25" loading="eager" width={1200} height={800} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black" />
          </motion.div>

          {/* Neon glow orbs */}
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-20 left-10 w-72 h-72 bg-amber-500 rounded-full blur-[120px]" />
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} className="absolute bottom-20 right-10 w-60 h-60 bg-purple-500 rounded-full blur-[100px]" />
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 6, repeat: Infinity, delay: 2 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500 rounded-full blur-[150px]" />

          <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center px-4 max-w-4xl mx-auto">
            {/* Logos */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-center gap-4 mb-8 flex-wrap">
              <div className="w-14 h-14 rounded-full border-2 border-amber-400/40 overflow-hidden shadow-lg shadow-amber-500/30 bg-white/5 p-0.5">
                <img src="/logo.png" alt="CCC" className="w-full h-full rounded-full object-cover" width={56} height={56} />
              </div>
              <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="text-amber-400/40 text-xl">✦</motion.span>
              <img src="/images/lil-flea-logo.png" alt={config.event_name} className="h-9 md:h-11 brightness-0 invert opacity-70" width={100} height={44} />
            </motion.div>

            <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, type: "spring" }} className="text-4xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight tracking-tight">
              {config.hero_title.includes("Live") ? (
                <>
                  {config.hero_title.split("Live")[0]}
                  <span className="relative inline-block">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-400">Live</span>
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -inset-1 bg-gradient-to-r from-amber-400/20 to-orange-400/20 blur-xl rounded-lg" />
                  </span>
                  {config.hero_title.split("Live")[1]}
                </>
              ) : config.hero_title}
            </motion.h1>

            <motion.p initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="text-lg md:text-xl text-white/60 mb-3">
              {config.hero_subtitle}
            </motion.p>

            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap items-center justify-center gap-4 text-sm text-amber-200/70 mb-10">
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm"><MapPin className="w-4 h-4 text-amber-400" /> {config.venue}</span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm"><Calendar className="w-4 h-4 text-amber-400" /> {config.dates}</span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm"><Clock className="w-4 h-4 text-amber-400" /> {config.time}</span>
            </motion.div>

            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black font-bold hover:from-amber-400 hover:to-red-400 rounded-full gap-2 shadow-xl shadow-amber-500/30 px-6"
                onClick={() => window.open(config.maps_url, "_blank")}
              >
                <MapPin className="w-5 h-5" /> Visit Our Stall
              </Button>
              <Button
                size="lg"
                className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-full gap-2 backdrop-blur-sm px-6"
                onClick={() => window.open(config.ticket_url, "_blank")}
              >
                <Ticket className="w-5 h-5" /> Book Tickets
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-1.5">
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-3 bg-amber-400 rounded-full" />
          </motion.div>
        </section>

        {/* ─── TICKET STRIP ─── */}
        <section className="relative z-10 py-4" style={{ background: "linear-gradient(90deg, #f59e0b, #ea580c, #ef4444)" }}>
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-black font-bold text-lg">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <Ticket className="w-5 h-5" />
              </motion.div>
              <span>Limited Entry — Book Your Tickets Now!</span>
            </div>
            <Button className="bg-black text-amber-400 hover:bg-black/80 rounded-full font-bold gap-2 shadow-lg" onClick={() => window.open(config.ticket_url, "_blank")}>
              Book on {config.event_name} <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* ─── 3D EXPERIENCE CARDS ─── */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <p className="text-amber-400 uppercase tracking-[0.3em] text-xs font-semibold mb-3">What We Offer</p>
              <h2 className="text-3xl md:text-5xl font-black">The Caricature Experience</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {EXPERIENCE_CARDS.map((card, i) => (
                <FlipCard key={card.title} card={card} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── LIVE CAROUSEL ─── */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <p className="text-amber-400 uppercase tracking-[0.3em] text-xs font-semibold mb-3">Live at the Event</p>
              <h2 className="text-3xl md:text-5xl font-black mb-3">Watch It Come Alive</h2>
              <p className="text-white/50">Your caricature, sketched in 3–5 minutes</p>
            </motion.div>

            <div className="relative max-w-4xl mx-auto">
              <div className="overflow-hidden rounded-3xl aspect-[16/10] border border-white/10" style={{ boxShadow: "0 30px 80px rgba(245,158,11,0.1)" }}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={carouselIdx}
                    initial={{ opacity: 0, scale: 1.1, rotateY: 10 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                    transition={{ duration: 0.6 }}
                    src={EVENT_IMAGES[carouselIdx]}
                    alt={`Live caricature event ${carouselIdx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </AnimatePresence>
              </div>
              <button onClick={() => setCarouselIdx(i => (i - 1 + EVENT_IMAGES.length) % EVENT_IMAGES.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/70 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/90 border border-white/10" aria-label="Previous"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setCarouselIdx(i => (i + 1) % EVENT_IMAGES.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/70 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/90 border border-white/10" aria-label="Next"><ChevronRight className="w-5 h-5" /></button>
              <div className="flex items-center justify-center gap-2 mt-5">
                {EVENT_IMAGES.map((_, i) => (
                  <button key={i} onClick={() => setCarouselIdx(i)} className={`h-2 rounded-full transition-all duration-300 ${i === carouselIdx ? "bg-amber-400 w-8" : "bg-white/20 w-2"}`} aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── GALLERY ─── */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <p className="text-amber-400 uppercase tracking-[0.3em] text-xs font-semibold mb-3">Our Work</p>
              <h2 className="text-3xl md:text-5xl font-black">Gallery</h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl mx-auto">
              {displayGallery.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30, rotateX: 15 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.08, y: -8, rotateY: 5 }}
                  className="rounded-2xl overflow-hidden cursor-pointer aspect-square border border-white/10 relative group"
                  style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}
                  onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }}
                >
                  <img src={typeof img === "string" ? img : img} alt={`Caricature ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" width={300} height={300} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
            {allImages.length > 10 && (
              <div className="text-center mt-10">
                <Button variant="outline" className="rounded-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10 gap-2" onClick={() => navigate("/gallery/events")}>View Full Gallery <ArrowRight className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <p className="text-amber-400 uppercase tracking-[0.3em] text-xs font-semibold mb-3">Simple Process</p>
              <h2 className="text-3xl md:text-5xl font-black">How It Works</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {HOW_IT_WORKS.map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, type: "spring" }}
                  className="text-center relative group"
                >
                  <motion.div
                    whileHover={{ scale: 1.05, rotateZ: 2 }}
                    className="rounded-2xl p-8 border border-white/10 relative overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(10px)" }}
                  >
                    <div className="text-5xl font-black text-amber-500/15 absolute top-2 right-4">{item.step}</div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-black text-amber-400">{item.step}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </motion.div>
                  {i < 2 && <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-amber-500/30 text-xl">→</div>}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING MESSAGE ─── */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
              whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl p-8 md:p-12 border border-amber-500/20 relative overflow-hidden"
              style={{ background: "linear-gradient(145deg, rgba(245,158,11,0.08), rgba(0,0,0,0.4))", backdropFilter: "blur(20px)", boxShadow: "0 30px 80px rgba(245,158,11,0.1)" }}
            >
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/5 rounded-full" />
              <Palette className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-black mb-3">Caricatures Available Live 🎨</h2>
              <p className="text-white/60 mb-6">Visit us at {config.event_name} to experience & get yours made instantly. No appointment needed!</p>
              <Button size="lg" className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black font-bold rounded-full gap-2 shadow-xl shadow-amber-500/30" onClick={() => window.open(config.ticket_url, "_blank")}>
                <Ticket className="w-5 h-5" /> Book Tickets for {config.event_name}
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ─── EVENT BOOKING FORM ─── */}
        <section className="py-24 relative" id="book-us">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <p className="text-amber-400 uppercase tracking-[0.3em] text-xs font-semibold mb-3">For Your Events</p>
                <h2 className="text-3xl md:text-4xl font-black mb-4">Book Us for Weddings & Events</h2>
                <p className="text-white/50 mb-8">Bring the caricature experience to your next celebration.</p>
                <div className="space-y-4">
                  <a href={`https://wa.me/${config.whatsapp_number}?text=Hi!%20I%20saw%20you%20at%20${encodeURIComponent(config.event_name)}%20and%20want%20to%20book`} target="_blank" rel="noopener" className="flex items-center gap-3 text-white/70 hover:text-amber-400 transition-colors">
                    <div className="w-11 h-11 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/20"><Phone className="w-5 h-5 text-green-400" /></div>
                    Chat on WhatsApp
                  </a>
                  <a href="https://www.instagram.com/creativecaricatureclub/" target="_blank" rel="noopener" className="flex items-center gap-3 text-white/70 hover:text-amber-400 transition-colors">
                    <div className="w-11 h-11 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-500/20"><Instagram className="w-5 h-5 text-pink-400" /></div>
                    Follow on Instagram
                  </a>
                </div>
              </motion.div>

              <motion.form onSubmit={handleBookingSubmit} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4 rounded-3xl p-6 md:p-8 border border-white/10" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                <Input placeholder="Your Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl h-12" required />
                <Input placeholder="Phone Number *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl h-12" required />
                <Input placeholder="Event Type (Wedding, Birthday...)" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl h-12" />
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl h-12" />
                <Button type="submit" disabled={submitting} size="lg" className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black font-bold rounded-full text-base">
                  {submitting ? "Sending..." : "Send Booking Request"}
                </Button>
              </motion.form>
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PROOF ─── */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <p className="text-amber-400 uppercase tracking-[0.3em] text-xs font-semibold mb-3">Happy Customers</p>
              <h2 className="text-3xl md:text-5xl font-black">Reactions That Speak</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {EVENT_IMAGES.slice(0, 3).map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40, rotateY: 10 }}
                  whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="rounded-3xl overflow-hidden border border-white/10"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                >
                  <img src={img} alt={`Customer reaction ${i + 1}`} className="w-full h-64 object-cover" loading="lazy" width={400} height={256} />
                  <div className="p-5" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex gap-0.5 mb-2">{Array.from({ length: 5 }).map((_, s) => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}</div>
                    <p className="text-white/60 text-sm">"Amazing experience! Got our caricature done in minutes!"</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── DISTRICT APP SECTION ─── */}
        {config.show_district && (
          <section className="py-20 relative">
            <div className="container mx-auto px-4 max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                className="rounded-3xl p-8 md:p-10 border border-purple-500/20 relative overflow-hidden flex flex-col md:flex-row items-center gap-8"
                style={{
                  background: "linear-gradient(145deg, rgba(124,58,237,0.12), rgba(0,0,0,0.5))",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 30px 80px rgba(124,58,237,0.1)",
                }}
              >
                {/* Purple glow */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl" />

                {/* District Logo */}
                <div className="flex-shrink-0">
                  <motion.div
                    whileHover={{ scale: 1.05, rotateY: 10 }}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shadow-xl shadow-purple-500/20"
                  >
                    <img
                      src="/images/district-logo.png"
                      alt="District by Zomato"
                      className="w-full h-full object-cover"
                      width={112}
                      height={112}
                    />
                  </motion.div>
                </div>

                <div className="text-center md:text-left flex-1">
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                    <img src="/images/district-app.svg" alt="District" className="h-5 brightness-0 invert opacity-80" />
                    <span className="text-white/40 text-sm">by Zomato</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-2">
                    Also Book via <span className="text-purple-400">District App</span>
                  </h3>
                  <p className="text-white/50 text-sm mb-5">
                    Get your entry tickets for {config.event_name} through the District by Zomato app too!
                  </p>
                  <Button
                    className="bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold rounded-full gap-2 hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/20"
                    onClick={() => window.open(config.district_app_url, "_blank")}
                  >
                    <Download className="w-4 h-4" /> Get District App
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* ─── FINAL CTA ─── */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                Catch Us <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-400">LIVE</span> at {config.event_name}
              </h2>
              <p className="text-white/50 mb-10 text-lg">Before it ends! {config.dates} at {config.venue}</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black font-bold rounded-full gap-2 shadow-xl shadow-amber-500/30 px-6" onClick={() => window.open(config.maps_url, "_blank")}>
                  <MapPin className="w-5 h-5" /> Get Directions
                </Button>
                <Button size="lg" className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-full gap-2 backdrop-blur-sm px-6" onClick={() => window.open(config.ticket_url, "_blank")}>
                  <Ticket className="w-5 h-5" /> Book Tickets
                </Button>
                <Button size="lg" variant="outline" className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10 rounded-full gap-2 px-6" onClick={() => document.getElementById("book-us")?.scrollIntoView({ behavior: "smooth" })}>
                  Book Us <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-white/5">
          <div className="container mx-auto px-4 text-center text-white/30 text-sm">
            <p>© {new Date().getFullYear()} Creative Caricature Club. All rights reserved.</p>
            <p className="mt-1">Event collaboration with {config.event_name}</p>
          </div>
        </footer>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white z-10" aria-label="Close"><X className="w-8 h-8" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + displayGallery.length) % displayGallery.length); }} className="absolute left-4 text-white/60 hover:text-white z-10" aria-label="Previous"><ChevronLeft className="w-10 h-10" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % displayGallery.length); }} className="absolute right-4 text-white/60 hover:text-white z-10" aria-label="Next"><ChevronRight className="w-10 h-10" /></button>
            <motion.img key={lightboxIdx} initial={{ opacity: 0, scale: 0.85, rotateY: 15 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} src={displayGallery[lightboxIdx]} alt="Gallery preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
            <p className="absolute bottom-6 text-white/40 text-sm">{lightboxIdx + 1} / {displayGallery.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LilFlea;
