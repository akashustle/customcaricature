import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { GraduationCap, Phone, Sparkles, Calendar, Clock } from "lucide-react";

const Workshop = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = mobile.trim();
    if (!trimmed || trimmed.length < 10) {
      toast({ title: "Please enter a valid mobile number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workshop_users" as any)
        .select("*")
        .eq("mobile", trimmed);

      if (error) throw error;
      const users = data as any[];
      if (!users || users.length === 0) {
        toast({
          title: "Not Registered",
          description: "Your number is not registered for this workshop. Please contact the admin.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      if (!users[0].is_enabled) {
        toast({
          title: "Account Disabled",
          description: "Your account has been disabled. Please contact the admin.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      localStorage.setItem("workshop_user", JSON.stringify(users[0]));
      toast({ title: `Welcome, ${users[0].name}! 🎨` });
      navigate("/workshop/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
      
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
        animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #ec4899, transparent)" }}
        animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }}
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 space-y-6">
          
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <motion.div
              className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Workshop Login
            </h1>
            <p className="text-white/60 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Creative Caricature Club
            </p>
          </div>

          {/* Workshop Info Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-2"
          >
            <p className="font-bold text-white text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              🎨 2 Days Live Workshop
            </p>
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>14 March & 15 March 2026</span>
            </div>
            <div className="flex gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 12 PM – 3 PM</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 6 PM – 9 PM</span>
            </div>
          </motion.div>

          {/* Login Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={mobile}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "");
                    if (d.length <= 10) setMobile(d);
                  }}
                  placeholder="Enter your registered mobile"
                  className="pl-10 h-12 bg-white/5 border-white/20 text-white placeholder:text-white/30 rounded-xl focus:border-purple-400 focus:ring-purple-400/20"
                  maxLength={10}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-lg shadow-purple-500/25"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  "Login to Workshop"
                )}
              </Button>
            </motion.div>

            <p className="text-xs text-center text-white/40">
              Only pre-registered workshop participants can login.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Workshop;
