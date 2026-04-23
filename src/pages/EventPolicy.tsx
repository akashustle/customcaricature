import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { lazy, Suspense } from "react";
const SiteFooter = lazy(() => import("@/components/SiteFooter"));

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

const EventPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title="Event Booking Policy | Live Caricature Artist Booking Terms" description="Event booking policy for live caricature artist bookings at weddings, corporate events & parties. Creative Caricature Club™ terms for advance payment, cancellation & rescheduling." canonical="/event-policy" />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Event Booking Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-5xl font-body space-y-5 text-sm text-foreground/80">
        <h2 className="font-display text-2xl font-bold text-foreground text-center">🎭 Live Caricature Event Policy</h2>

        <div className="space-y-4">
          <motion.div {...fadeUp(0.1)}>
            <h3 className="font-display text-lg font-bold text-foreground">1. Booking & Advance Payment</h3>
            <p>Event bookings are confirmed only after payment of the required booking amount. Upon confirmation, the artist's date is reserved exclusively for the client.</p>
            <p className="mt-1 font-semibold text-foreground">All event bookings are strictly non-refundable.</p>
          </motion.div>

          <motion.div {...fadeUp(0.15)}>
            <h3 className="font-display text-lg font-bold text-foreground">2. Cancellation by Client</h3>
            <p>If the client cancels the event after booking confirmation, the booking amount will not be refunded. The reserved artist date remains blocked and unavailable for other clients.</p>
          </motion.div>

          <motion.div {...fadeUp(0.2)}>
            <h3 className="font-display text-lg font-bold text-foreground">3. Event Postponement</h3>
            <p>Postponement requests must be communicated at least <strong>7 days prior</strong> to the event date. Rescheduling is subject to artist availability. If the artist is unavailable on the new date, the booking will be treated as completed with no refund.</p>
          </motion.div>

          <motion.div {...fadeUp(0.25)}>
            <h3 className="font-display text-lg font-bold text-foreground">4. Cancellation by Creative Caricature Club™</h3>
            <p>In rare circumstances where we are unable to provide services due to unforeseen circumstances, we may provide an alternative artist or offer rescheduling based on mutual agreement.</p>
          </motion.div>

          <motion.div {...fadeUp(0.3)}>
            <h3 className="font-display text-lg font-bold text-foreground">5. Artist Working Duration</h3>
            <p>Event booking duration is generally <strong>3–4 hours</strong> unless otherwise agreed. Additional hours are charged as per agreed pricing.</p>
          </motion.div>

          <motion.div {...fadeUp(0.35)}>
            <h3 className="font-display text-lg font-bold text-foreground">6. Client Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Designated space for the artist to work</li>
              <li>Adequate lighting for drawing</li>
              <li>Basic seating arrangements if required</li>
              <li>Safe and respectful working environment</li>
            </ul>
          </motion.div>

          <motion.div {...fadeUp(0.4)}>
            <h3 className="font-display text-lg font-bold text-foreground">7. Travel & Accommodation (Outside Mumbai)</h3>
            <p>For events outside Mumbai, the client must arrange and bear the cost of travel (flight/train), accommodation, and local transportation. These must be confirmed before the event date.</p>
          </motion.div>

          <motion.div {...fadeUp(0.45)}>
            <h3 className="font-display text-lg font-bold text-foreground">8. Crowd Management</h3>
            <p>Artists cannot guarantee the number of caricatures produced during the event, as this depends on crowd flow, guest participation, and event conditions.</p>
          </motion.div>

          <motion.div {...fadeUp(0.5)}>
            <h3 className="font-display text-lg font-bold text-foreground">9. Remaining Payment</h3>
            <p>The remaining balance must be paid on the day of the event, before the session begins. Payment can be made via UPI or cash.</p>
          </motion.div>

          <motion.div {...fadeUp(0.55)}>
            <h3 className="font-display text-lg font-bold text-foreground">10. Force Majeure</h3>
            <p>Creative Caricature Club™ shall not be held liable for failure to perform due to circumstances beyond reasonable control — natural disasters, pandemics, government restrictions, transportation disruptions, or emergencies.</p>
          </motion.div>

          <motion.div {...fadeUp(0.6)}>
            <h3 className="font-display text-lg font-bold text-foreground">11. Contact</h3>
            <p>For event booking queries, contact us at <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a> or WhatsApp at <a href="https://wa.me/918369594271" className="text-primary hover:underline">+91 8369594271</a>.</p>
          </motion.div>
        </div>
      </motion.div>
      <Suspense fallback={null}><SiteFooter /></Suspense>

    </div>
  );
};


export default EventPolicy;
