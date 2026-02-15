import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Terms & Conditions</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>1. Order Acceptance</motion.h2>
        <motion.p {...fadeUp(0.15)}>By placing an order, you agree to provide accurate information including clear HD photographs and valid contact details. Orders are confirmed only after 100% advance payment is verified.</motion.p>
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>2. Payment</motion.h2>
        <motion.p {...fadeUp(0.25)}>All payments must be made via GPay/UPI. Payment screenshots must be shared on WhatsApp for verification. No COD (Cash on Delivery) is available.</motion.p>
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>3. Delivery Timeline</motion.h2>
        <motion.p {...fadeUp(0.35)}>Due to high demand, delivery takes 25–30 days from the date of payment confirmation. This timeline may vary during festive seasons.</motion.p>
        <motion.h2 {...fadeUp(0.4)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>4. Artwork Ownership</motion.h2>
        <motion.p {...fadeUp(0.45)}>The customer receives the physical artwork. Creative Caricature Club reserves the right to use the artwork for portfolio and promotional purposes unless explicitly requested otherwise.</motion.p>
        <motion.h2 {...fadeUp(0.5)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>5. Revisions</motion.h2>
        <motion.p {...fadeUp(0.55)}>Minor revisions are allowed during the creation process. Major changes after artwork completion may incur additional charges.</motion.p>
        <motion.h2 {...fadeUp(0.6)} className="font-display text-lg font-bold text-foreground" style={{ textShadow: "1px 1px 3px hsl(var(--primary) / 0.1)" }}>6. Contact</motion.h2>
        <motion.p {...fadeUp(0.65)}>For any queries, contact us on WhatsApp at 8369594271 or Instagram @creativecaricatureclub.</motion.p>
      </motion.div>
    </div>
  );
};

export default Terms;
