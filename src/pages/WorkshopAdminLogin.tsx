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
      {/* Animated gradient mesh */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-1/3 -left-1/4 w-[700px] h-[700px] rounded-full opacity-[0.08] blur-[140px]"
          style={{ background: "conic-gradient(from 0deg, #7c3aed, #6366f1, #3b82f6, #7c3aed)" }}
          animate={{ rotate: [0, 360] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} />
        <motion.div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[120px]"
          style={{ background: "conic-gradient(from 180deg, #a855f7, #ec4899, #8b5cf6, #a855f7)" }}
          animate={{ rotate: [360, 0] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[100px] bg-indigo-400"
          animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 8, repeat: Infinity }} />
      </div>

      {/* Grid dots */}
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle, #7c3aed 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* Floating particles */}
      {[...Array(10)].map((_, i) => (
        <motion.div key={i} className="absolute pointer-events-none"
          style={{ top: `${8 + (i * 9) % 84}%`, left: `${4 + (i * 11) % 92}%` }}
          animate={{ y: [0, -(20 + i * 3), 0], x: [0, (i % 2 ? 10 : -10), 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 4 + i * 0.6, repeat: Infinity, delay: i * 0.25 }}>
          <div className="rounded-full bg-violet-500/30 shadow-[0_0_10px_rgba(124,58,237,0.2)]"
            style={{ width: `${5 + (i % 4) * 3}px`, height: `${5 + (i % 4) * 3}px` }} />
        </motion.div>
      ))}

      {/* Floating emojis */}
      {["🎓", "✨", "🎨", "🌟", "📚"].map((e, i) => (
        <motion.span key={i} className="absolute text-xl pointer-events-none select-none opacity-15"
          style={{ top: `${15 + i * 16}%`, right: `${6 + i * 10}%` }}
          animate={{ y: [0, -18, 0], rotate: [0, 12, -12, 0] }}
          transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.6 }}>
          {e}
        </motion.span>
      ))}

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.9, rotateX: 10 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }} className="w-full max-w-md relative z-10" style={{ perspective: "1200px" }}>

        {/* Outer glow */}
        <motion.div className="absolute -inset-1 rounded-[26px] opacity-30 blur-sm"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(99,102,241,0.2), rgba(168,85,247,0.15))" }}
          animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />

        <div className="relative bg-white border border-slate-200/60 rounded-2xl shadow-[0_25px_60px_-15px_rgba(124,58,237,0.15),0_0_0_1px_rgba(226,232,240,0.5)] overflow-hidden">
          {/* Shimmer */}
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(105deg, transparent 40%, rgba(124,58,237,0.03) 45%, rgba(124,58,237,0.06) 50%, rgba(124,58,237,0.03) 55%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }} />

          <div className="relative p-8 space-y-6">
            <div className="text-center space-y-3">
              <motion.div className="mx-auto w-18 h-18 rounded-2xl overflow-hidden relative"
                animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
                whileHover={{ scale: 1.1, rotateY: 15 }}>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/40 to-indigo-500/30 blur-sm" />
                <img src="/logo.png" alt="CCC" className="relative w-16 h-16 object-cover cursor-pointer rounded-2xl ring-2 ring-white/50 shadow-lg" onClick={() => navigate("/")} />
              </motion.div>
              <motion.p className="text-sm font-semibold text-violet-600"
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                {getGreeting()}
              </motion.p>
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
