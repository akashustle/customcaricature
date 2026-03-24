import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Lock, Sparkles, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";

const WorkshopAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_admin");
    if (stored) navigate("/workshop-admin-panel");
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password.trim()) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", data.user.id).eq("role", "admin");
      if (!roleData || (roleData as any[]).length === 0) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "No workshop admin access.", variant: "destructive" });
        setLoading(false); return;
      }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", data.user.id).single();
      const adminInfo = { id: data.user.id, email: data.user.email, name: profile?.full_name || data.user.email };
      localStorage.setItem("workshop_admin", JSON.stringify(adminInfo));
      await supabase.from("workshop_admin_log" as any).insert({ admin_id: data.user.id, admin_name: adminInfo.name, action: "login", details: "Workshop Admin Login" } as any);
      await supabase.from("workshop_admins" as any).upsert({ user_id: data.user.id, name: adminInfo.name, email: data.user.email } as any, { onConflict: "user_id" } as any);
      toast({ title: "Welcome, Admin! 🎓" });
      navigate("/workshop-admin-panel");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙"; };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };
  const [direction, setDirection] = useState(1);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-fuchsia-50/30 to-indigo-50">
      {/* Animated background orbs */}
      <motion.div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl bg-violet-400"
        animate={{ scale: [1, 1.3, 1], x: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl bg-fuchsia-400"
        animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 10, repeat: Infinity }} />
      <motion.div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10 blur-2xl bg-amber-300"
        animate={{ y: [0, -25, 0] }} transition={{ duration: 6, repeat: Infinity }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-white/70 border border-white/40 rounded-3xl shadow-2xl shadow-violet-200/30 overflow-hidden">
          {/* Header gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" />
          
          <div className="p-8 space-y-6">
            <div className="text-center space-y-3">
              <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-violet-200/50 shadow-lg shadow-violet-200/30"
                animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} />
              </motion.div>
              <p className="text-sm font-medium text-violet-600">{getGreeting()}</p>
              <div className="flex items-center justify-center gap-2">
                <GraduationCap className="w-5 h-5 text-violet-600" />
                <h1 className="text-2xl font-bold text-foreground">Workshop Admin</h1>
              </div>
              <p className="text-sm text-muted-foreground">CCC Academy Console</p>
              {/* Progress */}
              <div className="flex items-center justify-center gap-2 mt-2">
                {[1, 2].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? "w-10 bg-violet-500" : s < step ? "w-6 bg-violet-300" : "w-6 bg-muted"}`} />
                ))}
              </div>
            </div>

            <div className="min-h-[200px] relative overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                {step === 1 && (
                  <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground font-medium">Admin Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com"
                          className="pl-10 h-12 bg-white/60 border-violet-100 rounded-xl focus:border-violet-400 focus:ring-violet-200" autoFocus />
                      </div>
                    </div>
                    <Button onClick={() => { if (!email.trim()) { toast({ title: "Enter email", variant: "destructive" }); return; } setDirection(1); setStep(2); }}
                      className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-300/30 gap-2">
                      Continue <ArrowRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <p className="text-xs text-muted-foreground text-center">{email}</p>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••" className="pl-10 pr-10 h-12 bg-white/60 border-violet-100 rounded-xl focus:border-violet-400 focus:ring-violet-200" autoFocus />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" disabled={loading}
                        className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-300/30">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setDirection(-1); setStep(1); }} className="w-full h-10 rounded-xl gap-2 text-muted-foreground">
                        <ArrowLeft className="w-4 h-4" /> Back
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center">
              <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-violet-600 transition-colors">← Back to Home</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkshopAdminLogin;
