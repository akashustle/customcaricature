import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ShippingPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Shipping Policy</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <h2 className="font-display text-lg font-bold text-foreground">Delivery Timeline</h2>
        <p>Due to high demand, delivery takes 25–30 days from payment confirmation. We will keep you updated via WhatsApp throughout the process.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Shipping Coverage</h2>
        <p>We deliver across India. Shipping charges are included in the order price.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Framing</h2>
        <p>Orders from Mumbai include a premium frame at no extra cost. For orders outside Mumbai, we do not include frames to prevent damage during transit.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Tracking</h2>
        <p>Once your caricature is dispatched, we'll share the tracking details via WhatsApp.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Contact</h2>
        <p>For shipping queries, contact us on WhatsApp at 8369594271 or Instagram @creativecaricatureclub.</p>
      </div>
    </div>
  );
};

export default ShippingPolicy;
