import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, Lock, Mail, KeyRound, RefreshCw, ArrowLeft, User, MapPin, GraduationCap, Phone } from "lucide-react";

interface AdminInfo { name: string; email: string; mobile: string; designation: string; }

const ADMIN_LIST: AdminInfo[] = [
  { name: "Akash", email: "akashxbhavans@gmail.com", mobile: "8421199205", designation: "Chief Strategy & Technology Officer" },
  { name: "Dilip", email: "dilip@gmail.com", mobile: "8369594271", designation: "Chief Operating Officer (COO)" },
  { name: "Ritesh", email: "ritesh@gmail.com", mobile: "9967047351", designation: "Founder & Chief Executive Officer (CEO)" },
  { name: "Kaushik", email: "kaushik@gmail.com", mobile: "9833067656", designation: "Senior Operations & Client Relations Manager" },
  { name: "Manashvi", email: "manashvi@gmail.com", mobile: "8433843725", designation: "Creative Director & Content Lead" },
];

const maskEmail = (email: string) => { const [l, d] = email.split("@"); return `${l.slice(0, 3)}${"•".repeat(Math.max(l.length - 3, 2))}@${d}`; };
const maskMobile = (m: string) => `${m.slice(0, 2)}••••${m.slice(-2)}`;

const WorkshopAdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedAdminEmail, setSelectedAdminEmail] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminInfo | null>(null);
  const [verifyMethod, setVerifyMethod] = useState<"email" | "mobile">("email");
  const [verifyInput, setVerifyInput] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "secret_code" | "otp">("password");
  const [failedAttempts, setFailedAttempts] = useState(0);
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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(() => setLocationGranted(true), () => {
      setLocationGranted(false);
      setTimeout(() => {
        navigator.geolocation.getCurrentPosition(() => setLocationGranted(true), () => setLocationGranted(false), { enableHighAccuracy: true, timeout: 10000 });
      }, 2000);
    }, { enableHighAccuracy: true, timeout: 5000 });
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => { setResendCooldown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; }); }, 1000);
  };

  const handleProfileSelect = (email: string) => {
    if (!locationGranted) {
      toast({ title: "Location Required", variant: "destructive" });
      navigator.geolocation?.getCurrentPosition(() => setLocationGranted(true), () => {});
      return;
    }
    setSelectedAdminEmail(email);
    const admin = ADMIN_LIST.find(a => a.email === email);
    if (admin) { setSelectedAdmin(admin); setVerifyInput(""); setVerifyMethod("email"); setDirection(1); setStep(2); }
  };

  const handleVerifyIdentity = () => {
    if (!selectedAdmin || !verifyInput.trim()) { toast({ title: "Enter your " + verifyMethod, variant: "destructive" }); return; }
    const match = verifyMethod === "email"
      ? verifyInput.toLowerCase() === selectedAdmin.email.toLowerCase()
      : verifyInput.replace(/\s/g, "") === selectedAdmin.mobile;
    if (!match) { toast({ title: "Identity not matched", variant: "destructive" }); return; }
    setDirection(1); setStep(3); setPassword(""); setSecretCode(""); setOtpCode(""); setOtpSent(false); setAuthMethod("password");
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedAdmin) return;
    if (authMethod === "password" && !password) { toast({ title: "Enter password", variant: "destructive" }); return; }
    if (authMethod === "secret_code") {
      const norm = secretCode.replace(/[-\s]/g, "");
      if (norm.length !== 8) { toast({ title: "Enter 8-digit secret code", variant: "destructive" }); return; }
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
  const goBack = () => { setDirection(-1); if (step === 3) setStep(2); else if (step === 2) { setStep(1); setSelectedAdmin(null); setSelectedAdminEmail(""); } };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-1/3 -left-1/4 w-[700px] h-[700px] rounded-full opacity-[0.08] blur-[140px]"
          style={{ background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(260 80% 60%), hsl(var(--primary)))" }}
          animate={{ rotate: [0, 360] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} />
      </div>
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, type: "spring" }} className="w-full max-w-md relative z-10">
        <motion.div className="absolute -inset-1 rounded-[26px] opacity-30 blur-sm"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--accent)/0.2))" }}
          animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />

        <div className="relative bg-card/95 border border-border/40 rounded-2xl shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.15)] overflow-hidden">
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(105deg, transparent 40%, hsl(var(--primary)/0.03) 45%, hsl(var(--primary)/0.06) 50%, hsl(var(--primary)/0.03) 55%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }} />

          <div className="relative p-8 space-y-6">
            <div className="text-center space-y-3">
              <motion.div className="mx-auto relative" animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/30 blur-sm" />
                <img src="/logo.png" alt="CCC" className="relative w-16 h-16 object-cover cursor-pointer rounded-2xl ring-2 ring-white/50 shadow-lg" onClick={() => navigate("/")} />
              </motion.div>
              <p className="text-sm font-semibold text-primary">{getGreeting()}</p>
              <div className="flex items-center justify-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Workshop Admin</h1>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? "w-10 bg-gradient-to-r from-primary to-accent" : s < step ? "w-6 bg-primary/40" : "w-6 bg-muted"}`} />
                ))}
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <MapPin className={`w-3 h-3 ${locationGranted ? "text-green-500" : "text-destructive"}`} />
                <span className={`text-[10px] ${locationGranted ? "text-green-600" : "text-destructive"}`}>
                  {locationGranted ? "Location verified" : "Location required"}
                </span>
              </div>
            </div>

            <div className="min-h-[260px] relative">
              <AnimatePresence mode="wait" custom={direction}>
                {step === 1 && (
                  <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                    <Label className="text-sm font-medium text-muted-foreground">Select Your Profile</Label>
                    <Select value={selectedAdminEmail} onValueChange={handleProfileSelect}>
                      <SelectTrigger className="h-12 rounded-xl bg-background/60 border-border/60 text-base">
                        <SelectValue placeholder="Choose admin profile..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMIN_LIST.map(admin => (
                          <SelectItem key={admin.email} value={admin.email}>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{admin.name}</span>
                              <span className="text-muted-foreground text-xs">({maskEmail(admin.email)})</span>
                              {admin.tag && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{admin.tag}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                {step === 2 && selectedAdmin && (
                  <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                    <div className="text-center py-3 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                      <p className="text-sm font-semibold text-foreground">Hi {selectedAdmin.name}! 👋</p>
                      <p className="text-xs text-muted-foreground mt-1">Verify your identity</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground">Authenticate With</Label>
                      <Select value={verifyMethod} onValueChange={(v) => { setVerifyMethod(v as "email" | "mobile"); setVerifyInput(""); }}>
                        <SelectTrigger className="h-11 rounded-xl bg-background/60 border-border/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</div></SelectItem>
                          <SelectItem value="mobile"><div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Mobile</div></SelectItem>
                        </SelectContent>
                      </Select>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Enter {verifyMethod} <span className="opacity-60">(hint: {verifyMethod === "email" ? maskEmail(selectedAdmin.email) : maskMobile(selectedAdmin.mobile)})</span>
                        </Label>
                        <Input type={verifyMethod === "email" ? "email" : "tel"} value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)}
                          placeholder={verifyMethod === "email" ? "Enter email" : "Enter mobile"}
                          className="h-12 mt-1.5 bg-background/60 border-border/60 rounded-xl"
                          onKeyDown={(e) => e.key === "Enter" && handleVerifyIdentity()} />
                      </div>
                    </div>
                    <Button onClick={handleVerifyIdentity} className="w-full h-11 rounded-xl font-semibold">Verify & Continue</Button>
                    <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs text-muted-foreground gap-1"><ArrowLeft className="w-3 h-3" /> Back</Button>
                  </motion.div>
                )}

                {step === 3 && selectedAdmin && (
                  <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="text-center py-3 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mb-2">
                          <User className="w-6 h-6 text-primary/60" />
                        </div>
                        <p className="text-base font-bold text-foreground">Welcome, {selectedAdmin.name}! 🎉</p>
                        {selectedAdmin.tag && <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1">{selectedAdmin.tag}</span>}
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
                              authMethod === m.key ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30"
                            }`}>
                            <m.icon className="w-4 h-4" /> {m.label}
                          </button>
                        ))}
                      </div>

                      {authMethod === "password" && (
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground font-medium">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••" className="pl-10 pr-10 h-12 bg-background/60 border-border/60 rounded-xl" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {authMethod === "secret_code" && (
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground font-medium">8-Digit Secret Code</Label>
                          <Input type="password" value={secretCode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 8) setSecretCode(d); }}
                            placeholder="• • • • • • • •" className="h-12 bg-background/60 border-border/60 rounded-xl text-center text-xl tracking-[0.3em] font-bold" />
                        </div>
                      )}
                      {authMethod === "otp" && (
                        <div className="space-y-3">
                          {!otpSent ? (
                            <div className="text-center py-3 rounded-xl bg-muted/50 border border-border/60">
                              <Mail className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                              <p className="text-xs text-muted-foreground">OTP → <strong>akashxbhavans@gmail.com</strong></p>
                            </div>
                          ) : (
                            <>
                              <Label className="text-sm text-muted-foreground font-medium">Enter 6-digit OTP</Label>
                              <Input value={otpCode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                                placeholder="• • • • • •" className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-background/60 border-border/60 rounded-xl" />
                              <button type="button" disabled={resendCooldown > 0}
                                onClick={async () => { await supabase.auth.signInWithOtp({ email: "akashxbhavans@gmail.com", options: { shouldCreateUser: false } }); startResendCooldown(); }}
                                className="text-sm text-primary hover:underline disabled:text-muted-foreground flex items-center gap-1 mx-auto">
                                <RefreshCw className="w-3 h-3" /> {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{authMethod === "otp" && !otpSent ? "Sending..." : "Verifying..."}</> : authMethod === "otp" && !otpSent ? "Send OTP" : "Sign In"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs text-muted-foreground gap-1">
                        <ArrowLeft className="w-3 h-3" /> Back
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center">
              <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back to Home</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkshopAdminLogin;
