import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Palette, Heart, Laugh, Crown, Minimize2, Sparkles, Clock, Truck, Camera, MessageCircle, ArrowRight, User, LogOut, Package, Search, X, ChevronLeft, ChevronRight, Star, Users, Calendar, Award, Zap, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useHomepageContent } from "@/hooks/useHomepageContent";
import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import SEOHead from "@/components/SEOHead";
import { toast } from "@/hooks/use-toast";
import JsonLd from "@/components/JsonLd";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { useMaintenanceCheck } from "@/hooks/useMaintenanceCheck";
import useSocialLinks from "@/hooks/useSocialLinks";
import HomepageStickyCTA from "@/components/homepage/HomepageStickyCTA";
import HomepageUrgencyStrip from "@/components/homepage/HomepageUrgencyStrip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Lazy load below-the-fold homepage sections for faster initial paint
const HomepageGallery = lazy(() => import("@/components/HomepageGallery"));
const HomepageBeforeAfter = lazy(() => import("@/components/HomepageBeforeAfter"));
const HomepageScrollEvents = lazy(() => import("@/components/HomepageScrollEvents"));
const HomepageReviews = lazy(() => import("@/components/HomepageReviews"));
const HomepageTrustedBrands = lazy(() => import("@/components/HomepageTrustedBrands"));
const HomepageVideo = lazy(() => import("@/components/homepage/HomepageVideo"));
const HomepageInstantQuote = lazy(() => import("@/components/homepage/HomepageInstantQuote"));
const HomepageSocialProof = lazy(() => import("@/components/homepage/HomepageSocialProof"));
const HomepageWhatYouGet = lazy(() => import("@/components/homepage/HomepageWhatYouGet"));
const HomepageWhyUs = lazy(() => import("@/components/homepage/HomepageWhyUs"));
const HomepageUseCases = lazy(() => import("@/components/homepage/HomepageUseCases"));
const HomepageSmartHelp = lazy(() => import("@/components/homepage/HomepageSmartHelp"));
const HomepageEnquiryFunnel = lazy(() => import("@/components/homepage/HomepageEnquiryFunnel"));

// Eagerly load first 4 gallery images for above-the-fold, lazy load rest
import gallery1 from "@/assets/gallery/gallery-1.jpeg";
import gallery2 from "@/assets/gallery/gallery-2.jpeg";
import gallery3 from "@/assets/gallery/gallery-3.jpeg";
import gallery4 from "@/assets/gallery/gallery-4.jpeg";

const lazyGallery = () => Promise.all([
  import("@/assets/gallery/gallery-5.jpeg"),
  import("@/assets/gallery/gallery-6.jpeg"),
  import("@/assets/gallery/gallery-7.jpeg"),
  import("@/assets/gallery/gallery-8.jpeg"),
  import("@/assets/gallery/gallery-9.jpeg"),
  import("@/assets/gallery/gallery-10.jpeg"),
]).then(mods => mods.map(m => m.default));

const useGalleryImages = () => {
  const [images, setImages] = useState([gallery1, gallery2, gallery3, gallery4]);
  useEffect(() => {
    lazyGallery().then(rest => setImages([gallery1, gallery2, gallery3, gallery4, ...rest]));
  }, []);
  return images;
};

const styles = [
  { icon: Palette, name: "Cute", desc: "Adorable & charming portraits" },
  { icon: Heart, name: "Romantic", desc: "Perfect for couples & love" },
  { icon: Laugh, name: "Fun", desc: "Playful & humorous vibes" },
  { icon: Crown, name: "Royal", desc: "Majestic & regal themes" },
  { icon: Minimize2, name: "Minimal", desc: "Clean & elegant lines" },
  { icon: Sparkles, name: "Artist's Choice", desc: "Let our artists surprise you" },
];

