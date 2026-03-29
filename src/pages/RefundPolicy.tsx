import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const RefundPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title="Refund Policy | Creative Caricature Club™" description="Refund policy for Creative Caricature Club™ caricature orders, event bookings & merchandise. Understand our no-refund policy and terms." canonical="/refund" />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Refund Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-body space-y-4 text-sm text-foreground/80">
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground">No Refund Policy</motion.h2>
        <motion.p {...fadeUp(0.12)}>Creative Caricature Club™ maintains a <strong>strict No Refund Policy</strong>.</motion.p>
        <motion.p {...fadeUp(0.14)}>Payments once made cannot be refunded for:</motion.p>
        <motion.ul {...fadeUp(0.16)} className="list-disc pl-5 space-y-1">
          <li>Event bookings</li>
          <li>Custom caricature orders</li>
          <li>Workshop registrations</li>
          <li>Merchandise purchases</li>
        </motion.ul>
        <motion.p {...fadeUp(0.18)}>All purchases are considered final.</motion.p>
        
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground pt-2">Return & Exchange Policy</motion.h2>
        <motion.p {...fadeUp(0.22)}>Due to the customized and artistic nature of services and products, <strong>returns and exchanges are not applicable</strong>. Customers are advised to review details carefully before placing orders.</motion.p>
        
        <motion.h2 {...fadeUp(0.25)} className="font-display text-lg font-bold text-foreground pt-2">Damaged Goods</motion.h2>
        <motion.p {...fadeUp(0.27)}>If your artwork arrives damaged during shipping, please contact us within 48 hours with photos of the damage. We will evaluate the situation and take appropriate action.</motion.p>
        
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground pt-2">Contact</motion.h2>
        <motion.p {...fadeUp(0.32)}>For queries, contact us at <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a> or WhatsApp at <a href="https://wa.me/918369594271" className="text-primary hover:underline">+91 8369594271</a>.</motion.p>
      </motion.div>
    </div>
  );
};

export default RefundPolicy;
