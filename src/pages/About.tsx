import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Instagram, Facebook, Youtube, Sparkles, Award, Users, Calendar, Heart } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.5 } });

const About = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen brand-gradient-bg pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-calligraphy text-xl font-bold">About Us</h1>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-2xl font-body space-y-6 text-sm text-foreground/80">
        <motion.div initial={{ scale: 0.8, rotateY: 180, opacity: 0 }} animate={{ scale: 1, rotateY: 0, opacity: 1 }} transition={{ duration: 0.8, type: "spring" }} className="text-center">
          <motion.img src="/logo.png" alt="Creative Caricature Club" className="w-24 h-24 rounded-2xl mx-auto mb-4 shadow-3d border-glow" animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }} />
          <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground text-3d animate-text-glow">Creative Caricature Club</h2>
          <p className="text-muted-foreground italic mt-2">Founded by <strong className="text-foreground">Ritesh Mahendra Gupta</strong></p>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp(0.15)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Calendar, val: "500+", label: "Events" },
            { icon: Users, val: "100+", label: "Artists" },
            { icon: Heart, val: "1000+", label: "Clients" },
            { icon: Award, val: "4.9★", label: "Rating" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="card-3d p-4 text-center">
              <s.icon className="w-6 h-6 text-accent mx-auto mb-2" />
              <p className="font-calligraphy text-2xl font-bold text-foreground">{s.val}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p {...fadeUp(0.2)}>Creative Caricature Club is a professional caricature art collective dedicated to creating memorable artistic experiences through caricature art.</motion.p>
        <motion.p {...fadeUp(0.25)}>The organization operates as a network of professional caricature artists who provide artistic services for events, custom artwork, workshops, and creative merchandise.</motion.p>
        <motion.p {...fadeUp(0.3)}>Creative Caricature Club specializes in live caricature entertainment and custom artistic creations designed to enhance celebrations, events, and personal gifting experiences.</motion.p>
        <motion.p {...fadeUp(0.35)}>The organization serves clients across <strong>Mumbai, India, and internationally</strong>, offering both physical and digital artistic services.</motion.p>

        <motion.div {...fadeUp(0.4)} className="border-t border-border pt-6 mt-6">
          <h3 className="font-calligraphy text-xl font-bold text-foreground mb-4 text-3d flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-wiggle" /> Services Offered
          </h3>
          <div className="space-y-3">
            {[
              { title: "1. Live Event Caricature Services", desc: "Professional caricature artists for live events — guests receive hand-drawn caricatures as keepsakes.", sub: "Weddings, Corporate events, Birthdays, Baby showers, Brand activations" },
              { title: "2. Custom Caricature Artwork", desc: "Personalized caricature artwork created from customer-submitted photographs.", sub: "Wedding gifts, Anniversary gifts, Couple portraits, Family caricatures" },
              { title: "3. Workshops", desc: "Caricature learning workshops for students, artists, and enthusiasts.", sub: "Online sessions, Physical workshops, Skill development" },
              { title: "4. Merchandise Store", desc: "Online store offering creative merchandise including caricature-themed apparel and art collectibles.", sub: "T-shirts, Custom prints, Art collectibles" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 + i * 0.1 }}
                className="card-3d p-4 hover:border-glow">
                <h4 className="font-calligraphy text-lg font-bold text-foreground mb-1">{s.title}</h4>
                <p className="mb-1">{s.desc}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.8)} className="border-t border-border pt-6 mt-6">
          <h3 className="font-calligraphy text-xl font-bold text-foreground mb-4 text-3d">Contact Information</h3>
          <div className="space-y-2">
            {[
              { icon: Mail, href: "mailto:creativecaricatureclub@gmail.com", text: "creativecaricatureclub@gmail.com" },
              { icon: Phone, href: "https://wa.me/918369594271", text: "+91 8369594271 (Dilip – Manager)" },
              { icon: Instagram, href: "https://www.instagram.com/creativecaricatureclub", text: "@CreativeCaricatureClub" },
              { icon: Facebook, href: "https://www.facebook.com/creativecaricatureclub", text: "CreativeCaricatureClub" },
              { icon: Youtube, href: "https://www.youtube.com/@creativecaricatureclub", text: "CreativeCaricatureClub" },
            ].map((c, i) => (
              <motion.a key={i} href={c.href} target="_blank" rel="noopener noreferrer"
                initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.85 + i * 0.06 }}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-card transition-all group">
                <c.icon className="w-5 h-5 text-accent group-hover:animate-wiggle flex-shrink-0" />
                <span className="text-accent hover:underline">{c.text}</span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
