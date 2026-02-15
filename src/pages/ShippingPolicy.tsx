import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const ShippingPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Shipping Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Delivery Timeline</motion.h2>
        <motion.p {...fadeUp(0.15)}>Due to high demand, delivery takes 25–30 days from payment confirmation. We will keep you updated via WhatsApp throughout the process.</motion.p>
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Shipping Coverage</motion.h2>
        <motion.p {...fadeUp(0.25)}>We deliver across India. Shipping charges are included in the order price.</motion.p>
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Framing</motion.h2>
        <motion.p {...fadeUp(0.35)}>Orders from Mumbai include a premium frame at no extra cost. For orders outside Mumbai, we do not include frames to prevent damage during transit.</motion.p>
        <motion.h2 {...fadeUp(0.4)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Tracking</motion.h2>
        <motion.p {...fadeUp(0.45)}>Once your caricature is dispatched, we'll share the tracking details via WhatsApp.</motion.p>
        <motion.h2 {...fadeUp(0.5)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Contact</motion.h2>
        <motion.p {...fadeUp(0.55)}>For shipping queries, contact us on WhatsApp at 8369594271 or Instagram @creativecaricatureclub.</motion.p>
      </motion.div>
    </div>
  );
};

export default ShippingPolicy;