const Lightbox = ({ images, currentIndex, onClose, onPrev, onNext }: {
  images: string[]; currentIndex: number; onClose: () => void; onPrev: () => void; onNext: () => void;
}) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-foreground/80 flex items-center justify-center"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-background/80 hover:text-background z-10">
        <X className="w-8 h-8" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 text-background/80 hover:text-background z-10">
        <ChevronLeft className="w-10 h-10" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 text-background/80 hover:text-background z-10">
        <ChevronRight className="w-10 h-10" />
      </button>
      <motion.img
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        src={images[currentIndex]}
        alt={`Gallery ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-6 text-background/60 font-body text-sm">{currentIndex + 1} / {images.length}</p>
    </motion.div>
  </AnimatePresence>
);

const InfiniteScrollGallery = ({ images, onImageClick }: { images: string[]; onImageClick: (idx: number) => void }) => {
  const doubled = [...images, ...images];
  return (
    <div className="overflow-hidden py-8">
      <motion.div
        className="flex gap-4"
        animate={{ x: [0, -(images.length * 280)] }}
        transition={{ x: { repeat: Infinity, repeatType: "loop", duration: 30, ease: "linear" } }}
      >
        {doubled.map((img, i) => (
          <motion.div
            key={i}
            className="flex-shrink-0 w-64 h-80 rounded-2xl overflow-hidden cursor-pointer shadow-md"
            whileHover={{ scale: 1.03, y: -4 }}
            transition={{ duration: 0.3 }}
            onClick={() => onImageClick(i % images.length)}
          >
            <img src={img} alt={`Caricature artwork ${(i % images.length) + 1}`} className="w-full h-full object-cover" width={256} height={320} loading="lazy" decoding="async" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const socialLinks = useSocialLinks();
  const galleryImages = useGalleryImages();
  const { content } = useHomepageContent();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [redirectChecked, setRedirectChecked] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const maintenance = useMaintenanceCheck("home");

  // Smart redirect: logged-in users go to their dashboard
  useEffect(() => {
    if (loading || redirectChecked || !user) { setRedirectChecked(true); return; }
    const checkRole = async () => {
      // Check if admin
      const { data: adminRole } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (adminRole) {
        const lastAdmin = sessionStorage.getItem("ccc_admin_session");
        if (lastAdmin) { navigate("/admin-panel", { replace: true }); return; }
      }
      // Check if artist
      const { data: artist } = await supabase.from("artists").select("id").eq("auth_user_id", user.id).maybeSingle() as any;
      if (artist) { navigate("/artist-dashboard", { replace: true }); return; }
      // Regular user → dashboard
      navigate("/dashboard", { replace: true });
    };
    checkRole();
    setRedirectChecked(true);
  }, [user, loading, redirectChecked]);

  const hero = content.homepage_hero || {};
  const sections = content.homepage_sections || {};
  const sectionOrder: string[] = sections._order || [
    "instant_quote", "social_proof", "video", "enquiry_funnel", "portfolio_gallery",
    "what_you_get", "how_it_works", "scroll_events", "services", "use_cases",
    "styles", "why_us", "reviews", "trusted_brands", "event_gallery",
    "caricature_gallery", "before_after", "smart_help"
  ];
  const isSectionVisible = (id: string) => sections[id]?.visible !== false;
  const getSectionMessage = (id: string) => sections[id]?.message || "";
  const handleOrderClick = () => navigate(user ? "/order" : "/login");
  const handleEventClick = () => {
    if (!user) { navigate("/login"); return; }
    navigate("/book-event");
  };

  const openLightbox = useCallback((idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  if (maintenance.isEnabled) {
    return <MaintenanceScreen title={maintenance.title} message={maintenance.message} estimatedEnd={maintenance.estimatedEnd} />;
  }

  return (
    <div className="min-h-screen bg-background pb-36 md:pb-0">
      <SEOHead 
        title="Book Caricature Artist for Events & Order Custom Caricatures from Photos"
        description="Book professional caricature artists for weddings, corporate events, birthdays and parties. Order custom caricatures from photos online. India's #1 caricature studio."
        canonical="/" 
      />
      <JsonLd />
      {lightboxOpen && (
        <Lightbox
          images={galleryImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={() => setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
          onNext={() => setLightboxIndex((i) => (i + 1) % galleryImages.length)}
        />
      )}

      {/* Global Urgency Banner */}
      <HomepageUrgencyStrip config={content.homepage_urgency} />

      {/* Top Nav */}
      <header>
      <nav className="sticky top-0 z-40 glass-nav">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-9 h-9 rounded-full border-2 border-border" />
            <span className="font-calligraphy text-xl font-bold hidden sm:inline text-foreground">Creative Caricature Club</span>
          </div>
          <div className="flex items-center gap-3">
            {settings.shop_nav_visible && (
              <Button variant="outline" size="sm" onClick={() => navigate("/shop")} className="rounded-full font-body gap-1 hidden sm:flex">
                <Package className="w-4 h-4" /> Shop
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/track-order")} className="rounded-full font-body gap-1 hidden sm:flex">
              <Search className="w-4 h-4" /> Track Order
            </Button>
            {settings.support_button_visible?.enabled && (
              <Button variant="outline" size="sm" onClick={() => navigate("/support")} className="rounded-full font-body gap-1 hidden sm:flex border-accent/30 text-accent hover:bg-accent/10">
                <MessageCircle className="w-4 h-4" /> Support
              </Button>
            )}
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full font-body gap-2">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">My Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="font-body"><User className="w-4 h-4 mr-2" /> Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/order")} className="font-body"><Palette className="w-4 h-4 mr-2" /> New Order</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="font-body text-destructive"><LogOut className="w-4 h-4 mr-2" /> Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="font-body">Login</Button>
                  <Button size="sm" onClick={() => navigate("/register")} className="rounded-full font-body">Register</Button>
                </div>
              )
            )}
          </div>
        </div>
      </nav>
      </header>

      {/* Hero Section */}
      <main>
      <section className="relative overflow-hidden" ref={heroRef}>
        {/* Soft gradient — no harsh animations on mobile */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card/30 to-background" />
        <div className="absolute inset-0 hidden lg:block">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        <motion.div style={{ y: heroY, opacity: heroOpacity, scale: heroScale }} className="container mx-auto px-4 pt-8 pb-12 md:py-28 lg:py-36 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 xl:gap-24">
            {/* Mobile: Compact logo + branding */}
            <div className="flex flex-col items-center lg:hidden w-full">
              <img src="/logo.png" alt="Creative Caricature Club" className="w-16 h-16 rounded-[1.25rem] border-2 border-border/30 bg-card shadow-xl mb-4" width={64} height={64} />
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[11px] font-sans font-semibold text-primary">India's #1 Caricature Studio</span>
              </motion.div>
            </div>

            {/* Left: Text content */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex-1 text-center lg:text-left max-w-2xl">
              {/* Desktop badge */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
                className="hidden lg:inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-body font-semibold text-primary tracking-wide">India's #1 Premium Caricature Studio</span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                className="font-calligraphy text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-bold text-foreground mb-4 lg:mb-6 leading-[1.1]">
                {hero.headline || (<>Turn Moments Into <span className="text-primary relative">Art<svg className="absolute -bottom-2 left-0 w-full hidden lg:block" viewBox="0 0 200 12" fill="none"><path d="M2 8C40 2 80 2 100 6C120 10 160 10 198 4" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.4"/></svg></span></>)}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}
                className="text-base md:text-lg lg:text-xl text-muted-foreground mb-4 max-w-xl mx-auto lg:mx-0 font-body leading-relaxed">
                {hero.subtext || "Book professional caricature artists for weddings, corporate events & parties. Order custom hand-crafted caricatures from your photos."}
              </motion.p>
              {hero.pricing_line && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                  className="text-sm font-body font-semibold text-primary mb-2">
                  {hero.pricing_line}
                </motion.p>
              )}
              {hero.urgency_text && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
                  className="text-xs font-body text-accent mb-6">
                  {hero.urgency_text}
                </motion.p>
              )}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-6">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" onClick={() => navigate(hero.primary_cta_link || (user ? "/order" : "/login"))} className="rounded-full font-body font-semibold shadow-lg shadow-primary/20 text-sm md:text-base px-6 md:px-8 h-12 w-full sm:w-auto">
                    {hero.primary_cta || "Order Your Caricature"} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" variant="outline" onClick={() => navigate(hero.secondary_cta_link || "/book-event")} className="rounded-full font-body font-semibold border-border hover:bg-card text-sm md:text-base px-6 md:px-8 h-12 w-full sm:w-auto">
                    <Zap className="w-4 h-4 mr-2" /> {hero.secondary_cta || "Book for Event"}
                  </Button>
                </motion.div>
              </motion.div>
              {/* Trust badges */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.6 }}
                className="hidden lg:flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[Star, Star, Star, Star, Star].map((S, i) => <S key={i} className="w-4 h-4 text-warning fill-warning" />)}
                  </div>
                  <span className="text-xs font-body font-semibold">4.9/5 Rating</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs font-body font-semibold">5000+ Happy Clients</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs font-body font-semibold">800+ Events Served</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Premium gallery mosaic for desktop */}
            <motion.div initial={{ opacity: 0, scale: 0.85, rotateY: -10 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block flex-shrink-0 w-[480px] xl:w-[540px] relative perspective-1000">
              {/* Decorative frame */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-accent/10 blur-xl" />
              <div className="relative grid grid-cols-12 grid-rows-6 gap-3 h-[520px] xl:h-[580px]">
                {/* Large main image */}
                <motion.div whileHover={{ scale: 1.03, zIndex: 10 }} className="col-span-7 row-span-4 rounded-2xl overflow-hidden shadow-2xl cursor-pointer border border-border/50 relative group"
                  onClick={() => openLightbox(0)}>
                  <img src={galleryImages[0]} alt="Featured caricature artwork" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="eager" width={336} height={347} fetchPriority="high" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-background/90 backdrop-blur-sm text-foreground text-xs font-body font-semibold px-3 py-1 rounded-full">View Gallery</span>
                  </div>
                </motion.div>
                {/* Top right */}
                <motion.div whileHover={{ scale: 1.05, zIndex: 10 }} className="col-span-5 row-span-3 rounded-2xl overflow-hidden shadow-lg cursor-pointer border border-border/50"
                  onClick={() => openLightbox(1)}>
                  <img src={galleryImages[1]} alt="Custom couple caricature" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" width={240} height={261} loading="lazy" decoding="async" />
                </motion.div>
                {/* Bottom right top */}
                <motion.div whileHover={{ scale: 1.05, zIndex: 10 }} className="col-span-5 row-span-3 rounded-2xl overflow-hidden shadow-lg cursor-pointer border border-border/50"
                  onClick={() => openLightbox(2)}>
                  <img src={galleryImages[2]} alt="Event caricature artist" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" width={240} height={261} loading="lazy" decoding="async" />
                </motion.div>
                {/* Bottom left */}
                <motion.div whileHover={{ scale: 1.05, zIndex: 10 }} className="col-span-4 row-span-2 rounded-2xl overflow-hidden shadow-lg cursor-pointer border border-border/50"
                  onClick={() => openLightbox(3)}>
                  <img src={galleryImages[3]} alt="Fun style caricature" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" width={160} height={173} loading="lazy" decoding="async" />
                </motion.div>
                {/* Bottom center */}
                <motion.div whileHover={{ scale: 1.05, zIndex: 10 }} className="col-span-3 row-span-2 rounded-2xl overflow-hidden shadow-lg cursor-pointer border border-border/50"
                  onClick={() => openLightbox(4)}>
                  <img src={galleryImages[4]} alt="Royal style caricature" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" loading="lazy" />
                </motion.div>
              </div>
              {/* Floating stats card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
                className="absolute -bottom-6 -left-6 bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-5 py-4 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                    <Award className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-body font-bold text-foreground">Trusted by 5000+</p>
                    <p className="text-xs font-body text-muted-foreground">clients across India</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }}
          className="glass-crystal border-t border-border/20">
          <div className="container mx-auto px-4 py-3 text-center">
            <p className="text-xs md:text-sm font-body text-muted-foreground flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Due to high demand, delivery timeline is 25–30 days
            </p>
          </div>
        </motion.div>
      </section>

      {/* Dynamic Sections — rendered in admin-configured order, lazy loaded */}
      <Suspense fallback={null}>
      {sectionOrder.map((sectionId) => {
        const renderHiddenMessage = () => {
          const msg = getSectionMessage(sectionId);
          if (!msg) return null;
          return (
            <motion.div key={`hidden-${sectionId}`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="container mx-auto px-4 py-8 text-center">
              <p className="text-muted-foreground font-body animate-pulse">{msg}</p>
            </motion.div>
          );
        };

        if (!isSectionVisible(sectionId)) return renderHiddenMessage();

        switch (sectionId) {
          case "instant_quote":
            return <div key={sectionId} id="section-instant-quote"><HomepageInstantQuote config={content.homepage_instant_quote} /></div>;
          case "social_proof":
            return <div key={sectionId} id="section-social-proof"><HomepageSocialProof config={content.homepage_social_proof} /></div>;
          case "video":
            return <div key={sectionId} id="section-video"><HomepageVideo config={content.homepage_video} /></div>;
          case "enquiry_funnel":
            return <div key={sectionId} id="section-enquiry-funnel"><HomepageEnquiryFunnel /></div>;
          case "portfolio_gallery":
            return (
              <section key={sectionId} className="py-16 md:py-20" aria-label="Gallery of recent caricature work" id="section-portfolio-gallery">
                <div className="container mx-auto px-4">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-8">
                    <motion.p initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                      className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Portfolio</motion.p>
                    <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-2">Our Recent Work</h2>
                    <p className="text-muted-foreground font-body">Every stroke tells a story — tap to view fullscreen</p>
                  </motion.div>
                </div>
                <InfiniteScrollGallery images={galleryImages} onImageClick={openLightbox} />
              </section>
            );
          case "what_you_get":
            return <div key={sectionId} id="section-what-you-get"><HomepageWhatYouGet config={content.homepage_what_you_get} /></div>;
          case "how_it_works":
            return (
              <section key={sectionId} className="container mx-auto px-4 py-16 md:py-24" id="section-how-it-works">
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-12 md:mb-16">
                  <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Simple Process</p>
                  <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-3">How It Works</h2>
                  <p className="text-muted-foreground font-body max-w-md mx-auto">Get your custom caricature in three easy steps</p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  {[
                    { icon: Camera, step: "1", title: "Upload & Customize", desc: "Upload clear photos, pick your style, and share your preferences.", route: user ? "/order" : "/login" },
                    { icon: Palette, step: "2", title: "We Create", desc: "Our talented artists hand-craft your unique caricature with love.", route: "/about" },
                    { icon: Truck, step: "3", title: "You Receive", desc: "Get your framed artwork delivered to your doorstep in 25–30 days.", route: "/track-order" },
                  ].map((item, i) => (
                    <motion.div key={item.step} initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }}
                      transition={{ duration: 0.7, delay: i * 0.2, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -12, transition: { duration: 0.3, ease: "easeOut" } }}
                      className="cursor-pointer group" onClick={() => navigate(item.route)}>
                      <Card className="text-center h-full border border-border group-hover:border-primary/30 group-hover:shadow-xl transition-all duration-500">
                        <CardContent className="pt-10 pb-8 px-6">
                          <motion.div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-primary/15 group-hover:bg-primary/25 transition-colors"
                            whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }} transition={{ duration: 0.4 }}>
                            <item.icon className="w-7 h-7 text-primary" />
                          </motion.div>
                          <span className="text-[10px] font-body font-bold text-primary uppercase tracking-widest">Step {item.step}</span>
                          <h3 className="font-calligraphy text-2xl font-semibold mt-2 mb-3 text-foreground">{item.title}</h3>
                          <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                          <span className="inline-flex items-center gap-1 mt-4 text-xs font-body font-semibold text-primary group-hover:gap-2 transition-all">
                            Learn more <ArrowRight className="w-3 h-3" />
                          </span>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          case "scroll_events":
            return <div key={sectionId} id="section-scroll-events"><HomepageScrollEvents /></div>;
          case "services":
            return (
              <section key={sectionId} className="bg-card/50 py-16 md:py-24 border-y border-border/50" id="section-services">
                <div className="container mx-auto px-4">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16">
                    <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">What We Offer</p>
                    <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-3">Our Services</h2>
                    <p className="text-muted-foreground font-body max-w-md mx-auto">From personal gifts to grand events, we have you covered</p>
                  </motion.div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                    {[
                      { icon: Sparkles, title: "Live Event Caricature", desc: "Professional artists at your wedding, birthday, or corporate event.", action: handleEventClick, cta: "Book for Event" },
                      { icon: Palette, title: "Custom Caricature", desc: "Hand-crafted caricatures from your photos. Perfect for gifts & wall art.", action: handleOrderClick, cta: "Order Now" },
                      { icon: Award, title: "Corporate Events", desc: "Elevate your corporate gatherings with live caricature entertainment.", action: handleEventClick, cta: "Enquire Now" },
                      ...(settings.shop_nav_visible?.enabled !== false ? [{
                        icon: ShoppingBag, title: "Merchandise Store", desc: "Caricature-themed apparel and custom printed merchandise.",
                        action: () => navigate("/shop"), cta: "Shop Now"
                      }] : [{ icon: ShoppingBag, title: "Merchandise Store", desc: "Coming soon!", action: () => {}, cta: "Coming Soon" }]),
                    ].map((service, i) => (
                      <motion.div key={service.title} initial={{ opacity: 0, scale: 0.85, rotateY: -20 }} whileInView={{ opacity: 1, scale: 1, rotateY: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5, type: "spring" }} whileHover={{ scale: 1.04, rotateY: 5 }} className="perspective-1000">
                        <Card className="card-3d h-full flex flex-col">
                          <CardContent className="pt-8 pb-6 px-5 flex flex-col flex-1">
                            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-5">
                              <service.icon className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="font-calligraphy text-xl font-semibold mb-3 text-foreground">{service.title}</h3>
                            <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1">{service.desc}</p>
                            <Button variant={service.cta === "Coming Soon" ? "secondary" : "outline"} className="mt-5 rounded-full font-body w-full" onClick={service.action} disabled={service.cta === "Coming Soon"}>
                              {service.cta} {service.cta !== "Coming Soon" && <ArrowRight className="w-4 h-4 ml-1" />}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            );
          case "use_cases":
            return <div key={sectionId} id="section-use-cases"><HomepageUseCases config={content.homepage_use_cases} /></div>;
          case "styles":
            return (
              <section key={sectionId} className="py-16 md:py-24 overflow-hidden" id="section-styles">
                <div className="container mx-auto px-4">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-12 md:mb-16">
                    <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Pick Your Vibe</p>
                    <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-3">Our Styles</h2>
                    <p className="text-muted-foreground font-body">Choose the vibe that matches your personality</p>
                  </motion.div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
                    {styles.map((style, i) => (
                      <motion.div key={style.name} initial={{ opacity: 0, y: 50, rotate: -3 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, margin: "-20px" }}
                        transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={{ scale: 1.08, y: -10, transition: { duration: 0.25 } }}
                        whileTap={{ scale: 0.95 }} onClick={handleOrderClick} className="cursor-pointer">
                        <Card className="group border border-border hover:border-primary/40 transition-all bg-card rounded-2xl hover:shadow-xl hover:shadow-primary/5">
                          <CardContent className="p-5 md:p-6 text-center">
                            <motion.div className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-3 bg-primary/15 group-hover:bg-primary/25 transition-colors"
                              whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                              <style.icon className="w-6 h-6 text-primary" />
                            </motion.div>
                            <h3 className="font-calligraphy text-xl md:text-2xl font-semibold mb-1 text-foreground">{style.name}</h3>
                            <p className="text-xs text-muted-foreground font-body">{style.desc}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            );
          case "why_us":
            return <div key={sectionId} id="section-why-us"><HomepageWhyUs config={content.homepage_why_us} /></div>;
          case "reviews":
            return <div key={sectionId} id="section-reviews"><HomepageReviews /></div>;
          case "trusted_brands":
            return <div key={sectionId} id="section-trusted-brands"><HomepageTrustedBrands /></div>;
          case "event_gallery":
            return <div key={sectionId} id="section-event-gallery"><HomepageGallery table="event_gallery" title="Event Gallery" subtitle="Live Caricature Events" /></div>;
          case "caricature_gallery":
            return <div key={sectionId} id="section-caricature-gallery"><HomepageGallery table="caricature_gallery" title="Custom Caricature Gallery" subtitle="Hand-Crafted Masterpieces" /></div>;
          case "before_after":
            return <div key={sectionId} id="section-before-after"><HomepageBeforeAfter /></div>;
          case "smart_help":
            return <div key={sectionId} id="section-smart-help"><HomepageSmartHelp config={content.homepage_smart_help} /></div>;
          default:
            return null;
        }
      })}
      </Suspense>


      {/* CTA */}
      <section className="container mx-auto px-4 py-20 md:py-28 relative">
        <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <div className="w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="text-center max-w-2xl mx-auto relative z-10">
          <motion.h2 className="font-calligraphy text-4xl md:text-6xl font-bold text-foreground mb-6"
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }}>
            Make Your Event Unforgettable
          </motion.h2>
          <p className="text-muted-foreground font-body mb-10 text-lg leading-relaxed">
            Turn your favorite photos into stunning hand-crafted caricatures. Perfect for gifts, events & memories!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
              <Button size="xl" onClick={handleEventClick} className="rounded-full font-body font-semibold shadow-lg shadow-primary/20">
                <Calendar className="w-5 h-5 mr-2" /> Book Your Event
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
              <Button size="xl" variant="outline" onClick={handleOrderClick} className="rounded-full font-body font-semibold border-border hover:bg-card">
                <Palette className="w-5 h-5 mr-2" /> Start Your Order
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Contact */}
      <section className="bg-card/50 py-12 md:py-16 border-t border-border/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-calligraphy text-3xl md:text-4xl font-bold mb-4 text-foreground">Need Help?</h2>
          <p className="text-muted-foreground font-body mb-6">Reach out to us anytime for support</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={content.homepage_smart_help?.instagram_url || "https://www.instagram.com/creativecaricatureclub"} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] text-white rounded-full py-3 px-6 font-body font-medium hover:shadow-lg transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              DM on Instagram
            </a>
            <Link to="/live-chat"
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full py-3 px-6 font-body font-medium hover:shadow-lg transition-all">
              <MessageCircle className="w-5 h-5" /> Live Chat
            </Link>
          </div>
        </div>
      </section>

      </main>

      {/* Footer - Clean Ivory/White */}
      <footer className="relative overflow-hidden bg-card border-t border-border/40">
        <div className="container mx-auto px-4 py-10 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 cursor-pointer mb-3" onClick={() => navigate("/")}>
                <img src="/logo.png" alt="CCC" className="w-11 h-11 rounded-xl border border-border shadow-sm" />
                <div>
                  <span className="font-calligraphy text-lg font-bold text-foreground block">CCC</span>
                  <span className="text-[10px] text-muted-foreground">Creative Caricature Club</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">India's premium caricature studio. Hand-crafted art for events, gifts & memories.</p>
              <p className="font-calligraphy text-sm text-primary/70 mt-2">Drawn with love & laughter ✏️</p>
              <div className="flex gap-2 mt-4 flex-wrap">
                {socialLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center hover:bg-primary/15 transition-all hover:scale-110 border border-border/50"
                    aria-label={link.platform}>
                    {link.icon_svg ? (
                      <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: link.icon_svg }} />
                    ) : (
                      <span className="text-xs font-bold text-foreground">{link.platform[0].toUpperCase()}</span>
                    )}
                  </a>
                ))}
                {socialLinks.length === 0 && (
                  <>
                    <a href={content.homepage_smart_help?.instagram_url || "https://www.instagram.com/creativecaricatureclub"} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center hover:bg-pink-500/20 transition-all border border-pink-200/50" aria-label="Instagram">
                      <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                    <a href="https://www.youtube.com/@creativecaricatureclub" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-all border border-red-200/50" aria-label="YouTube">
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </a>
                    <a href={`https://wa.me/${content.homepage_smart_help?.whatsapp_number || "918369594271"}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 transition-all border border-green-200/50" aria-label="WhatsApp">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                    <a href="https://www.threads.net/@creativecaricatureclub" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center hover:bg-foreground/10 transition-all border border-border/50" aria-label="Threads">
                      <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.22 1.332-2.96.834-.666 1.98-1.044 3.227-1.065.901-.015 1.747.098 2.524.336.012-.574-.003-1.122-.046-1.625-.194-2.236-1.09-3.326-2.737-3.326h-.077c-.996.018-1.794.396-2.308 1.094l-1.61-1.178C8.62 4.16 9.94 3.5 11.586 3.465h.11c1.217.02 2.225.376 2.993 1.058.869.77 1.392 1.91 1.556 3.39.047.434.075.9.082 1.396 1.017.479 1.832 1.15 2.418 2.004.876 1.275 1.084 2.858.589 4.47-.72 2.34-2.836 3.972-5.96 4.598-.53.106-1.09.167-1.674.188h-.514zm-.264-8.72c-.88.015-1.592.227-2.068.607-.37.295-.548.65-.53 1.055.033.608.356 1.087.961 1.427.641.36 1.432.505 2.22.462 1.083-.06 1.904-.455 2.44-1.174.364-.488.625-1.108.782-1.856-.818-.328-1.77-.513-2.805-.522z"/></svg>
                    </a>
                    <a href="mailto:creativecaricatureclub@gmail.com" className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center hover:bg-blue-500/20 transition-all border border-blue-200/50" aria-label="Email">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    </a>
                  </>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-body font-bold text-foreground text-sm mb-3 uppercase tracking-wider">Quick Links</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/about" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">About Us</Link>
                <Link to="/enquiry" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Enquiry</Link>
                <Link to="/track-order" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Track Order</Link>
                <Link to="/blog" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Blog</Link>
                <Link to="/support" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Support</Link>
                <Link to="/live-chat" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Live Chat</Link>
                <Link to="/faqs" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">FAQs</Link>
              </div>
            </div>
            <div>
              <h4 className="font-body font-bold text-foreground text-sm mb-3 uppercase tracking-wider">Policies</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/terms" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Terms & Conditions</Link>
                <Link to="/privacy" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Privacy Policy</Link>
                <Link to="/refund" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Refund Policy</Link>
                <Link to="/shipping" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Shipping Policy</Link>
                <Link to="/cancellation" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Cancellation</Link>
                <Link to="/event-policy" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Event Policy</Link>
              </div>
            </div>
            <div>
              <h4 className="font-body font-bold text-foreground text-sm mb-3 uppercase tracking-wider">More</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/intellectual-property" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">IP Policy</Link>
                <Link to="/workshop-policy" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Workshop Policy</Link>
                <Link to="/disclaimer" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Disclaimer</Link>
                <Link to="/caricature-budgeting" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Caricature Budgeting</Link>
                {settings.workshop_button?.enabled && (
                  <a href={settings.workshop_button.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">{settings.workshop_button.label}</a>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-border/30 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground font-body">© 2025 Creative Caricature Club. All rights reserved. · Founded by Ritesh Mahendra Gupta</p>
            <div className="flex items-center gap-4 flex-wrap">
              {(settings as any).pwa_install_link?.enabled && (
                <button 
                  onClick={() => {
                    const deferredPrompt = (window as any).__pwaInstallPrompt;
                    if (deferredPrompt) { deferredPrompt.prompt(); }
                    else { toast({ title: "Install App", description: "Use your browser menu → 'Add to Home Screen' to install this app" }); }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  📲 Install App (PWA)
                </button>
              )}
              {settings.app_download_link?.enabled === true && (
                <a href="/app/ccc-app.apk" download className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-primary hover:text-primary/80 transition-colors">
                  📱 Download Android App
                </a>
              )}
              <p className="text-xs text-muted-foreground font-body">
                Design & Prompted by <a href="https://www.instagram.com/akashustle" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold transition-colors">Akash</a>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky CTA (Mobile) */}
      <HomepageStickyCTA config={content.homepage_sticky_cta} />
    </div>
  );
};

export default Index;
