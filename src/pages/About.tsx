import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Instagram, Facebook, Youtube } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const About = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">About Us</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="container mx-auto px-4 py-8 max-w-2xl font-body space-y-5 text-sm text-foreground/80">
        <motion.img src="/logo.png" alt="Creative Caricature Club" className="w-20 h-20 rounded-2xl mx-auto mb-4" initial={{ scale: 0.8, rotateY: 180 }} animate={{ scale: 1, rotateY: 0 }} transition={{ duration: 0.8, type: "spring" }} />
        <motion.h2 {...fadeUp(0.1)} className="font-display text-2xl md:text-3xl font-bold text-center text-foreground">Creative Caricature Club</motion.h2>
        <motion.p {...fadeUp(0.15)} className="text-center text-muted-foreground italic">Founded by <strong className="text-foreground">Ritesh Mahendra Gupta</strong></motion.p>

        <motion.p {...fadeUp(0.2)}>Creative Caricature Club is a professional caricature art collective dedicated to creating memorable artistic experiences through caricature art.</motion.p>
        <motion.p {...fadeUp(0.25)}>The organization operates as a network of professional caricature artists who provide artistic services for events, custom artwork, workshops, and creative merchandise.</motion.p>
        <motion.p {...fadeUp(0.3)}>Creative Caricature Club specializes in live caricature entertainment and custom artistic creations designed to enhance celebrations, events, and personal gifting experiences.</motion.p>
        <motion.p {...fadeUp(0.35)}>The organization serves clients across <strong>Mumbai, India, and internationally</strong>, offering both physical and digital artistic services.</motion.p>
        <motion.p {...fadeUp(0.4)}>The primary objective of Creative Caricature Club is to transform memorable moments into creative artwork while delivering joyful experiences through art.</motion.p>

        <motion.div {...fadeUp(0.45)} className="border-t border-border pt-6 mt-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">Services Offered</h3>
          <div className="space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <h4 className="font-display font-bold text-foreground mb-2">1. Live Event Caricature Services</h4>
              <p className="mb-2">Professional caricature artists for live events — guests receive hand-drawn caricatures as keepsakes.</p>
              <p className="text-xs text-muted-foreground">Events include: Weddings, Corporate events, Birthday parties, Baby showers, Engagement ceremonies, Ring ceremonies, Receptions, Brand activations, Festivals and exhibitions, Private celebrations.</p>
              <p className="text-xs text-primary mt-1 font-medium">Available Pan-India and Internationally subject to availability.</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <h4 className="font-display font-bold text-foreground mb-2">2. Custom Caricature Artwork</h4>
              <p className="mb-2">Personalized caricature artwork created from customer-submitted photographs.</p>
              <p className="text-xs text-muted-foreground">Purposes include: Wedding gifts, Anniversary gifts, Couple portraits, Birthday gifts, Corporate gifting, Family caricatures.</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <h4 className="font-display font-bold text-foreground mb-2">3. Workshops</h4>
              <p>Caricature learning workshops for students, artists, and enthusiasts — Online sessions, Physical workshops, Demonstrations, and Skill development sessions.</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <h4 className="font-display font-bold text-foreground mb-2">4. Merchandise Store</h4>
              <p>Online store offering creative merchandise including caricature-themed apparel — t-shirts, custom printed merchandise, and art-based collectibles.</p>
            </div>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.5)} className="border-t border-border pt-6 mt-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <a href="https://wa.me/918369594271" target="_blank" className="text-primary hover:underline">+91 8369594271</a>
              <span className="text-xs text-muted-foreground">(Dilip – Manager)</span>
            </div>
            <div className="flex items-center gap-3">
              <Instagram className="w-4 h-4 text-primary flex-shrink-0" />
              <a href="https://www.instagram.com/creativecaricatureclub" target="_blank" className="text-primary hover:underline">@CreativeCaricatureClub</a>
            </div>
            <div className="flex items-center gap-3">
              <Facebook className="w-4 h-4 text-primary flex-shrink-0" />
              <span>CreativeCaricatureClub</span>
            </div>
            <div className="flex items-center gap-3">
              <Youtube className="w-4 h-4 text-primary flex-shrink-0" />
              <span>CreativeCaricatureClub</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default About;
