import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package, Sparkles, PartyPopper, ArrowRight, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { playPaymentSuccessSound } from "@/lib/sounds";

interface Props {
  orderId: string;
}

const confettiColors = [
  "hsl(var(--primary))",
  "hsl(142 76% 50%)",
  "hsl(45 93% 58%)",
  "hsl(280 87% 65%)",
  "hsl(199 89% 48%)",
  "hsl(350 80% 60%)",
];

const OrderConfirmation = ({ orderId }: Props) => {
  const navigate = useNavigate();

  useEffect(() => {
    playPaymentSuccessSound();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Confetti particles */}
      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: 6 + Math.random() * 6,
            height: 6 + Math.random() * 6,
            background: confettiColors[i % confettiColors.length],
            left: `${5 + Math.random() * 90}%`,
            top: `-5%`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, (Math.random() - 0.5) * 200],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeIn",
          }}
        />
      ))}

      {/* Glow ring */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)",
        }}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, type: "spring", bounce: 0.35 }}
        className="max-w-md w-full relative z-10"
      >
        <Card className="border-0 shadow-2xl overflow-hidden backdrop-blur-sm">
          {/* Animated gradient header */}
          <motion.div
            className="relative h-36 flex items-center justify-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(142 76% 36%), hsl(152 68% 40%), hsl(168 65% 38%))",
            }}
          >
            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
              }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
            />

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", bounce: 0.5, duration: 0.8 }}
              className="relative"
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/10">
                <CheckCircle className="w-12 h-12 text-white drop-shadow-lg" />
              </div>
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/30"
                animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -30, rotate: -20 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="absolute top-4 left-4"
            >
              <PartyPopper className="w-7 h-7 text-white/60" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30, rotate: 20 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ delay: 0.7, type: "spring" }}
              className="absolute top-4 right-4"
            >
              <Sparkles className="w-7 h-7 text-white/60" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
            >
              <Gift className="w-5 h-5 text-white/40" />
            </motion.div>
          </motion.div>

          <CardContent className="p-6 text-center -mt-5 relative">
            <div className="bg-background rounded-2xl p-6 shadow-inner border border-border/50">
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="font-display text-2xl font-bold mb-1"
              >
                Order Confirmed! 🎉
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground font-sans text-sm mb-5"
              >
                Your caricature is being crafted with love!
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-xl p-4 mb-5 text-sm font-sans space-y-2.5 border border-border bg-muted/30"
              >
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {orderId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-semibold flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3.5 h-3.5" /> Confirmed
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">25–30 days</span>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-xs text-muted-foreground font-sans mb-5"
              >
                Track your order and download invoices from your dashboard. We'll keep you updated!
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-2.5"
              >
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="w-full rounded-full font-sans shadow-lg"
                  size="lg"
                >
                  <Package className="w-5 h-5 mr-2" /> Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="w-full rounded-full font-sans"
                  size="lg"
                >
                  Back to Home
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrderConfirmation;
