import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const IntellectualProperty = () => {
  const navigate = useNavigate();
  return (
    <>
    <SEOHead title="Intellectual Property" description="Intellectual property policy for Creative Caricature Club™ artwork and designs." canonical="/intellectual-property" />
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Intellectual Property Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-body space-y-4 text-sm text-foreground/80">
        <motion.p {...fadeUp(0.05)}>All artwork created by Creative Caricature Club™ is protected under applicable copyright laws.</motion.p>
        <motion.p {...fadeUp(0.07)}>This includes: caricature designs, illustrations, artwork created during events, digital artwork, merchandise designs, and workshop materials.</motion.p>
        
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground pt-2">Ownership</motion.h2>
        <motion.p {...fadeUp(0.12)}>Creative Caricature Club™ retains the intellectual property rights to all artwork created unless explicitly transferred in writing. Clients purchasing artwork receive the <strong>physical artwork or product</strong>, not the intellectual property rights.</motion.p>
        
        <motion.h2 {...fadeUp(0.15)} className="font-display text-lg font-bold text-foreground pt-2">Usage Rights</motion.h2>
        <motion.p {...fadeUp(0.17)}>Clients may use the artwork for <strong>personal use only</strong>. Commercial use of the artwork without written permission is prohibited. This includes reproducing the artwork, selling prints, and using the artwork for marketing purposes.</motion.p>
        
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground pt-2">Portfolio & Promotion</motion.h2>
        <motion.p {...fadeUp(0.22)}>Creative Caricature Club™ reserves the right to display artwork in its portfolio, social media, and promotional materials unless the client explicitly requests otherwise.</motion.p>
        
        <motion.h2 {...fadeUp(0.25)} className="font-display text-lg font-bold text-foreground pt-2">Workshop Materials</motion.h2>
        <motion.p {...fadeUp(0.27)}>All workshop materials are protected under intellectual property laws and may not be reproduced, distributed, or shared without written permission.</motion.p>
        
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground pt-2">Contact</motion.h2>
        <motion.p {...fadeUp(0.32)}>For IP-related queries, contact us at <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a>.</motion.p>
      </motion.div>
    </div>
    </>
  );
};

export default IntellectualProperty;
