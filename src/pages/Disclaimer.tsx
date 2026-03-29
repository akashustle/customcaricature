import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const Disclaimer = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title="Disclaimer | Creative Caricature Club™" description="Legal disclaimer for Creative Caricature Club™ website, services, caricature artwork & event entertainment." canonical="/disclaimer" />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Disclaimer</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-body space-y-4 text-sm text-foreground/80">
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground">Artistic Services</motion.h2>
        <motion.p {...fadeUp(0.12)}>Creative Caricature Club™ provides artistic services. Caricatures are creative interpretations and may include exaggerated artistic features. Variations in artwork are natural due to the handmade process.</motion.p>
        
        <motion.h2 {...fadeUp(0.15)} className="font-display text-lg font-bold text-foreground pt-2">Limitation of Liability</motion.h2>
        <motion.p {...fadeUp(0.17)}>Creative Caricature Club™ shall not be liable for:</motion.p>
        <motion.ul {...fadeUp(0.19)} className="list-disc pl-5 space-y-1">
          <li>Subjective dissatisfaction related to artistic style</li>
          <li>Courier delays or external logistical issues</li>
          <li>Any indirect or consequential damages arising from the use of services or products</li>
        </motion.ul>
        <motion.p {...fadeUp(0.21)}>Total liability, if any, shall be limited to the amount paid for the service.</motion.p>
        
        <motion.h2 {...fadeUp(0.24)} className="font-display text-lg font-bold text-foreground pt-2">Customer Responsibility</motion.h2>
        <motion.p {...fadeUp(0.26)}>Customers using Creative Caricature Club™ services agree to provide accurate information including correct contact details, accurate delivery addresses, and clear reference photographs. We shall not be responsible for delays or issues caused by incorrect information.</motion.p>
        
        <motion.h2 {...fadeUp(0.29)} className="font-display text-lg font-bold text-foreground pt-2">Force Majeure</motion.h2>
        <motion.p {...fadeUp(0.31)}>Creative Caricature Club™ shall not be held liable for failure to perform obligations due to circumstances beyond reasonable control — natural disasters, pandemics, government restrictions, transportation disruptions, accidents, or emergencies.</motion.p>
        
        <motion.h2 {...fadeUp(0.34)} className="font-display text-lg font-bold text-foreground pt-2">Policy Acceptance</motion.h2>
        <motion.p {...fadeUp(0.36)}>By using the website, placing orders, or booking services, users acknowledge that they have read and agreed to all policies and terms listed on the website.</motion.p>
        
        <motion.div {...fadeUp(0.4)} className="border-t border-border pt-4 mt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Creative Caricature Club™</strong> · Founder: Ritesh Mahendra Gupta<br />
            Email: <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a> · WhatsApp: <a href="https://wa.me/918369594271" className="text-primary hover:underline">+91 8369594271</a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Disclaimer;
