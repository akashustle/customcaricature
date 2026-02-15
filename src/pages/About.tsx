import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const About = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">About Us</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <motion.img src="/logo.png" alt="Creative Caricature Club" className="w-20 h-20 rounded-2xl mx-auto mb-4" initial={{ scale: 0.8, rotateY: 180 }} animate={{ scale: 1, rotateY: 0 }} transition={{ duration: 0.8, type: "spring" }} />
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-display text-2xl md:text-3xl font-bold text-center text-foreground" style={{ textShadow: "2px 2px 4px hsl(var(--primary) / 0.15)" }}>
          Creative Caricature Club
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>We are a team of passionate artists dedicated to creating unique, hand-crafted caricatures that capture the essence of your personality. Every artwork is meticulously crafted with love and attention to detail.</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>Based in Mumbai, India, we deliver our premium caricatures across the country. Mumbai orders include a beautiful frame at no extra cost.</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>With styles ranging from Cute, Romantic, Fun, Royal, Minimal, to Artist's Choice — we have something for everyone. Whether it's a gift for a loved one or a treat for yourself, our caricatures are guaranteed to bring a smile.</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>Follow us on Instagram <a href="https://www.instagram.com/creativecaricatureclub" target="_blank" className="text-primary font-medium">@creativecaricatureclub</a> to see our latest work!</motion.p>
      </motion.div>
    </div>
  );
};

export default About;
