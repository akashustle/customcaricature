import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const RefundPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Refund Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Cancellation</motion.h2>
        <motion.p {...fadeUp(0.15)}>Orders can be cancelled within 24 hours of payment confirmation for a full refund. After 24 hours, a 50% cancellation fee applies as artwork creation may have already begun.</motion.p>
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Refunds</motion.h2>
        <motion.p {...fadeUp(0.25)}>Refunds are processed within 7–10 business days to the original payment method. In case of quality issues, we offer free revisions or a partial refund at our discretion.</motion.p>
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Damaged Goods</motion.h2>
        <motion.p {...fadeUp(0.35)}>If your artwork arrives damaged during shipping, please contact us within 48 hours with photos of the damage. We will arrange a replacement at no additional cost.</motion.p>
        <motion.h2 {...fadeUp(0.4)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>Contact</motion.h2>
        <motion.p {...fadeUp(0.45)}>For refund requests, contact us on WhatsApp at 8369594271.</motion.p>
      </motion.div>
    </div>
  );
};

export default RefundPolicy;
