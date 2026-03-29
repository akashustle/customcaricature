import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const ShippingPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title="Shipping Policy" description="Shipping and delivery policy for Creative Caricature Club™." canonical="/shipping" />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Shipping Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-body space-y-4 text-sm text-foreground/80">
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground">Processing Time</motion.h2>
        <motion.p {...fadeUp(0.12)}>Orders are processed within <strong>2 working days</strong> after confirmation.</motion.p>
        
        <motion.h2 {...fadeUp(0.15)} className="font-display text-lg font-bold text-foreground pt-2">Estimated Delivery</motion.h2>
        <motion.p {...fadeUp(0.17)}>Estimated delivery time is <strong>8–10 days</strong>. Delivery time may vary depending on location, courier logistics, public holidays, and operational delays.</motion.p>
        
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground pt-2">Custom Caricature Delivery</motion.h2>
        <motion.p {...fadeUp(0.22)}>Due to high demand, custom caricature artwork delivery takes <strong>25–30 days</strong> from payment confirmation. We will keep you updated via WhatsApp throughout the process.</motion.p>
        
        <motion.h2 {...fadeUp(0.25)} className="font-display text-lg font-bold text-foreground pt-2">Shipping Coverage</motion.h2>
        <motion.p {...fadeUp(0.27)}>We deliver across India. Shipping charges are included in the order price.</motion.p>
        
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground pt-2">Frame Policy</motion.h2>
        <motion.p {...fadeUp(0.32)}><strong>Mumbai Orders:</strong> Frame included at no extra cost.</motion.p>
        <motion.p {...fadeUp(0.34)}><strong>Orders Outside Mumbai:</strong> Artwork shipped without frame to avoid damage during courier transit.</motion.p>
        
        <motion.h2 {...fadeUp(0.37)} className="font-display text-lg font-bold text-foreground pt-2">Courier Delays</motion.h2>
        <motion.p {...fadeUp(0.39)}>Creative Caricature Club™ is not responsible for courier delays beyond our control.</motion.p>
        
        <motion.h2 {...fadeUp(0.42)} className="font-display text-lg font-bold text-foreground pt-2">Tracking</motion.h2>
        <motion.p {...fadeUp(0.44)}>Once your caricature is dispatched, tracking details will be shared via WhatsApp. Customers with accounts can also track order status from their dashboard.</motion.p>
        
        <motion.h2 {...fadeUp(0.47)} className="font-display text-lg font-bold text-foreground pt-2">Contact</motion.h2>
        <motion.p {...fadeUp(0.49)}>For shipping queries, contact us at <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a> or WhatsApp at <a href="https://wa.me/918369594271" className="text-primary hover:underline">+91 8369594271</a>.</motion.p>
      </motion.div>
    </div>
  );
};

export default ShippingPolicy;
