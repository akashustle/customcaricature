import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { MapPin, Calendar, Clock, ArrowRight, Ticket, Phone, ChevronLeft, ChevronRight, X, Instagram, ExternalLink, Sparkles, Users, Palette, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const TICKET_URL = "https://thelilflea.com/booking-tickets-mumbai?utm_source=chatgpt.com";

const EXPERIENCE_CARDS = [
  { title: "Single Caricature", desc: "Your personality captured in a fun sketch", icon: Sparkles, color: "from-amber-500 to-orange-600" },
  { title: "Couple Caricature", desc: "A memorable sketch for two", icon: Heart, color: "from-pink-500 to-rose-600" },
  { title: "Family Caricature", desc: "The whole family, one fun portrait", icon: Users, color: "from-violet-500 to-purple-600" },
  { title: "Color & B&W", desc: "Choose your style — vibrant or classic", icon: Palette, color: "from-cyan-500 to-blue-600" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Visit Our Stall", desc: "Find us at The Lil Flea — look for the big Caricature sign!" },
  { step: "02", title: "Sit & Get Sketched", desc: "Relax while our artist captures your likeness in minutes" },
  { step: "03", title: "Take It Home", desc: "Walk away with a unique, hand-drawn caricature memento" },
];

/* ─── Entry Gate Overlay ─── */
const EntryGate = ({ onEnter }: { onEnter: () => void }) => (
  <motion.div
    className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
    style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1207 50%, #0a0a0a 100%)" }}
    exit={{ opacity: 0, scale: 1.1 }}
    transition={{ duration: 0.6 }}
  >
    {/* Ambient glow particles */}
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full"
        style={{
          background: i % 2 === 0 ? "#f59e0b" : "#fb923c",
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0, 1.5, 0],
          y: [0, -40],
        }}
        transition={{
          duration: 2 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 3,
        }}
      />
    ))}

    {/* Gate frame */}
    <motion.div
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative border-2 border-amber-500/30 rounded-3xl p-8 md:p-12 flex flex-col items-center gap-6 max-w-lg mx-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}
    >
      {/* Arch glow */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-16 bg-amber-500/20 rounded-full blur-2xl" />

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-4 flex-wrap justify-center">
        <img src="/logo.png" alt="Creative Caricature Club" className="h-12 md:h-14 object-contain" width={120} height={56} />
        <span className="text-amber-400/60 text-2xl font-light">×</span>
        <img src="/images/lil-flea-logo.png" alt="The Lil Flea" className="h-10 md:h-12 object-contain brightness-0 invert" width={120} height={48} />
      </motion.div>

      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="text-2xl md:text-3xl font-bold text-center text-white">
        Welcome to the Live<br />Caricature Experience 🎨
      </motion.h1>

      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} className="text-amber-200/60 text-center text-sm">
        Step into a world of art, laughter & memories
      </motion.p>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}>
        <Button
          onClick={onEnter}
          size="xl"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold hover:from-amber-400 hover:to-orange-400 rounded-full gap-2 shadow-lg shadow-amber-500/30"
        >
          Enter Experience <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </motion.div>
  </motion.div>
);

