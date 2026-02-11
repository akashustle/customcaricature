import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Props {
  orderId: string;
}

const WHATSAPP_NUMBER = "918369594271";

const OrderConfirmation = ({ orderId }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Order Placed! 🎉</h2>
            <p className="text-muted-foreground font-sans mb-4">
              Your caricature order has been placed. Share your payment screenshot on WhatsApp to confirm.
            </p>

            <div className="bg-muted rounded-lg p-4 mb-6 text-sm font-sans space-y-1">
              <p><span className="text-muted-foreground">Order ID:</span> <span className="font-mono font-medium">{orderId.slice(0, 8).toUpperCase()}</span></p>
              <p><span className="text-muted-foreground">Delivery:</span> 25–30 days</p>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! My order ID is ${orderId.slice(0, 8).toUpperCase()}. I have made the payment. Sharing screenshot for verification.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-full py-3 px-6 font-sans font-medium mb-4 hover:opacity-90 transition-opacity w-full"
            >
              <MessageCircle className="w-5 h-5" /> Share Screenshot on WhatsApp
            </a>

            <p className="text-xs text-muted-foreground font-sans mb-6">
              After payment verification, you'll receive updates on WhatsApp.
            </p>

            <Button onClick={() => navigate("/")} variant="outline" className="w-full rounded-full font-sans" size="lg">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrderConfirmation;
