import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Terms & Conditions</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <h2 className="font-display text-lg font-bold text-foreground">1. Order Acceptance</h2>
        <p>By placing an order, you agree to provide accurate information including clear HD photographs and valid contact details. Orders are confirmed only after 100% advance payment is verified.</p>
        <h2 className="font-display text-lg font-bold text-foreground">2. Payment</h2>
        <p>All payments must be made via GPay/UPI. Payment screenshots must be shared on WhatsApp for verification. No COD (Cash on Delivery) is available.</p>
        <h2 className="font-display text-lg font-bold text-foreground">3. Delivery Timeline</h2>
        <p>Due to high demand, delivery takes 25–30 days from the date of payment confirmation. This timeline may vary during festive seasons.</p>
        <h2 className="font-display text-lg font-bold text-foreground">4. Artwork Ownership</h2>
        <p>The customer receives the physical artwork. Creative Caricature Club reserves the right to use the artwork for portfolio and promotional purposes unless explicitly requested otherwise.</p>
        <h2 className="font-display text-lg font-bold text-foreground">5. Revisions</h2>
        <p>Minor revisions are allowed during the creation process. Major changes after artwork completion may incur additional charges.</p>
        <h2 className="font-display text-lg font-bold text-foreground">6. Contact</h2>
        <p>For any queries, contact us on WhatsApp at 8369594271 or Instagram @creativecaricatureclub.</p>
      </div>
    </div>
  );
};

export default Terms;
