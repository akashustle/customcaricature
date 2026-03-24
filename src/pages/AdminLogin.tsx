import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, Shield, Lock, Mail, KeyRound, RefreshCw, Sparkles, ArrowRight, ArrowLeft, User, MapPin, CheckCircle } from "lucide-react";

const withTimeout = async (promise: Promise<any>, ms = 10000) =>
  Promise.race([promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Request timed out.")), ms))]);

interface AdminInfo {
  name: string;
  email: string;
  mobile: string;
  avatar_url?: string | null;
  user_id?: string;
  tag?: string;
}

const ADMIN_LIST: AdminInfo[] = [
  { name: "Akash", email: "akashxbhavans@gmail.com", mobile: "8421199205", tag: "Main Admin" },
  { name: "Dilip", email: "dilip@gmail.com", mobile: "8369594271" },
  { name: "Ritesh", email: "ritesh@gmail.com", mobile: "9967047351" },
  { name: "Kaushik", email: "kaushik@gmail.com", mobile: "9833067656" },
  { name: "Manashvi", email: "manashvi@gmail.com", mobile: "8433843725" },
];

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=select admin, 2=auth
  const [direction, setDirection] = useState(1);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminInfo | null>(null);
  const [adminAvatars, setAdminAvatars] = useState<Record<string, string>>({});
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
  const [locationData, setLocationData] = useState<{lat: number, lng: number} | null>(null);

  // Fetch admin secret code from DB
  useEffect(() => {
    const fetchSecret = async () => {
      const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "admin_secret_code").maybeSingle();
      if (data?.value && (data.value as any).code) setAdminMasterSecret((data.value as any).code);
    };
    fetchSecret();
  }, []);

  // Fetch admin avatars from profiles
  useEffect(() => {
    const fetchAvatars = async () => {
      const avatars: Record<string, string> = {};
      for (const admin of ADMIN_LIST) {
      const { data } = await supabase.from("profiles" as any).select("avatar_url, full_name").eq("email", admin.email).maybeSingle() as any;
        if (data?.avatar_url) avatars[admin.email] = data.avatar_url;
      }
      setAdminAvatars(avatars);
    };
    fetchAvatars();
  }, []);

  // Request location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationGranted(true);
          setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => setLocationGranted(false),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(p => { if (p <= 1) { clearInterval(interval); return 0; } return p - 1; });
    }, 1000);
  };

  const setAdminSessionName = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
    const name = profile?.full_name || selectedAdmin?.name || "Admin";
    sessionStorage.setItem("admin_entered_name", name);
    sessionStorage.setItem("admin_action_name", name);
  };

  const handleSelectAdmin = (admin: AdminInfo) => {
    if (!locationGranted) {
      toast({ title: "Location Required", description: "Please allow location access to continue.", variant: "destructive" });
      navigator.geolocation?.getCurrentPosition(
        (pos) => { setLocationGranted(true); setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        () => toast({ title: "Location denied", description: "Location is mandatory for admin login.", variant: "destructive" }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return;
    }
    setSelectedAdmin(admin);
    setDirection(1);
    setStep(2);
    setPassword("");
    setSecretCode("");
    setOtpCode("");
    setOtpSent(false);
    setAuthMethod("password");
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedAdmin) return;

    if (authMethod === "password" && !password) {
      toast({ title: "Enter password", variant: "destructive" }); return;
    }
    if (authMethod === "secret_code" && secretCode.length !== 8) {
      toast({ title: "Enter 8-digit secret code", variant: "destructive" }); return;
    }
    if (authMethod === "otp" && !otpSent) {
      // Send OTP to main admin email
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: "akashxbhavans@gmail.com",
          options: { shouldCreateUser: false },
        });
        if (error) throw error;
        setOtpSent(true);
        startResendCooldown();
        toast({ title: "OTP Sent! 📧", description: "Check akashxbhavans@gmail.com for 6-digit code." });
      } catch (err: any) {
        toast({ title: "Failed to send OTP", description: err?.message, variant: "destructive" });
      } finally { setLoading(false); }
      return;
    }
    if (authMethod === "otp" && otpCode.length !== 6) {
      toast({ title: "Enter 6-digit OTP", variant: "destructive" }); return;
    }

    setLoading(true);
    try {
      if (authMethod === "secret_code") {
        const normalizedCode = secretCode.replace(/[-\s]/g, "");
        if (normalizedCode !== adminMasterSecret) {
          toast({ title: "Invalid secret code", variant: "destructive" }); setLoading(false); return;
        }
        // Login with secret code function
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
          body: { email: selectedAdmin.email, secret_code: secretCode.slice(0, 4) },
        });
        if (error || !data?.success) {
          // Fallback: try password-based if secret code func fails
          toast({ title: "Secret verified locally", description: "Proceeding..." });
          // Use magic link approach
          const { error: otpErr } = await supabase.auth.signInWithOtp({ email: selectedAdmin.email, options: { shouldCreateUser: false } });
          if (otpErr) throw otpErr;
          setAuthMethod("otp");
          setOtpSent(true);
          startResendCooldown();
          toast({ title: "OTP sent for verification", description: "Check akashxbhavans@gmail.com" });
          setLoading(false); return;
        }
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (verifyError) throw verifyError;
      } else if (authMethod === "otp") {
        // Verify OTP - sent to main admin email
        const { error } = await supabase.auth.verifyOtp({
          email: "akashxbhavans@gmail.com",
          token: otpCode,
          type: "email",
        });
        if (error) throw error;
        // If this isn't the main admin, sign out and sign in as the actual admin
        if (selectedAdmin.email !== "akashxbhavans@gmail.com") {
          await supabase.auth.signOut();
          // We need to use the secret code function to log in the actual admin
          toast({ title: "OTP verified! Signing in as " + selectedAdmin.name });
          const { data, error: scErr } = await supabase.functions.invoke("login-with-secret-code", {
            body: { email: selectedAdmin.email, secret_code: adminMasterSecret.slice(0, 4) },
          });
          if (scErr || !data?.success) throw new Error("Could not sign in as " + selectedAdmin.name);
          const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
          if (vErr) throw vErr;
        }
      } else {
        // Password login
        const { data: authData, error: authError } = await withTimeout(
          supabase.auth.signInWithPassword({ email: selectedAdmin.email, password })
        );
        if (authError || !authData.user) throw authError || new Error("Login failed");
      }

      // Verify admin role
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Auth failed");

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id) as any;
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "Not authorized for admin.", variant: "destructive" });
        setLoading(false); return;
      }

      await setAdminSessionName(userData.user.id);

      // Log location for security
      if (locationData) {
        try {
          await supabase.from("admin_sessions" as any).insert({
            user_id: userData.user.id,
            admin_name: selectedAdmin.name,
            entered_name: selectedAdmin.name,
            device_info: navigator.userAgent.slice(0, 200),
            ip_address: null,
            location_info: JSON.stringify(locationData),
            is_active: true,
          } as any);
        } catch {}
      }

      toast({ title: `Welcome back, ${selectedAdmin.name}! 🎉` });
      navigate("/admin-panel", { replace: true });
    } catch (err: any) {
      try {
        await supabase.from("admin_failed_logins" as any).insert({
          email: selectedAdmin.email, reason: "invalid_credentials",
          ip_address: null, device_info: navigator.userAgent.slice(0, 200),
        });
      } catch {}
      toast({ title: "Login Failed", description: err?.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙";
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 250 : -250, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -250 : 250, opacity: 0 }),
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-background">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(260 80% 60%), hsl(var(--primary)))" }}
          animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
        <motion.div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "conic-gradient(from 180deg, hsl(var(--accent)), hsl(var(--primary)), hsl(320 70% 55%), hsl(var(--accent)))" }}
          animate={{ rotate: [360, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} />
      </div>

      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

      {[...Array(6)].map((_, i) => (
        <motion.div key={i} className="absolute pointer-events-none"
          style={{ top: `${10 + (i * 14) % 80}%`, left: `${5 + (i * 16) % 90}%` }}
          animate={{ y: [0, -25 - i * 4, 0], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}>
          <div className="rounded-full bg-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
            style={{ width: `${6 + (i % 3) * 3}px`, height: `${6 + (i % 3) * 3}px` }} />
        </motion.div>
      ))}

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, type: "spring" }} className="w-full max-w-md relative z-10">

        <motion.div className="absolute -inset-1 rounded-[28px] opacity-40 blur-sm"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.4), hsl(var(--accent)/0.3))" }}
          animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />

        <div className="relative backdrop-blur-2xl bg-card/90 border border-border/40 rounded-3xl shadow-[0_25px_80px_-15px_hsl(var(--primary)/0.3)] p-8 space-y-6 overflow-hidden">
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(105deg, transparent 40%, hsl(var(--primary)/0.05) 45%, hsl(var(--primary)/0.08) 50%, hsl(var(--primary)/0.05) 55%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }} />

          {/* Header */}
          <div className="text-center space-y-3 relative">
            <motion.div className="mx-auto w-18 h-18 rounded-2xl overflow-hidden relative"
              animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
              whileHover={{ scale: 1.1, rotateY: 15 }}>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/50 to-accent/30 blur-sm" />
              <img src="/logo.png" alt="CCC" className="relative w-16 h-16 object-cover cursor-pointer rounded-2xl ring-2 ring-white/20" onClick={() => navigate("/")} />
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-foreground via-primary/80 to-foreground/60 bg-clip-text text-transparent">
                Admin Console
              </h1>
              <Sparkles className="w-4 h-4 text-primary/70" />
            </div>
            <p className="text-sm text-muted-foreground">{getGreeting()}</p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              {[1, 2].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? "w-12 bg-gradient-to-r from-primary to-accent" : s < step ? "w-8 bg-primary/40" : "w-8 bg-muted"
                }`} />
              ))}
            </div>

            {/* Location status */}
            <div className="flex items-center justify-center gap-1.5">
              <MapPin className={`w-3 h-3 ${locationGranted ? "text-green-500" : "text-destructive"}`} />
              <span className={`text-[10px] ${locationGranted ? "text-green-600" : "text-destructive"}`}>
                {locationGranted ? "Location verified" : "Location required"}
              </span>
            </div>
          </div>

          <div className="min-h-[280px] relative">
            <AnimatePresence mode="wait" custom={direction}>
              {/* STEP 1: Select Admin */}
              {step === 1 && (
                <motion.div key="step1" custom={direction} variants={slideVariants}
                  initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
                  className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground text-center">Select your profile</p>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {ADMIN_LIST.map((admin) => (
                      <motion.button key={admin.email}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectAdmin(admin)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-border/30 group-hover:ring-primary/30">
                          {adminAvatars[admin.email] ? (
                            <img src={adminAvatars[admin.email]} alt={admin.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-primary/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{admin.name}</p>
                            {admin.tag && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {admin.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Authentication */}
              {step === 2 && selectedAdmin && (
                <motion.div key="step2" custom={direction} variants={slideVariants}
                  initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Admin greeting card */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center py-4 px-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                      <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20 mb-2">
                        {adminAvatars[selectedAdmin.email] ? (
                          <img src={adminAvatars[selectedAdmin.email]} alt={selectedAdmin.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-7 h-7 text-primary/60" />
                        )}
                      </div>
                      <p className="text-base font-bold text-foreground">
                        👋 Hey {selectedAdmin.name}!
                      </p>
                      {selectedAdmin.tag && (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 mt-1">
                          {selectedAdmin.tag}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Choose your login method below</p>
                    </motion.div>

                    {/* Auth method selector */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { key: "password" as const, icon: Lock, label: "Password" },
                        { key: "secret_code" as const, icon: KeyRound, label: "Secret Code" },
                        { key: "otp" as const, icon: Mail, label: "OTP on Mail" },
                      ].map(m => (
                        <button key={m.key} type="button"
                          onClick={() => { setAuthMethod(m.key); setOtpSent(false); setOtpCode(""); setSecretCode(""); setPassword(""); }}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                            authMethod === m.key
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/30"
                          }`}>
                          <m.icon className="w-4 h-4" />
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Auth inputs */}
                    {authMethod === "password" && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground font-medium">Password</Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••" required
                            className="pl-10 pr-10 h-12 bg-background/60 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {authMethod === "secret_code" && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground font-medium">6-Digit Secret Code</Label>
                        <div className="relative group">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input type="password" value={secretCode}
                            onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 8) setSecretCode(d); }}
                            placeholder="• • • • • •" maxLength={8}
                            className="pl-10 h-12 bg-background/60 border-border/60 rounded-xl text-center text-xl tracking-[0.4em] font-bold focus:border-primary"
                            />
                        </div>
                      </div>
                    )}

                    {authMethod === "otp" && (
                      <div className="space-y-3">
                        {!otpSent ? (
                          <div className="text-center py-3 px-4 rounded-xl bg-muted/50 border border-border/60">
                            <Mail className="w-8 h-8 text-primary/60 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">
                              OTP will be sent to <strong className="text-foreground">akashxbhavans@gmail.com</strong>
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground font-medium">Enter 6-digit OTP</Label>
                              <p className="text-xs text-muted-foreground">Sent to akashxbhavans@gmail.com</p>
                              <Input value={otpCode}
                                onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                                placeholder="• • • • • •" maxLength={6}
                                className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-background/60 border-border/60 rounded-xl"
                                />
                            </div>
                            <div className="text-center">
                              <button type="button" onClick={async () => {
                                if (resendCooldown > 0) return;
                                try {
                                  await supabase.auth.signInWithOtp({ email: "akashxbhavans@gmail.com", options: { shouldCreateUser: false } });
                                  startResendCooldown();
                                  toast({ title: "OTP Resent ✅" });
                                } catch { toast({ title: "Failed to resend", variant: "destructive" }); }
                              }}
                                disabled={resendCooldown > 0}
                                className="text-sm text-primary hover:underline disabled:text-muted-foreground inline-flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3" />
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                      <Button type="submit" disabled={loading}
                        className="w-full h-12 rounded-xl text-base font-semibold shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.4)]">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {authMethod === "otp" && !otpSent ? "Sending OTP..." : "Verifying..."}
                        </> : authMethod === "otp" && !otpSent ? "Send OTP" : "Sign In"}
                      </Button>
                    </motion.div>

                    <Button type="button" variant="ghost"
                      onClick={() => { setDirection(-1); setStep(1); setSelectedAdmin(null); }}
                      className="w-full text-xs text-muted-foreground gap-1">
                      <ArrowLeft className="w-3 h-3" /> Back to admin list
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
      </motion.div>
    </div>
  );
};

export default AdminLogin;
