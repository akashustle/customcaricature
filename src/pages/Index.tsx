import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Palette, Heart, Laugh, Crown, Minimize2, Sparkles, Clock, Truck, Camera, MessageCircle, ArrowRight, User, LogOut, Package, Search, X, ChevronLeft, ChevronRight, Star, Users, Calendar, Award, Zap, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useState, useCallback, useRef } from "react";
import SEOHead from "@/components/SEOHead";
import JsonLd from "@/components/JsonLd";
import HomepageGallery from "@/components/HomepageGallery";
import HomepageScrollEvents from "@/components/HomepageScrollEvents";
import HomepageReviews from "@/components/HomepageReviews";
import HomepageTrustedBrands from "@/components/HomepageTrustedBrands";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import gallery1 from "@/assets/gallery/gallery-1.jpeg";
import gallery2 from "@/assets/gallery/gallery-2.jpeg";
import gallery3 from "@/assets/gallery/gallery-3.jpeg";
import gallery4 from "@/assets/gallery/gallery-4.jpeg";
import gallery5 from "@/assets/gallery/gallery-5.jpeg";
import gallery6 from "@/assets/gallery/gallery-6.jpeg";
import gallery7 from "@/assets/gallery/gallery-7.jpeg";
import gallery8 from "@/assets/gallery/gallery-8.jpeg";
import gallery9 from "@/assets/gallery/gallery-9.jpeg";
import gallery10 from "@/assets/gallery/gallery-10.jpeg";

const galleryImages = [gallery1, gallery2, gallery3, gallery4, gallery5, gallery6, gallery7, gallery8, gallery9, gallery10];

const styles = [
  { icon: Palette, name: "Cute", desc: "Adorable & charming portraits" },
  { icon: Heart, name: "Romantic", desc: "Perfect for couples & love" },
  { icon: Laugh, name: "Fun", desc: "Playful & humorous vibes" },
  { icon: Crown, name: "Royal", desc: "Majestic & regal themes" },
  { icon: Minimize2, name: "Minimal", desc: "Clean & elegant lines" },
  { icon: Sparkles, name: "Artist's Choice", desc: "Let our artists surprise you" },
];

const trustStats = [
  { icon: Calendar, value: "500+", label: "Events Completed" },
  { icon: Users, value: "100+", label: "Professional Artists" },
  { icon: Star, value: "1000+", label: "Happy Clients" },
  { icon: Award, value: "4.9★", label: "Average Rating" },
];

const WHATSAPP_NUMBER = "918369594271";
const INSTAGRAM_URL = "https://www.instagram.com/creativecaricatureclub";

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

