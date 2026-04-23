import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { lazy, Suspense } from "react";
const SiteFooter = lazy(() => import("@/components/SiteFooter"));

const fadeUp = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });
const H = ({ children, d }: { children: React.ReactNode; d: number }) => (
  <motion.h2 {...fadeUp(d)} className="font-display text-lg font-bold text-foreground pt-2">{children}</motion.h2>
);
const P = ({ children, d }: { children: React.ReactNode; d: number }) => (
  <motion.p {...fadeUp(d)}>{children}</motion.p>
);

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <SEOHead title="Terms & Conditions | Creative Caricature Club™" description="Read the terms and conditions for caricature orders, live event bookings, workshops & merchandise at Creative Caricature Club™. India's trusted caricature studio." canonical="/terms" />
      <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg" />
          <h1 className="font-display text-xl font-bold">Terms & Conditions</h1>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 max-w-5xl font-body space-y-4 text-sm text-foreground/80">
        <P d={0.05}>These Terms and Conditions govern the use of the Creative Caricature Club™ websites and services. By accessing the website or purchasing services, the user agrees to comply with these terms.</P>
        
        <H d={0.1}>1. Eligibility</H>
        <P d={0.12}>Users must be at least <strong>18 years of age</strong> or have parental consent to access services offered by Creative Caricature Club™.</P>
        
        <H d={0.15}>2. Service Availability</H>
        <P d={0.17}>All services are subject to availability. Creative Caricature Club™ reserves the right to accept or reject bookings, modify services, and change pricing policies.</P>
        
        <H d={0.2}>3. Event Booking Policy</H>
        <P d={0.22}>Event bookings are confirmed only after payment of the required booking amount. Upon confirmation, the artist's date is reserved exclusively for the client and the artist is scheduled and blocked for the event.</P>
        <P d={0.24}>Due to the professional service nature of the booking: <strong>All event bookings are strictly non-refundable.</strong> Cancellation by the client will not entitle the client to any refund.</P>
        
        <H d={0.27}>4. Pricing Policy</H>
        <P d={0.29}>All prices listed on the website are indicative and may change. Creative Caricature Club™ reserves the right to update pricing. <strong>All event booking pricing will be updated on 28 October 2026.</strong></P>
        
        <H d={0.32}>5. Travel Policy</H>
        <P d={0.34}>For events outside Mumbai, the client must arrange and bear the cost of travel (flight or train tickets), accommodation if required, and local transportation. These arrangements must be confirmed before the event date.</P>
        
        <H d={0.37}>6. Order Acceptance</H>
        <P d={0.39}>By placing an order, you agree to provide accurate information including clear HD photographs and valid contact details. Orders are confirmed only after 100% advance payment is verified.</P>
        
        <H d={0.42}>7. Payment</H>
        <P d={0.44}>All payments must be made via approved payment methods (UPI, online payment gateways, bank transfer, digital wallets). Payment verification may be required.</P>
        
        <H d={0.47}>8. Delivery Timeline</H>
        <P d={0.49}>Due to high demand, delivery takes 25–30 days from the date of payment confirmation. This timeline may vary during festive seasons.</P>
        
        <H d={0.52}>9. Artwork Ownership</H>
        <P d={0.54}>The customer receives the physical artwork. Creative Caricature Club™ reserves the right to use the artwork for portfolio and promotional purposes unless explicitly requested otherwise.</P>
        
        <H d={0.57}>10. Revisions</H>
        <P d={0.59}>Minor revisions are allowed during the creation process. Major changes after artwork completion may incur additional charges.</P>
        
        <H d={0.62}>11. Limitation of Liability</H>
        <P d={0.64}>Creative Caricature Club™ shall not be liable for any indirect or consequential damages arising from the use of its services or products. Total liability, if any, shall be limited to the amount paid for the service.</P>
        
        <H d={0.67}>12. Governing Law</H>
        <P d={0.69}>These policies shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts located in <strong>Mumbai, Maharashtra, India</strong>.</P>
        
        <H d={0.72}>13. Contact</H>
        <P d={0.74}>For any queries, contact us at <a href="mailto:creativecaricatureclub@gmail.com" className="text-primary hover:underline">creativecaricatureclub@gmail.com</a> or WhatsApp at <a href="https://wa.me/918369594271" className="text-primary hover:underline">+91 8369594271</a>.</P>
      </motion.div>
      <Suspense fallback={null}><SiteFooter /></Suspense>

    </div>
  );
};


export default Terms;
