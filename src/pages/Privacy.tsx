import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Privacy Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <motion.p {...fadeUp(0.1)}>Creative Caricature Club respects your privacy and is committed to protecting your personal data.</motion.p>
        <motion.h2 {...fadeUp(0.15)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Information We Collect</motion.h2>
        <motion.p {...fadeUp(0.2)}>We collect your name, email, phone number, Instagram ID, delivery address, and photographs you upload for creating your caricature.</motion.p>
        <motion.h2 {...fadeUp(0.25)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>How We Use Your Information</motion.h2>
        <motion.p {...fadeUp(0.3)}>Your information is used solely for processing your order, contacting you about your order status, and delivering your artwork. We do not sell or share your personal data with third parties.</motion.p>
        <motion.h2 {...fadeUp(0.35)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Photo Usage</motion.h2>
        <motion.p {...fadeUp(0.4)}>Photos uploaded are used exclusively for creating your caricature. We may use completed artworks for portfolio purposes unless you opt out.</motion.p>
        <motion.h2 {...fadeUp(0.45)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Data Security</motion.h2>
        <motion.p {...fadeUp(0.5)}>We use industry-standard security measures to protect your personal information and payment details.</motion.p>
        <motion.h2 {...fadeUp(0.55)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Contact</motion.h2>
        <motion.p {...fadeUp(0.6)}>For privacy concerns, contact us on WhatsApp at 8369594271 or email us.</motion.p>
      </motion.div>
    </div>
  );
};

export default Privacy;
