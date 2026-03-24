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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#f8fafc]">
      {/* Subtle animated background */}
      <motion.div className="absolute top-10 left-10 w-96 h-96 rounded-full opacity-[0.06] blur-[100px] bg-violet-500"
        animate={{ scale: [1, 1.2, 1], x: [0, 40, 0] }} transition={{ duration: 12, repeat: Infinity }} />
      <motion.div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[120px] bg-indigo-500"
        animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 14, repeat: Infinity }} />
      <motion.div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-[0.04] blur-[80px] bg-blue-400"
        animate={{ y: [0, -30, 0] }} transition={{ duration: 8, repeat: Infinity }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-md relative z-10">
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="text-center space-y-3">
              <motion.div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden ring-1 ring-black/[0.04] shadow-lg"
                animate={{ y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} />
              </motion.div>
              <p className="text-sm font-medium text-violet-600">{getGreeting()}</p>
              <div className="flex items-center justify-center gap-2">
                <GraduationCap className="w-5 h-5 text-violet-600" />
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workshop Admin</h1>
              </div>
              <p className="text-sm text-slate-400">CCC Academy Console</p>
              {/* Progress */}
              <div className="flex items-center justify-center gap-2 mt-3">
                {[1, 2].map(s => (
                  <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s === step ? "w-10 bg-gradient-to-r from-violet-600 to-indigo-600" : s < step ? "w-6 bg-violet-300" : "w-6 bg-slate-200"}`} />
                ))}
              </div>
            </div>

            <div className="min-h-[200px] relative overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                {step === 1 && (
                  <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-500 font-medium">Admin Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com"
                          className="pl-10 h-12 bg-slate-50/80 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-violet-500/20" autoFocus />
                      </div>
                    </div>
                    <Button onClick={() => { if (!email.trim()) { toast({ title: "Enter email", variant: "destructive" }); return; } setDirection(1); setStep(2); }}
                      className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/20 gap-2">
                      Continue <ArrowRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <p className="text-xs text-slate-400 text-center">{email}</p>
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-500 font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••" className="pl-10 pr-10 h-12 bg-slate-50/80 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-violet-500/20" autoFocus />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" disabled={loading}
                        className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/20">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setDirection(-1); setStep(1); }} className="w-full h-10 rounded-xl gap-2 text-slate-400 hover:text-slate-600">
                        <ArrowLeft className="w-4 h-4" /> Back
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center">
              <button onClick={() => navigate("/")} className="text-xs text-slate-400 hover:text-violet-600 transition-colors">← Back to Home</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkshopAdminLogin;
