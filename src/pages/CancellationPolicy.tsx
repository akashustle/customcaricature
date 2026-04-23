import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { lazy, Suspense } from "react";
const SiteFooter = lazy(() => import("@/components/SiteFooter"));

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const CancellationPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title="Cancellation Policy | Creative Caricature Club™" description="Cancellation policy for Creative Caricature Club™ caricature orders, live event bookings & workshop registrations." canonical="/cancellation" />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Cancellation Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-5xl font-body space-y-4 text-sm text-foreground/80">
        <motion.p {...fadeUp(0.05)}>Creative Caricature Club™ provides professional artistic services that require advance scheduling and artist allocation. Once an event booking is confirmed and the artist's schedule is reserved, the booking becomes non-refundable.</motion.p>
        
        <motion.h2 {...fadeUp(0.1)} className="font-display text-lg font-bold text-foreground pt-2">Event Cancellation by Client</motion.h2>
        <motion.p {...fadeUp(0.12)}>If the client cancels the event after booking confirmation: the booking amount will not be refunded, and the reserved artist date remains blocked and unavailable for other clients.</motion.p>
        
        <motion.h2 {...fadeUp(0.15)} className="font-display text-lg font-bold text-foreground pt-2">Event Postponement</motion.h2>
        <motion.p {...fadeUp(0.17)}>If the client wishes to postpone an event: the request must be communicated at least <strong>7 days prior</strong> to the event date. Rescheduling is subject to artist availability. If the artist is unavailable on the new date, the booking will still be treated as completed and no refund will be issued.</motion.p>
        
        <motion.h2 {...fadeUp(0.2)} className="font-display text-lg font-bold text-foreground pt-2">Cancellation by Creative Caricature Club™</motion.h2>
        <motion.p {...fadeUp(0.22)}>In rare circumstances where Creative Caricature Club™ is unable to provide services due to unforeseen circumstances, the company may provide an alternative artist or offer rescheduling based on mutual agreement.</motion.p>
        
        <motion.h2 {...fadeUp(0.25)} className="font-display text-lg font-bold text-foreground pt-2">Custom Orders & Merchandise</motion.h2>
        <motion.p {...fadeUp(0.27)}>Custom caricature orders and merchandise purchases are non-cancellable once production has commenced. All purchases are considered final.</motion.p>
        
        <motion.h2 {...fadeUp(0.3)} className="font-display text-lg font-bold text-foreground pt-2">Workshop Cancellation</motion.h2>
        <motion.p {...fadeUp(0.32)}>Workshop registrations are non-refundable. Missed sessions will not be repeated.</motion.p>
        
        <motion.h2 {...fadeUp(0.35)} className="font-display text-lg font-bold text-foreground pt-2">Contact</motion.h2>
        <motion.p {...fadeUp(0.37)}>For cancellation queries, contact us at <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a> or WhatsApp at <a href="https://wa.me/918369594271" className="text-primary hover:underline">+91 8369594271</a>.</motion.p>
      </motion.div>
      <Suspense fallback={null}><SiteFooter /></Suspense>

    </div>
  );
};


export default CancellationPolicy;
