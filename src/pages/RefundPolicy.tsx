import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const RefundPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display text-xl font-bold">Refund Policy</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-2xl font-sans space-y-4 text-sm text-foreground/80">
        <h2 className="font-display text-lg font-bold text-foreground">Cancellation</h2>
        <p>Orders can be cancelled within 24 hours of payment confirmation for a full refund. After 24 hours, a 50% cancellation fee applies as artwork creation may have already begun.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Refunds</h2>
        <p>Refunds are processed within 7–10 business days to the original payment method. In case of quality issues, we offer free revisions or a partial refund at our discretion.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Damaged Goods</h2>
        <p>If your artwork arrives damaged during shipping, please contact us within 48 hours with photos of the damage. We will arrange a replacement at no additional cost.</p>
        <h2 className="font-display text-lg font-bold text-foreground">Contact</h2>
        <p>For refund requests, contact us on WhatsApp at 8369594271.</p>
      </div>
    </div>
  );
};

export default RefundPolicy;
