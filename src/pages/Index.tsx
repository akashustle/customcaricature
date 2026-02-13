import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Heart, Laugh, Crown, Minimize2, Sparkles, Clock, Truck, Camera, MessageCircle, ArrowRight, User, LogOut, Package, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useCallback } from "react";
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

const WHATSAPP_NUMBER = "918369594271";
const INSTAGRAM_URL = "https://www.instagram.com/creativecaricatureclub";

// Lightbox component
const Lightbox = ({ images, currentIndex, onClose, onPrev, onNext }: {
  images: string[]; currentIndex: number; onClose: () => void; onPrev: () => void; onNext: () => void;
}) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-foreground/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-primary-foreground/80 hover:text-primary-foreground z-10">
        <X className="w-8 h-8" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 text-primary-foreground/80 hover:text-primary-foreground z-10">
        <ChevronLeft className="w-10 h-10" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 text-primary-foreground/80 hover:text-primary-foreground z-10">
        <ChevronRight className="w-10 h-10" />
      </button>
      <motion.img
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        src={images[currentIndex]}
        alt={`Gallery ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-6 text-primary-foreground/60 font-sans text-sm">{currentIndex + 1} / {images.length}</p>
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
            className="flex-shrink-0 w-64 h-80 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
            whileHover={{ scale: 1.05, y: -8 }}
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleOrderClick = () => navigate(user ? "/order" : "/register");

  const openLightbox = useCallback((idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Lightbox */}
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
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <span className="font-display text-lg font-bold hidden sm:inline">Creative Caricature Club</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/track-order")} className="rounded-full font-sans gap-1 hidden sm:flex">
              <Search className="w-4 h-4" /> Track Order
            </Button>
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full font-sans gap-2">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">My Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="font-sans"><User className="w-4 h-4 mr-2" /> Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/order")} className="font-sans"><Palette className="w-4 h-4 mr-2" /> New Order</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="font-sans text-destructive"><LogOut className="w-4 h-4 mr-2" /> Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="font-sans">Login</Button>
                  <Button size="sm" onClick={() => navigate("/register")} className="rounded-full font-sans bg-primary hover:bg-primary/90">Register</Button>
                </div>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="container mx-auto px-4 py-16 md:py-28">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl mx-auto text-center">
            <motion.img src="/logo.png" alt="Creative Caricature Club" className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-6 rounded-2xl"
              initial={{ scale: 0.8, opacity: 0, rotateY: 180 }} animate={{ scale: 1, opacity: 1, rotateY: 0 }} transition={{ delay: 0.2, duration: 0.8, type: "spring" }} />
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
              Creative Caricature<span className="block text-primary">Club</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto font-sans">
              Custom hand-crafted caricatures that capture personality in every stroke. Delivered to your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" onClick={handleOrderClick}
                  className="text-base md:text-lg px-8 md:px-10 py-6 rounded-full font-sans font-semibold shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
                  style={{ boxShadow: "var(--shadow-warm)" }}>
                  Order Your Caricature <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" variant="outline" onClick={() => navigate("/track-order")}
                  className="text-base md:text-lg px-8 py-6 rounded-full font-sans font-semibold border-primary/30 hover:bg-primary/10">
                  <Search className="w-5 h-5 mr-2" /> Track Your Order
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
        <div className="bg-primary/10 border-t border-primary/20">
          <div className="container mx-auto px-4 py-3 text-center">
            <p className="text-xs md:text-sm font-sans text-foreground/80 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Due to high demand, delivery timeline is 25–30 days
            </p>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-12 md:py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-6">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-2">Our Recent Work</h2>
            <p className="text-muted-foreground font-sans">Every stroke tells a story — tap to view fullscreen</p>
          </motion.div>
        </div>
        <InfiniteScrollGallery onImageClick={openLightbox} />
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 md:mb-14">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-3">How It Works</h2>
          <p className="text-muted-foreground font-sans">Simple 3-step process to get your caricature</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: Camera, step: "1", title: "Upload & Customize", desc: "Upload clear photos, pick your style, and share your preferences." },
            { icon: Palette, step: "2", title: "We Create", desc: "Our talented artists hand-craft your unique caricature with love." },
            { icon: Truck, step: "3", title: "You Receive", desc: "Get your framed artwork delivered to your doorstep in 25–30 days." },
          ].map((item, i) => (
            <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }} whileHover={{ y: -8, scale: 1.02 }}>
              <Card className="text-center border-none bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-sans font-semibold text-primary uppercase tracking-wider">Step {item.step}</span>
                  <h3 className="font-display text-xl font-semibold mt-2 mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Styles */}
      <section className="bg-secondary/40 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 md:mb-14">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-3">Our Styles</h2>
            <p className="text-muted-foreground font-sans">Choose the vibe that matches your personality</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto">
            {styles.map((style, i) => (
              <motion.div key={style.name} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} whileHover={{ scale: 1.05, rotateZ: 1 }}>
                <Card className="group cursor-pointer border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg bg-card">
                  <CardContent className="p-4 md:p-6 text-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <style.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-display text-base md:text-lg font-semibold mb-1">{style.name}</h3>
                    <p className="text-xs text-muted-foreground font-sans">{style.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-4">Ready to Get Your Caricature?</h2>
          <p className="text-muted-foreground font-sans mb-8 text-lg">
            Turn your favorite photos into stunning hand-crafted caricatures. Perfect for gifts, events & memories!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button size="lg" onClick={handleOrderClick} className="rounded-full px-10 py-6 text-base md:text-lg font-sans font-semibold bg-primary hover:bg-primary/90">
                Start Your Order <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button size="lg" variant="outline" onClick={() => navigate("/track-order")} className="rounded-full px-10 py-6 text-base md:text-lg font-sans font-semibold border-primary/30 hover:bg-primary/10">
                <Search className="w-5 h-5 mr-2" /> Track Order
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Contact */}
      <section className="bg-secondary/40 py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Need Help?</h2>
          <p className="text-muted-foreground font-sans mb-6">Reach out to us anytime for support</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I have a question about caricatures.")}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] text-white rounded-full py-3 px-6 font-sans font-medium hover:opacity-90 transition-opacity">
              <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white rounded-full py-3 px-6 font-sans font-medium hover:opacity-90 transition-opacity">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Follow on Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/5 py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
              <p className="font-display text-lg font-semibold text-foreground">Creative Caricature Club</p>
            </div>
            <p className="text-sm text-muted-foreground font-sans text-center">Custom caricatures crafted with love ✨</p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground font-sans">
              <Link to="/track-order" className="hover:text-foreground transition-colors">Track Order</Link>
              <span>•</span>
              <Link to="/about" className="hover:text-foreground transition-colors">About Us</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
              <span>•</span>
              <Link to="/shipping" className="hover:text-foreground transition-colors">Shipping Policy</Link>
            </div>
            <p className="text-xs text-muted-foreground font-sans">© 2025 Creative Caricature Club. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
