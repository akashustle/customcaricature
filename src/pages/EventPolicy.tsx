import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const EventPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Event Booking Policy</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-6 text-sm text-foreground/80">
        <h2 className="font-display text-2xl font-bold text-foreground text-center">🎭 Live Caricature Event Policy</h2>

        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold text-foreground">1. Booking & Advance Payment</h3>
          <p>All event bookings require a mandatory advance payment to confirm your date. The advance amount varies based on the number of artists and location (Mumbai / Outside Mumbai). Advance payments include a 2.6% gateway processing fee (Satisfaction Guaranteed).</p>

          <h3 className="font-display text-lg font-bold text-foreground">2. Session Duration</h3>
          <p>Standard sessions are 3–4 hours. Additional hours can be booked at ₹4,000/hour (Mumbai) or ₹5,000/hour (Outside Mumbai). Extra time must be confirmed before the event.</p>

          <h3 className="font-display text-lg font-bold text-foreground">3. What's Included</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Professional caricature artist(s) for the full session</li>
            <li>All art materials included</li>
            <li>Premium 11×15-inch sheets with envelopes</li>
            <li>Black & White caricatures (~3 min each)</li>
            <li>Color caricatures (~6 min each)</li>
            <li>Custom branding on sheets (your logo/event name)</li>
          </ul>

          <h3 className="font-display text-lg font-bold text-foreground">4. Travel & Accommodation (Outside Mumbai)</h3>
          <p>For events outside Mumbai, travel (preferred mode: Flight) and accommodation charges apply separately. These must be arranged or confirmed by the client before the event date.</p>

          <h3 className="font-display text-lg font-bold text-foreground">5. Cancellation Policy</h3>
          <p>Cancellations made 7+ days before the event receive a 50% refund of the advance. Cancellations within 7 days of the event are non-refundable. Rescheduling is subject to artist availability.</p>

          <h3 className="font-display text-lg font-bold text-foreground">6. Remaining Payment</h3>
          <p>The remaining balance must be paid on the day of the event, before the session begins. Payment can be made via GPay/UPI or cash.</p>

          <h3 className="font-display text-lg font-bold text-foreground">7. Contact</h3>
          <p>For any queries regarding event bookings, contact us on WhatsApp at 8369594271 or Instagram @creativecaricatureclub.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default EventPolicy;
