import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const WorkshopPolicy = () => {
  const navigate = useNavigate();
  return (
    <>
    <SEOHead title="Workshop Policy" description="Workshop terms, conditions and policies for Creative Caricature Club caricature workshops." canonical="/workshop-policy" />
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Workshop Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-body space-y-4 text-sm text-foreground/80">
        <motion.p {...fadeUp(0.05)}>Creative Caricature Club conducts professional workshops for learning caricature art.</motion.p>
        
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground pt-2">Registration</motion.h2>
        <motion.p {...fadeUp(0.12)}>Workshop registration must be completed through the official website or approved registration channels. Registration fees are non-refundable.</motion.p>
        
        <motion.h2 {...fadeUp(0.15)} className="font-display text-lg font-bold text-foreground pt-2">Attendance</motion.h2>
        <motion.p {...fadeUp(0.17)}>Participants are responsible for attending workshops at the scheduled time. Missed sessions will not be repeated.</motion.p>
        
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground pt-2">Workshop Material</motion.h2>
        <motion.p {...fadeUp(0.22)}>All workshop materials are protected under intellectual property laws and may not be reproduced, distributed, or used commercially without written permission from Creative Caricature Club.</motion.p>
        
        <motion.h2 {...fadeUp(0.25)} className="font-display text-lg font-bold text-foreground pt-2">Conduct</motion.h2>
        <motion.p {...fadeUp(0.27)}>Participants are expected to maintain professional conduct during workshops. Creative Caricature Club reserves the right to remove participants who engage in disruptive behavior.</motion.p>
        
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground pt-2">Certificates</motion.h2>
        <motion.p {...fadeUp(0.32)}>Certificates of completion are awarded based on attendance and assignment submission as determined by the instructor.</motion.p>
        
        <motion.h2 {...fadeUp(0.35)} className="font-display text-lg font-bold text-foreground pt-2">Contact</motion.h2>
        <motion.p {...fadeUp(0.37)}>For workshop queries, contact us at <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a> or WhatsApp at <a href="https://wa.me/918369594271" className="text-primary hover:underline">+91 8369594271</a>.</motion.p>
      </motion.div>
    </div>
  );
};

export default WorkshopPolicy;
