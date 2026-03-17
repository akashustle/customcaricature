import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { GraduationCap, Phone, Sparkles, Calendar, Clock, Mail, MessageCircle } from "lucide-react";

const Workshop = () => {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<"mobile" | "email">("mobile");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("8433843725");

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (stored) { navigate("/workshop/dashboard"); return; }
    fetchWhatsappNumber();
  }, []);

  const fetchWhatsappNumber = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*").eq("id", "whatsapp_support_number").single();
    if (data && (data as any).value?.number) setWhatsappNumber((data as any).value.number);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      let query = supabase.from("workshop_users" as any).select("*");
      if (loginType === "mobile") {
        const trimmed = mobile.trim();
        if (!trimmed || trimmed.length < 10) {
          toast({ title: "Please enter a valid mobile number", variant: "destructive" });
          setLoading(false);
          return;
        }
        query = query.eq("mobile", trimmed);
      } else {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !trimmed.includes("@")) {
          toast({ title: "Please enter a valid email", variant: "destructive" });
          setLoading(false);
          return;
        }
        query = query.eq("email", trimmed);
      }

      const { data, error } = await query;
      if (error) throw error;
      const users = data as any[];
      if (!users || users.length === 0) {
        toast({
          title: "Not Registered",
          description: "Your number/email is not registered for this workshop. Please contact the admin.",
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

  const whatsappLink = `https://wa.me/91${whatsappNumber}?text=${encodeURIComponent("Hi, I'm unable to login to the Creative Caricature Club Workshop. Can you help me?")}`;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 pb-24 md:pb-4"
      style={{ background: "linear-gradient(135deg, #f5f0ff 0%, #efe8fc 30%, #e8f0fd 60%, #fdf0f8 100%)" }}>
      
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, #c084fc, transparent)" }}
        animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #f472b6, transparent)" }}
        animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #67e8f9, transparent)" }}
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
        <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-3xl shadow-2xl shadow-purple-200/30 p-8 space-y-6">
          
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <motion.div
              className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-200/60 shadow-lg shadow-purple-200/20"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Workshop Login
            </h1>
            <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Creative Caricature Club
            </p>
          </div>

          {/* Workshop Info Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-secondary/80 backdrop-blur-sm border border-border/40 rounded-2xl p-4 space-y-2"
          >
            <p className="font-bold text-foreground text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              🎨 2 Days Live Workshop
            </p>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>14 March & 15 March 2026</span>
            </div>
            <div className="flex gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 12 PM – 3 PM</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 6 PM – 9 PM</span>
            </div>
          </motion.div>

          {/* Login Type Toggle */}
          <div className="flex bg-gray-100/80 rounded-xl p-1">
            <button
              onClick={() => setLoginType("mobile")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginType === "mobile" ? "bg-white shadow-sm text-purple-600" : "text-gray-400"
              }`}
            >
              <Phone className="w-4 h-4" /> Mobile
            </button>
            <button
              onClick={() => setLoginType("email")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginType === "email" ? "bg-white shadow-sm text-purple-600" : "text-gray-400"
              }`}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>

          {/* Login Form */}
          <div className="space-y-4">
            {loginType === "mobile" ? (
              <div className="space-y-2">
                <Label className="text-gray-600 text-sm">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={mobile}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      if (d.length <= 10) setMobile(d);
                    }}
                    placeholder="Enter your registered mobile"
                    className="pl-10 h-12 bg-white/80 border-purple-100 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-purple-400 focus:ring-purple-200"
                    maxLength={10}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-gray-600 text-sm">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="pl-10 h-12 bg-white/80 border-purple-100 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-purple-400 focus:ring-purple-200"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              </div>
            )}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 border-0 shadow-lg shadow-purple-300/30"
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

            <p className="text-xs text-center text-gray-400">
              Only pre-registered workshop participants can login.
            </p>

            {/* WhatsApp Support */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-green-200 bg-green-50/80 text-green-600 text-sm font-medium hover:bg-green-100/80 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Can't login? Contact us on WhatsApp
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Workshop;
