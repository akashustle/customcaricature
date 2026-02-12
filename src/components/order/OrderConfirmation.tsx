import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Props {
  orderId: string;
}

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
            <h2 className="font-display text-2xl font-bold mb-2">Order Confirmed! 🎉</h2>
            <p className="text-muted-foreground font-sans mb-4">
              Your payment has been received and your caricature order is confirmed!
            </p>

            <div className="bg-muted rounded-lg p-4 mb-6 text-sm font-sans space-y-1">
              <p><span className="text-muted-foreground">Order ID:</span> <span className="font-mono font-medium">{orderId.slice(0, 8).toUpperCase()}</span></p>
              <p><span className="text-muted-foreground">Payment:</span> <span className="text-green-600 font-medium">Confirmed ✅</span></p>
              <p><span className="text-muted-foreground">Expected Delivery:</span> 25–30 days</p>
            </div>

            <p className="text-sm text-muted-foreground font-sans mb-6">
              You can track your order status from your dashboard. We'll keep you updated!
            </p>

            <div className="space-y-3">
              <Button onClick={() => navigate("/dashboard")} className="w-full rounded-full font-sans" size="lg">
                <Package className="w-5 h-5 mr-2" /> Go to Dashboard
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full rounded-full font-sans" size="lg">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrderConfirmation;
