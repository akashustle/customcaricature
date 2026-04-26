import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Sparkles, ArrowRight, Home, Phone, Truck, Clock, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { playPaymentSuccessSound } from "@/lib/sounds";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/error-reporter";

interface Props {
  orderId: string;
}

type PaymentVerifyStatus = "verifying" | "confirmed" | "pending" | "failed";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Floating ambient orbs (3D depth) */}
      <motion.div
        className="absolute top-10 -left-16 w-72 h-72 rounded-full bg-primary/15 blur-3xl"
        animate={{ y: [0, 20, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 -right-16 w-80 h-80 rounded-full bg-accent/15 blur-3xl"
        animate={{ y: [0, -25, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Confetti */}
      {[...Array(28)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            width: 6 + Math.random() * 8,
            height: 6 + Math.random() * 8,
            background: confettiColors[i % confettiColors.length],
            left: `${5 + Math.random() * 90}%`,
            top: `-5%`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
          animate={{
            y: ["0vh", "115vh"],
            x: [0, (Math.random() - 0.5) * 220],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2.5,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: "easeIn",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.85, rotateX: -15, y: 50 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.32 }}
        className="max-w-md w-full relative z-10"
        style={{ perspective: 1200 }}
      >
        {/* Layered 3D card */}
        <div className="relative">
          {/* Back shadow plate (depth) */}
          <div className="absolute inset-0 translate-y-3 scale-[0.97] rounded-[2rem] bg-foreground/10 blur-xl" />

          <div className="relative rounded-[2rem] bg-card border border-border/40 overflow-hidden shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.35),0_8px_24px_-8px_rgba(0,0,0,0.12)]">
            {/* Holographic gradient top */}
            <div className="relative h-44 overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(142 78% 42%) 0%, hsl(168 70% 44%) 45%, hsl(199 89% 50%) 100%)",
                }}
              />
              {/* Iridescent shimmer */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)",
                }}
                animate={{ x: ["-120%", "220%"] }}
                transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.5 }}
              />
              {/* Soft top spotlight */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at top, rgba(255,255,255,0.35) 0%, transparent 60%)",
                }}
              />

              {/* Floating success badge with depth */}
              <motion.div
                initial={{ scale: 0, rotateY: -180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ delay: 0.35, type: "spring", bounce: 0.55, duration: 0.9 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="relative">
                  {/* Pulse rings */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white/40"
                    animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white/30"
                    animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
                  />
                  <div className="relative w-24 h-24 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center ring-8 ring-white/15 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]">
                    <CheckCircle2 className="w-14 h-14 text-emerald-500" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>

              {/* Sparkle accents */}
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="absolute top-5 left-6"
              >
                <Sparkles className="w-6 h-6 text-white/80 drop-shadow" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: 45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.85, type: "spring" }}
                className="absolute top-5 right-6"
              >
                <Sparkles className="w-5 h-5 text-white/70 drop-shadow" />
              </motion.div>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 pt-5 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="font-display text-3xl font-bold text-foreground tracking-tight"
              >
                Order Confirmed!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground font-sans text-sm mt-1"
              >
                Thank you — your custom caricature is now in the studio queue.
              </motion.p>

              {/* Order ID chip */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.65, type: "spring" }}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5"
              >
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-sans font-semibold">Order ID</span>
                <span className="font-mono font-bold text-primary text-sm">
                  {orderId.slice(0, 8).toUpperCase()}
                </span>
              </motion.div>

              {/* Status grid - 3D feature tiles */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="mt-5 grid grid-cols-3 gap-2.5"
              >
                {[
                  { icon: ShieldCheck, label: "Payment", value: "Secured", tint: "emerald" },
                  { icon: Clock, label: "Delivery", value: "25-30 days", tint: "blue" },
                  { icon: Truck, label: "Shipping", value: "Free pan-India", tint: "purple" },
                ].map((tile, i) => {
                  const tintMap: Record<string, string> = {
                    emerald: "from-emerald-50 to-emerald-100/60 text-emerald-700 border-emerald-200",
                    blue: "from-blue-50 to-blue-100/60 text-blue-700 border-blue-200",
                    purple: "from-purple-50 to-purple-100/60 text-purple-700 border-purple-200",
                  };
                  return (
                    <motion.div
                      key={tile.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.85 + i * 0.08 }}
                      className={`rounded-2xl border bg-gradient-to-br ${tintMap[tile.tint]} p-3 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.08)]`}
                    >
                      <tile.icon className="w-5 h-5 mx-auto mb-1.5" />
                      <p className="text-[9px] uppercase tracking-wider font-semibold opacity-75">{tile.label}</p>
                      <p className="font-sans text-[11px] font-bold leading-tight mt-0.5">{tile.value}</p>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Helpful note */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.05 }}
                className="mt-5 rounded-2xl bg-muted/50 border border-border/50 p-3.5 text-left"
              >
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">What's next?</span> You'll get
                  WhatsApp updates as the artist starts. Track everything from your dashboard
                  and download invoices any time.
                </p>
              </motion.div>

              {/* Action stack */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15 }}
                className="mt-5 space-y-2.5"
              >
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="w-full h-12 rounded-2xl font-sans font-semibold shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.55)] bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <Package className="w-5 h-5 mr-2" /> Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    onClick={() => navigate("/")}
                    variant="outline"
                    className="h-11 rounded-2xl font-sans"
                  >
                    <Home className="w-4 h-4 mr-1.5" />
                    Home
                  </Button>
                  <Button
                    onClick={() => window.open(`https://wa.me/918369594271?text=${encodeURIComponent("Hi Creative Caricature Club! 👋 I just placed a caricature order and need some help. Can you assist me?")}`, "_blank")}
                    variant="outline"
                    className="h-11 rounded-2xl font-sans border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Phone className="w-4 h-4 mr-1.5" />
                    Support
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Reassurance line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-center text-[11px] text-muted-foreground font-sans mt-4"
        >
          🔒 Secure payment by Razorpay · 100% money-back if we miss our promise
        </motion.p>
      </motion.div>
    </div>
  );
};

export default OrderConfirmation;
