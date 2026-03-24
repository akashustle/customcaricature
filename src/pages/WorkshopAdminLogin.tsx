import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Lock, Sparkles, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, GraduationCap, KeyRound, User, MapPin, RefreshCw } from "lucide-react";

interface AdminInfo {
  name: string;
  email: string;
  tag?: string;
}

const ADMIN_LIST: AdminInfo[] = [
  { name: "Akash", email: "akashxbhavans@gmail.com", tag: "Main Admin" },
  { name: "Dilip", email: "dilip@gmail.com" },
  { name: "Ritesh", email: "ritesh@gmail.com" },
  { name: "Kaushik", email: "kaushik@gmail.com" },
  { name: "Manashvi", email: "manashvi@gmail.com" },
];

const WorkshopAdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminInfo | null>(null);
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "secret_code" | "otp">("password");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [adminMasterSecret, setAdminMasterSecret] = useState("01022006");
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_admin");
    if (stored) navigate("/workshop-admin-panel");
  }, []);

  useEffect(() => {
    const fetchSecret = async () => {
      const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "admin_secret_code").maybeSingle();
      if (data?.value && (data.value as any).code) setAdminMasterSecret((data.value as any).code);
    };
    fetchSecret();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => setLocationGranted(true), () => setLocationGranted(false), { enableHighAccuracy: true, timeout: 5000 });
    }
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => { setResendCooldown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; }); }, 1000);
  };

  const handleSelectAdmin = (admin: AdminInfo) => {
    if (!locationGranted) {
      toast({ title: "Location Required", variant: "destructive" });
      navigator.geolocation?.getCurrentPosition(() => setLocationGranted(true), () => {});
      return;
    }
    setSelectedAdmin(admin);
    setDirection(1);
    setStep(2);
    setPassword(""); setSecretCode(""); setOtpCode(""); setOtpSent(false); setAuthMethod("password");
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedAdmin) return;
    if (authMethod === "password" && !password) { toast({ title: "Enter password", variant: "destructive" }); return; }
    if (authMethod === "secret_code") {
      const norm = secretCode.replace(/[-\s]/g, "");
      if (norm !== adminMasterSecret) { toast({ title: "Invalid secret code", variant: "destructive" }); return; }
    }
    if (authMethod === "otp" && !otpSent) {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({ email: "akashxbhavans@gmail.com", options: { shouldCreateUser: false } });
        if (error) throw error;
        setOtpSent(true); startResendCooldown();
        toast({ title: "OTP Sent! 📧", description: "Check akashxbhavans@gmail.com" });
      } catch (err: any) { toast({ title: "Failed", description: err?.message, variant: "destructive" }); }
      finally { setLoading(false); }
      return;
    }
    if (authMethod === "otp" && otpCode.length !== 6) { toast({ title: "Enter 6-digit OTP", variant: "destructive" }); return; }

    setLoading(true);
    try {
      if (authMethod === "otp") {
        const { error } = await supabase.auth.verifyOtp({ email: "akashxbhavans@gmail.com", token: otpCode, type: "email" });
        if (error) throw error;
        if (selectedAdmin.email !== "akashxbhavans@gmail.com") {
          await supabase.auth.signOut();
          const { data, error: scErr } = await supabase.functions.invoke("login-with-secret-code", { body: { email: selectedAdmin.email, secret_code: adminMasterSecret.slice(0, 4) } });
          if (scErr || !data?.success) throw new Error("Could not sign in");
          const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
          if (vErr) throw vErr;
        }
      } else if (authMethod === "secret_code") {
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", { body: { email: selectedAdmin.email, secret_code: secretCode.slice(0, 4) } });
        if (error || !data?.success) throw new Error("Secret code login failed");
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (vErr) throw vErr;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: selectedAdmin.email, password });
        if (error) throw error;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Auth failed");
      const { data: roles } = await supabase.from("user_roles" as any).select("role").eq("user_id", userData.user.id).eq("role", "admin");
      if (!roles || (roles as any[]).length === 0) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", variant: "destructive" }); setLoading(false); return;
      }
      const adminInfo = { id: userData.user.id, email: selectedAdmin.email, name: selectedAdmin.name };
      localStorage.setItem("workshop_admin", JSON.stringify(adminInfo));
      toast({ title: `Welcome, ${selectedAdmin.name}! 🎓` });
      navigate("/workshop-admin-panel");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙"; };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#f8fafc]">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-1/3 -left-1/4 w-[700px] h-[700px] rounded-full opacity-[0.08] blur-[140px]"
          style={{ background: "conic-gradient(from 0deg, #7c3aed, #6366f1, #3b82f6, #7c3aed)" }}
          animate={{ rotate: [0, 360] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} />
        <motion.div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[120px]"
          style={{ background: "conic-gradient(from 180deg, #a855f7, #ec4899, #8b5cf6, #a855f7)" }}
          animate={{ rotate: [360, 0] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
      </div>
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle, #7c3aed 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, type: "spring" }} className="w-full max-w-md relative z-10">
        <motion.div className="absolute -inset-1 rounded-[26px] opacity-30 blur-sm"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(99,102,241,0.2))" }}
          animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />

        <div className="relative bg-white border border-slate-200/60 rounded-2xl shadow-[0_25px_60px_-15px_rgba(124,58,237,0.15)] overflow-hidden">
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(105deg, transparent 40%, rgba(124,58,237,0.03) 45%, rgba(124,58,237,0.06) 50%, rgba(124,58,237,0.03) 55%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }} />

          <div className="relative p-8 space-y-6">
            <div className="text-center space-y-3">
              <motion.div className="mx-auto relative" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/40 to-indigo-500/30 blur-sm" />
                <img src="/logo.png" alt="CCC" className="relative w-16 h-16 object-cover cursor-pointer rounded-2xl ring-2 ring-white/50 shadow-lg" onClick={() => navigate("/")} />
              </motion.div>
              <p className="text-sm font-semibold text-violet-600">{getGreeting()}</p>
              <div className="flex items-center justify-center gap-2">
                <GraduationCap className="w-5 h-5 text-violet-600" />
                <h1 className="text-xl font-bold text-slate-900">Workshop Admin</h1>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                {[1, 2].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? "w-12 bg-gradient-to-r from-violet-600 to-indigo-600" : s < step ? "w-8 bg-violet-300" : "w-8 bg-slate-200"}`} />
                ))}
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <MapPin className={`w-3 h-3 ${locationGranted ? "text-green-500" : "text-red-500"}`} />
                <span className={`text-[10px] ${locationGranted ? "text-green-600" : "text-red-500"}`}>
                  {locationGranted ? "Location verified" : "Location required"}
                </span>
              </div>
            </div>

            <div className="min-h-[280px] relative">
              <AnimatePresence mode="wait" custom={direction}>
                {step === 1 && (
                  <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-3">
                    <p className="text-sm font-medium text-slate-500 text-center">Select your profile</p>
                    <div className="space-y-2">
                      {ADMIN_LIST.map((admin) => (
                        <motion.button key={admin.email} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectAdmin(admin)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-left group">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-violet-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">{admin.name}</p>
                              {admin.tag && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">{admin.tag}</span>}
                            </div>
                            <p className="text-xs text-slate-400">{admin.email}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
                {step === 2 && selectedAdmin && (
                  <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="text-center py-3 px-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200/60">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-violet-200 to-indigo-200 flex items-center justify-center mb-2">
                          <User className="w-6 h-6 text-violet-600" />
                        </div>
                        <p className="text-base font-bold text-slate-900">👋 Hey {selectedAdmin.name}!</p>
                        {selectedAdmin.tag && <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 mt-1">{selectedAdmin.tag}</span>}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { key: "password" as const, icon: Lock, label: "Password" },
                          { key: "secret_code" as const, icon: KeyRound, label: "Secret" },
                          { key: "otp" as const, icon: Mail, label: "OTP" },
                        ]).map(m => (
                          <button key={m.key} type="button"
                            onClick={() => { setAuthMethod(m.key); setOtpSent(false); }}
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              authMethod === m.key ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-400 hover:border-violet-300"
                            }`}>
                            <m.icon className="w-4 h-4" /> {m.label}
                          </button>
                        ))}
                      </div>

                      {authMethod === "password" && (
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-500 font-medium">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••" className="pl-10 pr-10 h-12 bg-slate-50/80 border-slate-200 rounded-xl focus:border-violet-500" autoFocus />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {authMethod === "secret_code" && (
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-500 font-medium">6-Digit Secret Code</Label>
                          <Input type="password" value={secretCode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 8) setSecretCode(d); }}
                            placeholder="• • • • • •" className="h-12 bg-slate-50/80 border-slate-200 rounded-xl text-center text-xl tracking-[0.4em] font-bold focus:border-violet-500" autoFocus />
                        </div>
                      )}
                      {authMethod === "otp" && (
                        <div className="space-y-3">
                          {!otpSent ? (
                            <div className="text-center py-3 rounded-xl bg-slate-50 border border-slate-200">
                              <Mail className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                              <p className="text-xs text-slate-500">OTP → <strong>akashxbhavans@gmail.com</strong></p>
                            </div>
                          ) : (
                            <>
                              <Label className="text-sm text-slate-500 font-medium">Enter 6-digit OTP</Label>
                              <Input value={otpCode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                                placeholder="• • • • • •" className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-slate-50/80 border-slate-200 rounded-xl" autoFocus />
                              <button type="button" disabled={resendCooldown > 0}
                                onClick={async () => { await supabase.auth.signInWithOtp({ email: "akashxbhavans@gmail.com", options: { shouldCreateUser: false } }); startResendCooldown(); }}
                                className="text-sm text-violet-600 hover:underline disabled:text-slate-400 flex items-center gap-1 mx-auto">
                                <RefreshCw className="w-3 h-3" /> {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <Button type="submit" disabled={loading}
                        className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/20">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{authMethod === "otp" && !otpSent ? "Sending..." : "Verifying..."}</> : authMethod === "otp" && !otpSent ? "Send OTP" : "Sign In"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setDirection(-1); setStep(1); setSelectedAdmin(null); }}
                        className="w-full h-10 rounded-xl gap-2 text-slate-400 hover:text-slate-600">
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