/* ─── Tilt Card ─── */
const TiltCard = ({ card, index }: { card: typeof EXPERIENCE_CARDS[0]; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientY - r.top) / r.height - 0.5) * -20;
    const y = ((e.clientX - r.left) / r.width - 0.5) * 20;
    setRot({ x, y });
  };

  const Icon = card.icon;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setRot({ x: 0, y: 0 })}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="perspective-[800px]"
    >
      <div
        className="relative rounded-2xl p-6 border border-white/10 transition-transform duration-200 cursor-pointer group"
        style={{
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{card.title}</h3>
        <p className="text-sm text-white/60">{card.desc}</p>
        {/* Glow on hover */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
      </div>
    </motion.div>
  );
};

/* ─── Main Page ─── */
const LilFlea = () => {
  const navigate = useNavigate();
  const [showGate, setShowGate] = useState(true);
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Booking form
  const [form, setForm] = useState({ name: "", phone: "", event_type: "", date: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  // Check if already entered this session
  useEffect(() => {
    if (sessionStorage.getItem("lf_entered")) setShowGate(false);
  }, []);

  // Fetch gallery
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("lil_flea_gallery").select("*").order("sort_order");
      if (data && data.length > 0) setGalleryImages(data as any[]);
    };
    fetch();
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
        title="Live Caricature at The Lil Flea Mumbai"
        description="Get your caricature made live at The Lil Flea Mumbai! Creative Caricature Club brings professional caricature artists to Jio World Garden, BKC. Apr 3-5 & 10-12."
        canonical="/lil-flea"
        image="/images/lil-flea/lf-3.jpeg"
      />

      {/* JSON-LD Event Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: "Live Caricature at The Lil Flea Mumbai",
            startDate: "2025-04-03T15:00:00+05:30",
            endDate: "2025-04-12T23:00:00+05:30",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            location: {
              "@type": "Place",
              name: "Jio World Garden, BKC",
              address: { "@type": "PostalAddress", addressLocality: "Mumbai", addressRegion: "Maharashtra", addressCountry: "IN" },
            },
            image: ["/images/lil-flea/lf-3.jpeg"],
            description: "Get your caricature made live by professional artists at The Lil Flea Mumbai.",
            organizer: { "@type": "Organization", name: "Creative Caricature Club", url: "https://portal.creativecaricatureclub.com" },
            offers: { "@type": "Offer", url: TICKET_URL, availability: "https://schema.org/InStock" },
          }),
        }}
      />

      {/* Entry Gate */}
      <AnimatePresence>
        {showGate && <EntryGate onEnter={handleEnter} />}
      </AnimatePresence>

      <div className="min-h-screen text-white" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #1a1207 40%, #0a0a0a 100%)" }}>

        {/* ─── HERO SECTION ─── */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Parallax bg image */}
          <motion.div style={{ y: heroY }} className="absolute inset-0">
            <img
              src="/images/lil-flea/lf-3.jpeg"
              alt="Live caricature stall at The Lil Flea Mumbai"
              className="w-full h-full object-cover opacity-30"
              loading="eager"
              width={1200}
              height={800}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
          </motion.div>

          {/* Floating glow orbs */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-orange-500/10 rounded-full blur-[80px]" />

          <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center px-4 max-w-4xl mx-auto">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              <img src="/logo.png" alt="Creative Caricature Club" className="h-10 md:h-12" width={100} height={48} />
              <span className="text-amber-400/50 text-xl">×</span>
              <img src="/images/lil-flea-logo.png" alt="The Lil Flea" className="h-8 md:h-10 brightness-0 invert" width={100} height={40} />
            </motion.div>

            <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
              We're <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Live</span> at
              <br />The Lil Flea 🎨
            </motion.h1>

            <motion.p initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="text-lg md:text-xl text-white/70 mb-2">
              Get your caricature made in minutes
            </motion.p>

            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap items-center justify-center gap-4 text-sm text-amber-200/80 mb-8">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Jio World Garden, BKC, Mumbai</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Apr 3–5 & Apr 10–12</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> From 3 PM onwards</span>
            </motion.div>

            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="flex flex-wrap items-center justify-center gap-4">
              <Button
                size="xl"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold hover:from-amber-400 hover:to-orange-400 rounded-full gap-2 shadow-lg shadow-amber-500/30"
                onClick={() => window.open("https://maps.app.goo.gl/JioWorldGardenBKC", "_blank")}
              >
                <MapPin className="w-5 h-5" /> Visit Our Stall
              </Button>
              <Button
                size="xl"
                className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-full gap-2 backdrop-blur-sm"
                onClick={() => window.open(TICKET_URL, "_blank")}
              >
                <Ticket className="w-5 h-5" /> Book Tickets
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-amber-400 rounded-full" />
          </motion.div>
        </section>

        {/* ─── TICKET BOOKING STRIP ─── */}
        <section className="relative z-10 -mt-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-black font-bold text-lg">
              <Ticket className="w-5 h-5" />
              <span>Limited Entry — Book Your Tickets Now!</span>
            </div>
            <Button
              className="bg-black text-amber-400 hover:bg-black/80 rounded-full font-bold gap-2"
              onClick={() => window.open(TICKET_URL, "_blank")}
            >
              Book on The Lil Flea <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* ─── EXPERIENCE CARDS ─── */}
        <section className="py-20 md:py-28 relative">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <p className="text-amber-400 uppercase tracking-widest text-sm font-semibold mb-2">What We Offer</p>
              <h2 className="text-3xl md:text-5xl font-bold">The Caricature Experience</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {EXPERIENCE_CARDS.map((card, i) => (
                <TiltCard key={card.title} card={card} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── LIVE EXPERIENCE CAROUSEL ─── */}
        <section className="py-20 relative overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <p className="text-amber-400 uppercase tracking-widest text-sm font-semibold mb-2">Live at the Event</p>
              <h2 className="text-3xl md:text-5xl font-bold mb-3">Watch It Come Alive</h2>
              <p className="text-white/60">Your caricature, sketched in 3–5 minutes</p>
            </motion.div>

            <div className="relative max-w-4xl mx-auto">
              <div className="overflow-hidden rounded-2xl aspect-[16/10]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={carouselIdx}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    src={EVENT_IMAGES[carouselIdx]}
                    alt={`Live caricature event photo ${carouselIdx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={800}
                    height={500}
                  />
                </AnimatePresence>
              </div>
              <button onClick={() => setCarouselIdx(i => (i - 1 + EVENT_IMAGES.length) % EVENT_IMAGES.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/80" aria-label="Previous">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCarouselIdx(i => (i + 1) % EVENT_IMAGES.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/80" aria-label="Next">
                <ChevronRight className="w-5 h-5" />
              </button>
              {/* Dots */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {EVENT_IMAGES.map((_, i) => (
                  <button key={i} onClick={() => setCarouselIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === carouselIdx ? "bg-amber-400 w-6" : "bg-white/30"}`} aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── GALLERY ─── */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <p className="text-amber-400 uppercase tracking-widest text-sm font-semibold mb-2">Our Work</p>
              <h2 className="text-3xl md:text-5xl font-bold">Gallery</h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl mx-auto">
              {displayGallery.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="rounded-xl overflow-hidden cursor-pointer aspect-square border border-white/10"
                  onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }}
                >
                  <img src={typeof img === "string" ? img : img} alt={`Caricature gallery ${i + 1}`} className="w-full h-full object-cover" loading="lazy" width={300} height={300} />
                </motion.div>
              ))}
            </div>

            {allImages.length > 10 && (
              <div className="text-center mt-8">
                <Button variant="outline" className="rounded-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10 gap-2" onClick={() => navigate("/gallery/events")}>
                  View Full Gallery <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <p className="text-amber-400 uppercase tracking-widest text-sm font-semibold mb-2">Simple Process</p>
              <h2 className="text-3xl md:text-5xl font-bold">How It Works</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {HOW_IT_WORKS.map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="text-center relative"
                >
                  <div className="text-6xl font-black text-amber-500/10 mb-2">{item.step}</div>
                  <h3 className="text-xl font-bold text-white mb-2 -mt-6">{item.title}</h3>
                  <p className="text-white/60 text-sm">{item.desc}</p>
                  {i < 2 && <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-amber-500/40 to-transparent" />}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING MESSAGE ─── */}
        <section className="py-16 relative">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="rounded-2xl p-8 md:p-12 border border-amber-500/20" style={{ background: "rgba(245,158,11,0.05)", backdropFilter: "blur(10px)" }}>
              <Palette className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Caricatures Available Live 🎨</h2>
              <p className="text-white/70 mb-6">Visit us at The Lil Flea to experience & get yours made instantly. No appointment needed!</p>
              <Button size="xl" className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-full gap-2" onClick={() => window.open(TICKET_URL, "_blank")}>
                <Ticket className="w-5 h-5" /> Book Tickets for The Lil Flea
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ─── EVENT BOOKING FORM ─── */}
        <section className="py-20 relative" id="book-us">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <p className="text-amber-400 uppercase tracking-widest text-sm font-semibold mb-2">For Your Events</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Book Us for Weddings & Events</h2>
                <p className="text-white/60 mb-6">Bring the caricature experience to your next celebration — weddings, corporate events, birthdays & more.</p>
                <div className="space-y-4">
                  <a href="https://wa.me/919819731040?text=Hi!%20I%20saw%20you%20at%20The%20Lil%20Flea%20and%20want%20to%20book%20for%20my%20event" target="_blank" rel="noopener" className="flex items-center gap-3 text-white/80 hover:text-amber-400 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><Phone className="w-5 h-5 text-green-400" /></div>
                    Chat on WhatsApp
                  </a>
                  <a href="https://www.instagram.com/creativecaricatureclub/" target="_blank" rel="noopener" className="flex items-center gap-3 text-white/80 hover:text-amber-400 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center"><Instagram className="w-5 h-5 text-pink-400" /></div>
                    Follow on Instagram
                  </a>
                </div>
              </motion.div>

              <motion.form onSubmit={handleBookingSubmit} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4 rounded-2xl p-6 border border-white/10" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}>
                <Input placeholder="Your Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" required />
                <Input placeholder="Phone Number *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" required />
                <Input placeholder="Event Type (e.g. Wedding, Birthday)" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                <Input type="date" placeholder="Event Date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                <Button type="submit" disabled={submitting} size="lg" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-full">
                  {submitting ? "Sending..." : "Send Booking Request"}
                </Button>
              </motion.form>
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PROOF ─── */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <p className="text-amber-400 uppercase tracking-widest text-sm font-semibold mb-2">Happy Customers</p>
              <h2 className="text-3xl md:text-5xl font-bold">Reactions That Speak</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {EVENT_IMAGES.slice(0, 3).map((img, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-2xl overflow-hidden border border-white/10">
                  <img src={img} alt={`Customer reaction ${i + 1}`} className="w-full h-64 object-cover" loading="lazy" width={400} height={256} />
                  <div className="p-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <p className="text-white/70 text-sm">"Amazing experience! Got our caricature done in minutes!" ⭐⭐⭐⭐⭐</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Catch Us <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">LIVE</span> at The Lil Flea
              </h2>
              <p className="text-white/60 mb-8 text-lg">Before it ends! Apr 3–5 & Apr 10–12 at Jio World Garden, BKC</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="xl" className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-full gap-2 shadow-lg shadow-amber-500/30" onClick={() => window.open("https://maps.app.goo.gl/JioWorldGardenBKC", "_blank")}>
                  <MapPin className="w-5 h-5" /> Get Directions
                </Button>
                <Button size="xl" className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-full gap-2 backdrop-blur-sm" onClick={() => window.open(TICKET_URL, "_blank")}>
                  <Ticket className="w-5 h-5" /> Book Tickets
                </Button>
                <Button size="xl" variant="outline" className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10 rounded-full gap-2" onClick={() => document.getElementById("book-us")?.scrollIntoView({ behavior: "smooth" })}>
                  Book Us <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-white/10">
          <div className="container mx-auto px-4 text-center text-white/40 text-sm">
            <p>© {new Date().getFullYear()} Creative Caricature Club. All rights reserved.</p>
            <p className="mt-1">Event collaboration with The Lil Flea</p>
          </div>
        </footer>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white z-10" aria-label="Close"><X className="w-8 h-8" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + displayGallery.length) % displayGallery.length); }} className="absolute left-4 text-white/80 hover:text-white z-10" aria-label="Previous"><ChevronLeft className="w-10 h-10" /></button>
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % displayGallery.length); }} className="absolute right-4 text-white/80 hover:text-white z-10" aria-label="Next"><ChevronRight className="w-10 h-10" /></button>
            <motion.img key={lightboxIdx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} src={displayGallery[lightboxIdx]} alt="Gallery preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
            <p className="absolute bottom-6 text-white/60 text-sm">{lightboxIdx + 1} / {displayGallery.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LilFlea;