const InfiniteScrollGallery = ({ onImageClick }: { onImageClick: (idx: number) => void }) => {
  const doubled = [...galleryImages, ...galleryImages];
  return (
    <div className="overflow-hidden py-8">
      <motion.div
        className="flex gap-4"
        animate={{ x: [0, -(galleryImages.length * 280)] }}
        transition={{ x: { repeat: Infinity, repeatType: "loop", duration: 30, ease: "linear" } }}
      >
        {doubled.map((img, i) => (
          <motion.div
            key={i}
            className="flex-shrink-0 w-64 h-80 rounded-2xl overflow-hidden cursor-pointer shadow-md"
            whileHover={{ scale: 1.03, y: -4 }}
            transition={{ duration: 0.3 }}
            onClick={() => onImageClick(i % galleryImages.length)}
          >
            <img src={img} alt={`Caricature ${(i % galleryImages.length) + 1}`} className="w-full h-full object-cover" loading="lazy" />
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleOrderClick = () => navigate(user ? "/order" : "/login");
  const handleEventClick = () => {
    if (!user) { navigate("/login"); return; }
    navigate("/book-event");
  };

  const openLightbox = useCallback((idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
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

      {/* Top Nav */}
      <header>
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-border shadow-sm">
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl mx-auto text-center">
            <motion.img src="/logo.png" alt="Creative Caricature Club" className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-8 rounded-2xl border-4 border-border bg-card p-1 shadow-lg"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-4">India's Premium Caricature Studio</p>
            <h1 className="font-calligraphy text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 leading-[1.1]">
              Book Professional Caricature Artists for Your Event
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto font-body leading-relaxed">
              Custom hand-crafted caricatures that capture personality in every stroke. For gifts, events, and memories that last forever.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button size="xl" onClick={handleOrderClick} className="rounded-full font-body font-semibold">
                  Order Your Caricature <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button size="xl" variant="outline" onClick={handleEventClick} className="rounded-full font-body font-semibold border-border hover:bg-card">
                  <Zap className="w-5 h-5 mr-2" /> Book for Event
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
        <div className="bg-card/80 border-t border-border">
          <div className="container mx-auto px-4 py-3 text-center">
            <p className="text-xs md:text-sm font-body text-muted-foreground flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Due to high demand, delivery timeline is 25–30 days
            </p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 md:py-16 bg-card/50 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {trustStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, rotateY: 90, scale: 0.8 }}
                whileInView={{ opacity: 1, rotateY: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6, type: "spring" }}
                whileHover={{ rotateY: 10, scale: 1.05 }}
                className="text-center perspective-1000"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs font-body text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-12 md:py-16" aria-label="Gallery of recent caricature work">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-6">
            <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-2">Our Recent Work</h2>
            <p className="text-muted-foreground font-body">Every stroke tells a story — tap to view fullscreen</p>
          </motion.div>
        </div>
        <InfiniteScrollGallery onImageClick={openLightbox} />
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16">
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
            <motion.div key={item.step} initial={{ opacity: 0, rotateX: -15, y: 40 }} whileInView={{ opacity: 1, rotateX: 0, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.2, type: "spring" }} whileHover={{ y: -8, rotateY: 5, scale: 1.02 }}
              className="cursor-pointer perspective-1000" onClick={() => navigate(item.route)}>
              <Card className="text-center card-3d h-full">
                <CardContent className="pt-10 pb-8 px-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-primary/15">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <span className="text-[10px] font-body font-bold text-primary uppercase tracking-widest">Step {item.step}</span>
                  <h3 className="font-calligraphy text-2xl font-semibold mt-2 mb-3 text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                  <span className="inline-flex items-center gap-1 mt-4 text-xs font-body font-semibold text-primary hover:underline">
                    Learn more <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Scroll Event Gallery Slideshow */}
      <HomepageScrollEvents />

      {/* Services */}
      <section className="bg-card/50 py-16 md:py-24 border-y border-border/50">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16">
            <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">What We Offer</p>
            <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-3">Our Services</h2>
            <p className="text-muted-foreground font-body max-w-md mx-auto">From personal gifts to grand events, we have you covered</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              { icon: Sparkles, title: "Live Event Caricature", desc: "Professional artists at your wedding, birthday, or corporate event. On-the-spot portraits that wow your guests.", action: handleEventClick, cta: "Book for Event" },
              { icon: Palette, title: "Custom Caricature", desc: "Hand-crafted caricatures from your photos. Perfect for gifts, wall art, and memories that last forever.", action: handleOrderClick, cta: "Order Now" },
              { icon: Award, title: "Corporate Events", desc: "Elevate your corporate gatherings, product launches, and team celebrations with live caricature entertainment.", action: handleEventClick, cta: "Enquire Now" },
              ...(settings.shop_nav_visible?.enabled !== false ? [{
                icon: ShoppingBag,
                title: "Merchandise Store",
                desc: "Caricature-themed apparel, custom printed merchandise, and art collectibles. Shop unique creative products.",
                action: () => navigate("/shop"),
                cta: "Shop Now"
              }] : [{
                icon: ShoppingBag,
                title: "Merchandise Store",
                desc: "Exciting caricature-themed merchandise and custom products coming soon to our online store!",
                action: () => {},
                cta: "Coming Soon"
              }]),
            ].map((service, i) => (
              <motion.div key={service.title} initial={{ opacity: 0, scale: 0.85, rotateY: -20 }} whileInView={{ opacity: 1, scale: 1, rotateY: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5, type: "spring" }} whileHover={{ scale: 1.04, rotateY: 5 }} className="perspective-1000">
                <Card className="card-3d h-full flex flex-col">
                  <CardContent className="pt-8 pb-6 px-5 flex flex-col flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-5">
                      <service.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-calligraphy text-xl font-semibold mb-3 text-foreground">{service.title}</h3>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1">{service.desc}</p>
                    <Button 
                      variant={service.cta === "Coming Soon" ? "secondary" : "outline"} 
                      className="mt-5 rounded-full font-body w-full" 
                      onClick={service.action}
                      disabled={service.cta === "Coming Soon"}
                    >
                      {service.cta} {service.cta !== "Coming Soon" && <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Styles */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16">
            <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Pick Your Vibe</p>
            <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground mb-3">Our Styles</h2>
            <p className="text-muted-foreground font-body">Choose the vibe that matches your personality</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {styles.map((style, i) => (
              <motion.div key={style.name} initial={{ opacity: 0, rotateY: 90, scale: 0.7 }} whileInView={{ opacity: 1, rotateY: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1, type: "spring" }} whileHover={{ scale: 1.06, y: -6, rotateY: 8 }}
                onClick={handleOrderClick} className="perspective-1000">
                <Card className="group cursor-pointer border border-border hover:border-primary/40 transition-all bg-card rounded-2xl hover:shadow-lg">
                  <CardContent className="p-5 md:p-6 text-center">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-3 bg-primary/15 group-hover:bg-primary/25 transition-colors">
                      <style.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-calligraphy text-xl md:text-2xl font-semibold mb-1 text-foreground">{style.name}</h3>
                    <p className="text-xs text-muted-foreground font-body">{style.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Reviews from Admin */}
      <HomepageReviews />

      {/* Trusted Brands */}
      <HomepageTrustedBrands />

      {/* Event Gallery */}
      <HomepageGallery table="event_gallery" title="Event Gallery" subtitle="Live Caricature Events" />

      {/* Caricature Gallery */}
      <HomepageGallery table="caricature_gallery" title="Custom Caricature Gallery" subtitle="Hand-Crafted Masterpieces" />

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
          <h2 className="font-calligraphy text-4xl md:text-6xl font-bold text-foreground mb-6">Make Your Event Unforgettable</h2>
          <p className="text-muted-foreground font-body mb-10 text-lg leading-relaxed">
            Turn your favorite photos into stunning hand-crafted caricatures. Perfect for gifts, events & memories!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button size="xl" onClick={handleOrderClick} className="rounded-full font-body font-semibold">
                Start Your Order <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button size="xl" variant="outline" onClick={() => navigate("/track-order")} className="rounded-full font-body font-semibold border-border hover:bg-card">
                <Search className="w-5 h-5 mr-2" /> Track Order
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
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I have a question about caricatures.")}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 btn-soft rounded-full py-3 px-6 font-body font-medium">
              <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-card border border-border text-foreground rounded-full py-3 px-6 font-body font-medium hover:shadow-md transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Follow on Instagram
            </a>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-gradient-to-b from-background to-card/80">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 cursor-pointer mb-3" onClick={() => navigate("/")}>
                <img src="/logo.png" alt="CCC" className="w-10 h-10 rounded-full border-2 border-border" />
                <span className="font-calligraphy text-xl font-bold text-foreground">CCC</span>
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">India's premium caricature studio. Hand-crafted art for events, gifts & memories.</p>
              <p className="font-calligraphy text-sm text-accent mt-3">Drawn with love & laughter ✏️</p>
              <div className="flex gap-3 mt-4 flex-wrap">
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label="Instagram">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://www.youtube.com/@creativecaricatureclub" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label="YouTube">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://www.facebook.com/creativecaricatureclub" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label="Facebook">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://twitter.com/creativecaricatureclub" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label="Twitter/X">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label="WhatsApp">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-body font-bold text-foreground text-sm mb-3 uppercase tracking-wider">Quick Links</h4>
              <div className="flex flex-col gap-2">
                <Link to="/about" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">About Us</Link>
                <Link to="/enquiry" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Enquiry</Link>
                <Link to="/track-order" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Track Order</Link>
                <Link to="/blog" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Blog</Link>
                <Link to="/support" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Support</Link>
              </div>
            </div>

            {/* Policies */}
            <div>
              <h4 className="font-body font-bold text-foreground text-sm mb-3 uppercase tracking-wider">Policies</h4>
              <div className="flex flex-col gap-2">
                <Link to="/terms" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Terms & Conditions</Link>
                <Link to="/privacy" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Privacy Policy</Link>
                <Link to="/refund" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Refund Policy</Link>
                <Link to="/shipping" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Shipping Policy</Link>
                <Link to="/cancellation" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Cancellation Policy</Link>
                <Link to="/event-policy" className="text-sm text-muted-foreground font-body hover:text-primary transition-colors">Event Policy</Link>
              </div>
            </div>

            {/* More */}
            <div>
              <h4 className="font-body font-bold text-foreground text-sm mb-3 uppercase tracking-wider">More</h4>
              <div className="flex flex-col gap-2">
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

          <div className="border-t border-border pt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground font-body">© 2025 Creative Caricature Club. All rights reserved. · Founded by Ritesh Mahendra Gupta</p>
            <p className="text-xs text-muted-foreground font-body">
              Built with <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">Lovable</a> · Prompted by <a href="https://www.instagram.com/akashustle" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">Akash</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
