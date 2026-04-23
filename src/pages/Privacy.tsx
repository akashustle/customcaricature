import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { lazy, Suspense } from "react";
const SiteFooter = lazy(() => import("@/components/SiteFooter"));

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title="Privacy Policy | Creative Caricature Club™" description="Privacy policy for Creative Caricature Club™. Learn how we collect, use and protect your personal data when ordering caricatures or booking events." canonical="/privacy" />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Privacy Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-5xl font-body space-y-4 text-sm text-foreground/80">
        <motion.p {...fadeUp(0.05)}>Creative Caricature Club™ collects user data for service delivery purposes.</motion.p>
        
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground pt-2">Information We Collect</motion.h2>
        <motion.p {...fadeUp(0.12)}>Information collected may include: name, email address, phone number, shipping address, Instagram ID, and photographs uploaded for creating caricatures.</motion.p>
        
        <motion.h2 {...fadeUp(0.15)} className="font-display text-lg font-bold text-foreground pt-2">How We Use Your Information</motion.h2>
        <motion.p {...fadeUp(0.17)}>The information is used only for order processing, customer communication, and service delivery. Customer information will not be sold or shared with third parties except where required by law.</motion.p>
        
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground pt-2">Photo Usage</motion.h2>
        <motion.p {...fadeUp(0.22)}>Photos uploaded are used exclusively for creating your caricature. Completed artworks may be used for portfolio and promotional purposes unless the customer explicitly opts out.</motion.p>
        
        <motion.h2 {...fadeUp(0.25)} className="font-display text-lg font-bold text-foreground pt-2">Data Security</motion.h2>
        <motion.p {...fadeUp(0.27)}>We use industry-standard security measures to protect your personal information and payment details.</motion.p>
        
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground pt-2">Website Usage Policy</motion.h2>
        <motion.p {...fadeUp(0.32)}>Users accessing the website must not misuse website functionality, attempt to hack or disrupt the platform, or upload harmful content. Creative Caricature Club™ reserves the right to suspend accounts engaging in misuse.</motion.p>
        
        <motion.h2 {...fadeUp(0.35)} className="font-display text-lg font-bold text-foreground pt-2">Policy Updates</motion.h2>
        <motion.p {...fadeUp(0.37)}>Creative Caricature Club™ reserves the right to modify policies at any time. Users are encouraged to review policies periodically.</motion.p>
        
        <motion.h2 {...fadeUp(0.4)} className="font-display text-lg font-bold text-foreground pt-2">Contact</motion.h2>
        <motion.p {...fadeUp(0.42)}>For privacy concerns, contact us at <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a> or WhatsApp at <a href="https://wa.me/918369594271" className="text-primary hover:underline">+91 8369594271</a>.</motion.p>
      </motion.div>
      <Suspense fallback={null}><SiteFooter /></Suspense>

    </div>
  );
};


export default Privacy;
