import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, Lock, Mail, KeyRound, RefreshCw, ArrowLeft, User, MapPin, Phone, Shield, Sparkles } from "lucide-react";

const withTimeout = async (promise: Promise<any>, ms = 10000) =>
  Promise.race([promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Request timed out.")), ms))]);

interface AdminInfo {
  name: string;
  email: string;
  mobile: string;
  designation: string;
}

const ADMIN_LIST: AdminInfo[] = [
  { name: "Akash", email: "akashxbhavans@gmail.com", mobile: "8421199205", designation: "Chief Strategy & Technology Officer" },
  { name: "Dilip", email: "dilip@gmail.com", mobile: "8369594271", designation: "Chief Operating Officer (COO)" },
  { name: "Ritesh", email: "ritesh@gmail.com", mobile: "9967047351", designation: "Founder & Chief Executive Officer (CEO)" },
  { name: "Kaushik", email: "kaushik@gmail.com", mobile: "9833067656", designation: "Senior Operations & Client Relations Manager" },
  { name: "Manashvi", email: "manashvi@gmail.com", mobile: "8433843725", designation: "Creative Director & Content Lead" },
];

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 3)}${"•".repeat(Math.max(local.length - 3, 2))}@${domain}`;
};
const maskMobile = (m: string) => `${m.slice(0, 2)}••••${m.slice(-2)}`;

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedAdminEmail, setSelectedAdminEmail] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminInfo | null>(null);
  const [adminAvatars, setAdminAvatars] = useState<Record<string, string>>({});
  const [verifyMethod, setVerifyMethod] = useState<"email" | "mobile">("email");
  const [verifyInput, setVerifyInput] = useState("");
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
  const [locationData, setLocationData] = useState<{ lat: number; lng: number } | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    const fetchSecret = async () => {
      const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "admin_secret_code").maybeSingle();
      if (data?.value && (data.value as any).code) setAdminMasterSecret((data.value as any).code);
    };
    fetchSecret();
  }, []);

  useEffect(() => {
    const fetchAvatars = async () => {
      const avatars: Record<string, string> = {};
      for (const admin of ADMIN_LIST) {
        const { data } = await supabase.from("profiles" as any).select("avatar_url").eq("email", admin.email).maybeSingle() as any;
        if (data?.avatar_url) avatars[admin.email] = data.avatar_url;
      }
      setAdminAvatars(avatars);
    };
    fetchAvatars();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocationGranted(true); setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => {
        setLocationGranted(false);
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { setLocationGranted(true); setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
            () => setLocationGranted(false),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }, 2000);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => { setResendCooldown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; }); }, 1000);
  };

  const handleProfileSelect = (email: string) => {
    if (!locationGranted) {
      toast({ title: "📍 Location Required", description: "Please allow location access to continue", variant: "destructive" });
      navigator.geolocation?.getCurrentPosition(
        (pos) => { setLocationGranted(true); setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        () => {}
      );
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

  const setAdminSessionName = async (userId: string) => {
    try {
      await supabase.from("admin_sessions" as any).update({ entered_name: selectedAdmin?.name || "Admin" } as any).eq("user_id", userId).eq("is_active", true);
    } catch {}
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedAdmin) return;
    if (authMethod === "password" && !password) { toast({ title: "Enter password", variant: "destructive" }); return; }
    if (authMethod === "secret_code") {
      const norm = secretCode.replace(/[-\s]/g, "");
      if (norm.length !== 8) { toast({ title: "Enter 8-digit secret code", variant: "destructive" }); return; }
      if (norm !== adminMasterSecret) {
        setFailedAttempts(p => p + 1);
        toast({ title: "Invalid secret code", variant: "destructive" }); return;
      }
    }
    if (failedAttempts >= 3 && authMethod !== "otp") { setAuthMethod("otp"); return; }
    if ((authMethod === "otp" || failedAttempts >= 3) && !otpSent) {
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
    if ((authMethod === "otp" || failedAttempts >= 3) && otpCode.length !== 6) { toast({ title: "Enter 6-digit OTP", variant: "destructive" }); return; }

    setLoading(true);
    try {
      if (authMethod === "otp" || failedAttempts >= 3) {
        const { error } = await supabase.auth.verifyOtp({ email: "akashxbhavans@gmail.com", token: otpCode, type: "email" });
        if (error) throw error;
        if (selectedAdmin.email !== "akashxbhavans@gmail.com") {
          await supabase.auth.signOut();
          const { data, error: scErr } = await supabase.functions.invoke("login-with-secret-code", {
            body: { email: selectedAdmin.email, secret_code: adminMasterSecret.slice(0, 4) },
          });
          if (scErr || !data?.success) throw new Error("Could not sign in as " + selectedAdmin.name);
          const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
          if (vErr) throw vErr;
        }
      } else if (authMethod === "secret_code") {
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
          body: { email: selectedAdmin.email, secret_code: secretCode.slice(0, 4) },
        });
        if (error || !data?.success) throw new Error("Secret code login failed");
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (vErr) throw vErr;
      } else {
        const { data: authData, error: authError } = await withTimeout(
          supabase.auth.signInWithPassword({ email: selectedAdmin.email, password })
        );
        if (authError || !authData.user) {
          setFailedAttempts(p => p + 1);
          throw authError || new Error("Login failed");
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Auth failed");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id) as any;
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", variant: "destructive" });
        setLoading(false);
        return;
      }
      await setAdminSessionName(userData.user.id);
      if (locationData) {
        try {
          await supabase.from("admin_sessions" as any).insert({
            user_id: userData.user.id, admin_name: selectedAdmin.name, entered_name: selectedAdmin.name,
            device_info: navigator.userAgent.slice(0, 200), location_info: JSON.stringify(locationData), is_active: true,
          } as any);
        } catch {}
      }
      setFailedAttempts(0);
      toast({ title: `Welcome back, ${selectedAdmin.name}! 🎉` });
      navigate("/admin-panel", { replace: true });
    } catch (err: any) {
      try {
        await supabase.from("admin_failed_logins" as any).insert({
          email: selectedAdmin.email, reason: "invalid_credentials", device_info: navigator.userAgent.slice(0, 200),
        });
      } catch {}
      toast({ title: "Login Failed", description: err?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙";
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0, scale: 0.9 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0, scale: 0.9 }),
  };

  const goBack = () => {
    setDirection(-1);
    if (step === 3) setStep(2);
    else if (step === 2) { setStep(1); setSelectedAdmin(null); setSelectedAdminEmail(""); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Vibrant animated background */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)", backgroundSize: "400% 400%" }}>
        <motion.div className="absolute inset-0" animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          style={{ background: "inherit", backgroundSize: "400% 400%" }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
      </div>

      {/* Floating 3D orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {[
          { size: 300, x: "-10%", y: "-15%", color: "rgba(255,255,255,0.08)", dur: 20 },
          { size: 250, x: "70%", y: "60%", color: "rgba(255,255,255,0.06)", dur: 25 },
          { size: 200, x: "40%", y: "-20%", color: "rgba(255,255,255,0.05)", dur: 18 },
          { size: 180, x: "80%", y: "10%", color: "rgba(255,255,255,0.07)", dur: 22 },
          { size: 120, x: "20%", y: "70%", color: "rgba(255,255,255,0.09)", dur: 16 },
        ].map((orb, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: orb.size, height: orb.size, left: orb.x, top: orb.y, background: orb.color, backdropFilter: "blur(40px)" }}
            animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }} />
        ))}
      </div>

      {/* Floating sparkles */}
      {[...Array(12)].map((_, i) => (
        <motion.div key={`sp-${i}`} className="absolute pointer-events-none"
          style={{ top: `${10 + (i * 7) % 80}%`, left: `${5 + (i * 13) % 90}%` }}
          animate={{ y: [0, -25, 0], opacity: [0, 0.8, 0], rotate: [0, 180, 360], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.5 }}>
          <Sparkles className="w-3 h-3 text-white/40" />
        </motion.div>
      ))}

      {/* Glass pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

      <motion.div initial={{ opacity: 0, y: 60, scale: 0.85, rotateX: 10 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.25 }} className="w-full max-w-md relative z-10" style={{ perspective: "1000px" }}>
        
        {/* Outer glow ring */}
        <motion.div className="absolute -inset-2 rounded-[32px] opacity-60 blur-xl"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1), rgba(255,255,255,0.3))" }}
          animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 3, repeat: Infinity }} />

        {/* Main glass card */}
        <div className="relative rounded-3xl overflow-hidden" style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(40px) saturate(180%)",
          boxShadow: "0 30px 80px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.4) inset, 0 -2px 6px rgba(0,0,0,0.05) inset"
        }}>
          
          {/* Animated shimmer */}
          <motion.div className="absolute inset-0 pointer-events-none z-20"
            style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.6) 60%, transparent 65%)" }}
            animate={{ x: ["-200%", "300%"] }} transition={{ duration: 5, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }} />

          {/* Top rainbow strip */}
          <motion.div className="h-1.5 w-full"
            style={{ background: "linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe, #667eea)", backgroundSize: "200% 100%" }}
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />

          <div className="relative p-8 space-y-6">
            {/* Logo + Header */}
            <div className="text-center space-y-4">
              <motion.div className="mx-auto w-20 h-20 relative"
                animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                {/* Logo glow */}
                <motion.div className="absolute -inset-3 rounded-2xl blur-lg"
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)" }}
                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }} />
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center shadow-2xl ring-2 ring-white/60">
                  <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")}
                    onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; t.parentElement!.innerHTML = '<div class="flex items-center justify-center w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-2xl">C</div>'; }} />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                    Admin Console
                  </h1>
                </div>
                <p className="text-sm text-gray-500 font-medium">{getGreeting()}</p>
              </motion.div>

              {/* Step indicators with animation */}
              <div className="flex items-center justify-center gap-3 mt-3">
                {[1, 2, 3].map(s => (
                  <motion.div key={s} className="relative" animate={s === step ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}>
                    <div className={`h-2 rounded-full transition-all duration-500 ${
                      s === step ? "w-12" : s < step ? "w-8" : "w-6"
                    }`} style={{
                      background: s === step ? "linear-gradient(90deg, #667eea, #764ba2, #f093fb)" : s < step ? "rgba(102,126,234,0.4)" : "#e2e8f0"
                    }} />
                    {s === step && (
                      <motion.div className="absolute inset-0 rounded-full blur-sm"
                        style={{ background: "linear-gradient(90deg, #667eea, #f093fb)" }}
                        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Location chip */}
              <motion.div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                locationGranted ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-500 border border-red-200"
              }`} animate={locationGranted ? {} : { scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <MapPin className="w-3 h-3" />
                {locationGranted ? "Location verified ✓" : "Location required"}
              </motion.div>

              {failedAttempts >= 2 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-xs text-red-500 font-semibold bg-red-50 rounded-xl px-4 py-2 border border-red-200">
                  ⚠️ {failedAttempts} failed attempts. {failedAttempts >= 3 ? "OTP required." : "1 more → OTP required."}
                </motion.div>
              )}
            </div>

            {/* Steps */}
            <div className="min-h-[280px] relative">
              <AnimatePresence mode="wait" custom={direction}>
                {/* STEP 1 */}
                {step === 1 && (
                  <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }} className="space-y-5">
                    <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-500" /> Select Your Profile
                    </Label>
                    <Select value={selectedAdminEmail} onValueChange={handleProfileSelect}>
                      <SelectTrigger className="h-14 rounded-2xl bg-gradient-to-r from-gray-50 to-indigo-50/30 border-gray-200/80 text-base hover:shadow-md transition-all">
                        <SelectValue placeholder="Choose admin profile..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 rounded-xl shadow-2xl">
                        {ADMIN_LIST.map(admin => (
                          <SelectItem key={admin.email} value={admin.email} className="rounded-lg hover:bg-indigo-50/50">
                            <div className="flex flex-col gap-0.5 py-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{admin.name}</span>
                                <span className="text-gray-400 text-xs">({maskEmail(admin.email)})</span>
                              </div>
                              <span className="text-[10px] font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{admin.designation}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 text-center font-medium">Select your profile to proceed securely</p>
                  </motion.div>
                )}

                {/* STEP 2 */}
                {step === 2 && selectedAdmin && (
                  <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }} className="space-y-4">
                    <motion.div className="text-center py-4 rounded-2xl border border-indigo-100"
                      style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.05), rgba(118,75,162,0.05), rgba(240,147,251,0.05))" }}>
                      <p className="text-lg font-bold text-gray-900">Hi {selectedAdmin.name}! 👋</p>
                      <p className="text-[11px] font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mt-0.5">{selectedAdmin.designation}</p>
                      <p className="text-xs text-gray-500 mt-1.5">Verify your identity to continue</p>
                    </motion.div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-gray-700">Authenticate With</Label>
                      <Select value={verifyMethod} onValueChange={(v) => { setVerifyMethod(v as "email" | "mobile"); setVerifyInput(""); }}>
                        <SelectTrigger className="h-12 rounded-xl bg-gray-50/80 border-gray-200/80 hover:shadow-sm transition-all">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl rounded-xl">
                          <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-indigo-500" /> Email Address</div></SelectItem>
                          <SelectItem value="mobile"><div className="flex items-center gap-2"><Phone className="w-4 h-4 text-indigo-500" /> Mobile Number</div></SelectItem>
                        </SelectContent>
                      </Select>

                      <div>
                        <Label className="text-xs text-gray-500 font-medium">
                          Enter {verifyMethod} <span className="opacity-60">(hint: {verifyMethod === "email" ? maskEmail(selectedAdmin.email) : maskMobile(selectedAdmin.mobile)})</span>
                        </Label>
                        <div className="relative mt-1.5">
                          {verifyMethod === "email" ? <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" /> : <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />}
                          <Input type={verifyMethod === "email" ? "email" : "tel"} value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)}
                            placeholder={verifyMethod === "email" ? "Enter your email" : "Enter your mobile"}
                            className="pl-11 h-13 bg-gray-50/80 border-gray-200/80 rounded-xl focus:ring-2 focus:ring-indigo-300 transition-all"
                            onKeyDown={(e) => e.key === "Enter" && handleVerifyIdentity()} />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleVerifyIdentity} className="w-full h-12 rounded-xl font-bold text-white border-0 shadow-lg hover:shadow-xl transition-all"
                      style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                      Verify & Continue →
                    </Button>
                    <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs text-gray-400 gap-1 hover:text-indigo-500">
                      <ArrowLeft className="w-3 h-3" /> Back
                    </Button>
                  </motion.div>
                )}

                {/* STEP 3 */}
                {step === 3 && selectedAdmin && (
                  <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <motion.div className="text-center py-5 rounded-2xl border border-indigo-100"
                        style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.05), rgba(118,75,162,0.05), rgba(240,147,251,0.05))" }}>
                        <motion.div className="w-18 h-18 mx-auto rounded-full overflow-hidden mb-3 relative"
                          style={{ width: 72, height: 72 }}
                          animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                          <div className="absolute -inset-1 rounded-full blur-sm" style={{ background: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)" }} />
                          <div className="relative w-full h-full rounded-full overflow-hidden ring-3 ring-white shadow-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #e0e7ff, #ede9fe)" }}>
                            {adminAvatars[selectedAdmin.email] ? (
                              <img src={adminAvatars[selectedAdmin.email]} alt={selectedAdmin.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-8 h-8 text-indigo-400" />
                            )}
                          </div>
                        </motion.div>
                        <p className="text-lg font-black text-gray-900">Welcome, {selectedAdmin.name}! 🎉</p>
                        <span className="inline-block text-[10px] font-bold px-3 py-1 rounded-full mt-1.5 text-white"
                          style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                          {selectedAdmin.designation}
                        </span>
                      </motion.div>

                      {/* Auth method selector */}
                      <div className={`grid ${failedAttempts >= 3 ? "grid-cols-1" : "grid-cols-3"} gap-2`}>
                        {failedAttempts >= 3 ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="text-center py-3 px-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-semibold">
                            🔒 OTP verification required
                          </motion.div>
                        ) : ([
                          { key: "password" as const, icon: Lock, label: "Password", gradient: "from-indigo-500 to-blue-500" },
                          { key: "secret_code" as const, icon: KeyRound, label: "Secret Code", gradient: "from-purple-500 to-violet-500" },
                          { key: "otp" as const, icon: Mail, label: "Email OTP", gradient: "from-pink-500 to-rose-500" },
                        ]).map(m => (
                          <motion.button key={m.key} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setAuthMethod(m.key); setOtpSent(false); setOtpCode(""); setSecretCode(""); setPassword(""); }}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                              authMethod === m.key
                                ? "border-transparent text-white shadow-lg"
                                : "border-gray-200 bg-gray-50 text-gray-500 hover:border-indigo-200"
                            }`}
                            style={authMethod === m.key ? { background: `linear-gradient(135deg, var(--tw-gradient-stops))`, backgroundImage: `linear-gradient(135deg, ${m.gradient.split(" ").filter(s => s.startsWith("from-") || s.startsWith("to-")).map(s => { const c = s.replace("from-", "").replace("to-", ""); return c; }).join(", ")})` } : {}}
                            {...(authMethod === m.key ? { style: { background: m.key === "password" ? "linear-gradient(135deg, #667eea, #4f46e5)" : m.key === "secret_code" ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "linear-gradient(135deg, #ec4899, #f43f5e)" } } : {})}>
                            <m.icon className="w-4 h-4" /> {m.label}
                          </motion.button>
                        ))}
                      </div>

                      {authMethod === "password" && failedAttempts < 3 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          <Label className="text-sm text-gray-600 font-bold">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••" className="pl-11 pr-11 h-13 bg-gray-50/80 border-gray-200/80 rounded-xl" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition-colors">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {authMethod === "secret_code" && failedAttempts < 3 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          <Label className="text-sm text-gray-600 font-bold">8-Digit Secret Code</Label>
                          <Input type="password" value={secretCode}
                            onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 8) setSecretCode(d); }}
                            placeholder="• • • • • • • •" maxLength={8}
                            className="h-14 bg-gray-50/80 border-gray-200/80 rounded-xl text-center text-2xl tracking-[0.4em] font-black" />
                        </motion.div>
                      )}

                      {(authMethod === "otp" || failedAttempts >= 3) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          {!otpSent ? (
                            <div className="text-center py-4 rounded-xl border border-indigo-100" style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.03), rgba(240,147,251,0.03))" }}>
                              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                                <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                              </motion.div>
                              <p className="text-xs text-gray-500">OTP will be sent to</p>
                              <p className="text-sm font-bold text-gray-900 mt-0.5">akashxbhavans@gmail.com</p>
                            </div>
                          ) : (
                            <>
                              <Label className="text-sm text-gray-600 font-bold">Enter 6-digit OTP</Label>
                              <Input value={otpCode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                                placeholder="• • • • • •" maxLength={6}
                                className="h-16 text-center text-3xl tracking-[0.5em] font-black bg-gray-50/80 border-gray-200/80 rounded-xl" />
                              <button type="button" disabled={resendCooldown > 0}
                                onClick={async () => { await supabase.auth.signInWithOtp({ email: "akashxbhavans@gmail.com", options: { shouldCreateUser: false } }); startResendCooldown(); }}
                                className="text-sm text-indigo-600 hover:underline disabled:text-gray-400 flex items-center gap-1 mx-auto font-semibold">
                                <RefreshCw className="w-3 h-3" /> {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}

                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button type="submit" disabled={loading} className="w-full h-13 rounded-xl text-base font-black text-white border-0 shadow-xl hover:shadow-2xl transition-all"
                          style={{ background: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)", backgroundSize: "200% 100%" }}>
                          {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{(authMethod === "otp" || failedAttempts >= 3) && !otpSent ? "Sending OTP..." : "Verifying..."}</> :
                            (authMethod === "otp" || failedAttempts >= 3) && !otpSent ? "Send OTP →" : "Sign In →"}
                        </Button>
                      </motion.div>
                      <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs text-gray-400 gap-1 hover:text-indigo-500">
                        <ArrowLeft className="w-3 h-3" /> Back
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center">
              <button onClick={() => navigate("/")} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors font-medium">← Back to Home</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
