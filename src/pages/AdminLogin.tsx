import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, Lock, Mail, KeyRound, RefreshCw, ArrowLeft, User, MapPin, Phone } from "lucide-react";

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
      toast({ title: "📍 Location Required", description: "Allow location access to continue.", variant: "destructive" });
      navigator.geolocation?.getCurrentPosition(
        (pos) => { setLocationGranted(true); setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        () => {}
      );
      return;
    }
    setSelectedAdminEmail(email);
    const admin = ADMIN_LIST.find(a => a.email === email);
    if (admin) {
      setSelectedAdmin(admin);
      setVerifyInput("");
      setVerifyMethod("email");
      setDirection(1);
      setStep(2);
    }
  };

  const handleVerifyIdentity = () => {
    if (!selectedAdmin || !verifyInput.trim()) {
      toast({ title: "Please enter your " + verifyMethod, variant: "destructive" });
      return;
    }
    const match = verifyMethod === "email"
      ? verifyInput.toLowerCase() === selectedAdmin.email.toLowerCase()
      : verifyInput.replace(/\s/g, "") === selectedAdmin.mobile;
    if (!match) {
      toast({ title: "Identity not matched", variant: "destructive" });
      return;
    }
    setDirection(1);
    setStep(3);
    setPassword("");
    setSecretCode("");
    setOtpCode("");
    setOtpSent(false);
    setAuthMethod("password");
  };

  const setAdminSessionName = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
    const name = profile?.full_name || selectedAdmin?.name || "Admin";
    sessionStorage.setItem("admin_entered_name", name);
    sessionStorage.setItem("admin_action_name", name);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedAdmin) return;

    // If 3+ failed attempts, force OTP
    if (failedAttempts >= 3 && authMethod !== "otp") {
      toast({ title: "Too many failed attempts", description: "OTP verification is now required.", variant: "destructive" });
      setAuthMethod("otp");
      return;
    }

    if (authMethod === "password" && !password) { toast({ title: "Enter password", variant: "destructive" }); return; }
    if (authMethod === "secret_code" && secretCode.length !== 8) { toast({ title: "Enter 8-digit secret code", variant: "destructive" }); return; }

    // OTP flow - send OTP first
    if (authMethod === "otp" && !otpSent) {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({ email: "akashxbhavans@gmail.com", options: { shouldCreateUser: false } });
        if (error) throw error;
        setOtpSent(true);
        startResendCooldown();
        toast({ title: "OTP Sent! 📧", description: "Check akashxbhavans@gmail.com" });
      } catch (err: any) {
        toast({ title: "Failed", description: err?.message, variant: "destructive" });
      } finally { setLoading(false); }
      return;
    }
    if (authMethod === "otp" && otpCode.length !== 6) { toast({ title: "Enter 6-digit OTP", variant: "destructive" }); return; }

    setLoading(true);
    try {
      if (authMethod === "secret_code") {
        const norm = secretCode.replace(/[-\s]/g, "");
        if (norm !== adminMasterSecret) {
          setFailedAttempts(p => p + 1);
          toast({ title: "Invalid secret code", variant: "destructive" });
          setLoading(false);
          return;
        }
        // Secret code matched - login directly
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
          body: { email: selectedAdmin.email, secret_code: secretCode.slice(0, 4) },
        });
        if (error || !data?.success) throw new Error("Secret code login failed");
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (vErr) throw vErr;
      } else if (authMethod === "otp") {
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
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  const goBack = () => {
    setDirection(-1);
    if (step === 3) setStep(2);
    else if (step === 2) { setStep(1); setSelectedAdmin(null); setSelectedAdminEmail(""); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #f1f5f9 60%, #e0e7ff 100%)" }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-1/3 -left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.12] blur-[120px]"
          style={{ background: "radial-gradient(circle, #818cf8, #c084fc, #f0abfc)" }}
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0] }} transition={{ duration: 12, repeat: Infinity }} />
        <motion.div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[100px]"
          style={{ background: "radial-gradient(circle, #67e8f9, #a78bfa, #f472b6)" }}
          animate={{ scale: [1, 1.1, 1], y: [0, -20, 0] }} transition={{ duration: 15, repeat: Infinity }} />
      </div>

      {/* Dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div key={i} className="absolute pointer-events-none rounded-full"
          style={{ top: `${15 + i * 15}%`, left: `${8 + i * 18}%`, width: `${5 + i % 3 * 2}px`, height: `${5 + i % 3 * 2}px`, background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.4 }} />
      ))}

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, type: "spring", bounce: 0.3 }} className="w-full max-w-md relative z-10">
        
        {/* 3D card glow */}
        <div className="absolute -inset-1 rounded-[28px] opacity-30 blur-md" style={{ background: "linear-gradient(135deg, #818cf8, #c084fc, #f0abfc)" }} />

        {/* Main card - white vibrant 3D */}
        <div className="relative bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 25px 60px -12px rgba(99, 102, 241, 0.25), 0 12px 30px -8px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
          
          {/* Shimmer effect */}
          <motion.div className="absolute inset-0 pointer-events-none z-10"
            style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 4 }} />

          {/* Top gradient strip */}
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #818cf8, #c084fc, #f472b6, #fb923c)" }} />

          <div className="relative p-8 space-y-6">
            {/* Logo + Header */}
            <div className="text-center space-y-3">
              <motion.div className="mx-auto w-[72px] h-[72px] relative" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <div className="absolute -inset-1.5 rounded-2xl opacity-50 blur-sm" style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }} />
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center" style={{ boxShadow: "0 8px 25px -5px rgba(99,102,241,0.3)" }}>
                  <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              </motion.div>

              <div>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Admin Console</h1>
                <p className="text-sm text-gray-500 mt-0.5">{getGreeting()}</p>
              </div>

              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2 mt-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? "w-10" : s < step ? "w-6" : "w-6"
                  }`} style={{
                    background: s === step ? "linear-gradient(90deg, #818cf8, #c084fc)" : s < step ? "rgba(129,140,248,0.4)" : "#e2e8f0"
                  }} />
                ))}
              </div>

              {/* Location status */}
              <div className="flex items-center justify-center gap-1.5">
                <MapPin className={`w-3 h-3 ${locationGranted ? "text-emerald-500" : "text-red-400"}`} />
                <span className={`text-[10px] font-medium ${locationGranted ? "text-emerald-600" : "text-red-500"}`}>
                  {locationGranted ? "Location verified" : "Location required"}
                </span>
              </div>

              {/* Failed attempts warning */}
              {failedAttempts >= 2 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-xs text-red-500 font-medium bg-red-50 rounded-lg px-3 py-1.5">
                  ⚠️ {failedAttempts} failed attempt{failedAttempts > 1 ? "s" : ""}. {failedAttempts >= 3 ? "OTP required." : "1 more and OTP will be required."}
                </motion.div>
              )}
            </div>

            {/* Steps */}
            <div className="min-h-[280px] relative">
              <AnimatePresence mode="wait" custom={direction}>
                {/* STEP 1: Profile Selection */}
                {step === 1 && (
                  <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                    <Label className="text-sm font-semibold text-gray-600">Select Your Profile</Label>
                    <Select value={selectedAdminEmail} onValueChange={handleProfileSelect}>
                      <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200 text-base hover:bg-gray-100 transition-colors">
                        <SelectValue placeholder="Choose admin profile..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {ADMIN_LIST.map(admin => (
                          <SelectItem key={admin.email} value={admin.email}>
                            <div className="flex flex-col gap-0.5 py-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{admin.name}</span>
                                <span className="text-gray-400 text-xs">({maskEmail(admin.email)})</span>
                              </div>
                              <span className="text-[10px] text-indigo-600 font-medium">{admin.designation}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 text-center">Select your profile to proceed</p>
                  </motion.div>
                )}

                {/* STEP 2: Verify Identity */}
                {step === 2 && selectedAdmin && (
                  <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                    <div className="text-center py-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                      <p className="text-sm font-bold text-gray-900">Hi {selectedAdmin.name}! 👋</p>
                      <p className="text-[10px] text-indigo-600 font-medium mt-0.5">{selectedAdmin.designation}</p>
                      <p className="text-xs text-gray-500 mt-1">Verify your identity to continue</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-600">Authenticate With</Label>
                      <Select value={verifyMethod} onValueChange={(v) => { setVerifyMethod(v as "email" | "mobile"); setVerifyInput(""); }}>
                        <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email Address</div></SelectItem>
                          <SelectItem value="mobile"><div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Mobile Number</div></SelectItem>
                        </SelectContent>
                      </Select>

                      <div>
                        <Label className="text-xs text-gray-500">
                          Enter {verifyMethod} <span className="opacity-60">(hint: {verifyMethod === "email" ? maskEmail(selectedAdmin.email) : maskMobile(selectedAdmin.mobile)})</span>
                        </Label>
                        <div className="relative mt-1.5">
                          {verifyMethod === "email" ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /> : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
                          <Input type={verifyMethod === "email" ? "email" : "tel"} value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)}
                            placeholder={verifyMethod === "email" ? "Enter email" : "Enter mobile"}
                            className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl"
                            onKeyDown={(e) => e.key === "Enter" && handleVerifyIdentity()} />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleVerifyIdentity} className="w-full h-11 rounded-xl font-semibold text-white" style={{ background: "linear-gradient(135deg, #818cf8, #a78bfa)" }}>
                      Verify & Continue
                    </Button>
                    <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs text-gray-400 gap-1"><ArrowLeft className="w-3 h-3" /> Back</Button>
                  </motion.div>
                )}

                {/* STEP 3: Login */}
                {step === 3 && selectedAdmin && (
                  <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="text-center py-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                        <div className="w-16 h-16 mx-auto rounded-full overflow-hidden ring-2 ring-indigo-200 mb-2 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e0e7ff, #ede9fe)" }}>
                          {adminAvatars[selectedAdmin.email] ? (
                            <img src={adminAvatars[selectedAdmin.email]} alt={selectedAdmin.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 text-indigo-400" />
                          )}
                        </div>
                        <p className="text-base font-bold text-gray-900">Welcome, {selectedAdmin.name}! 🎉</p>
                        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1 text-indigo-700" style={{ background: "linear-gradient(135deg, #e0e7ff, #ede9fe)" }}>
                          {selectedAdmin.designation}
                        </span>
                      </div>

                      {/* Auth method selector - hide OTP unless forced */}
                      <div className={`grid ${failedAttempts >= 3 ? "grid-cols-1" : "grid-cols-3"} gap-1.5`}>
                        {failedAttempts >= 3 ? (
                          <div className="text-center py-2 px-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                            🔒 OTP verification required due to failed attempts
                          </div>
                        ) : ([
                          { key: "password" as const, icon: Lock, label: "Password" },
                          { key: "secret_code" as const, icon: KeyRound, label: "Secret Code" },
                          { key: "otp" as const, icon: Mail, label: "OTP" },
                        ]).map(m => (
                          <button key={m.key} type="button"
                            onClick={() => { setAuthMethod(m.key); setOtpSent(false); setOtpCode(""); setSecretCode(""); setPassword(""); }}
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              authMethod === m.key ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-indigo-200"
                            }`}>
                            <m.icon className="w-4 h-4" /> {m.label}
                          </button>
                        ))}
                      </div>

                      {authMethod === "password" && failedAttempts < 3 && (
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600 font-medium">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••" className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 rounded-xl" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {authMethod === "secret_code" && failedAttempts < 3 && (
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600 font-medium">8-Digit Secret Code</Label>
                          <Input type="password" value={secretCode}
                            onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 8) setSecretCode(d); }}
                            placeholder="• • • • • • • •" maxLength={8}
                            className="h-12 bg-gray-50 border-gray-200 rounded-xl text-center text-xl tracking-[0.4em] font-bold" />
                        </div>
                      )}

                      {(authMethod === "otp" || failedAttempts >= 3) && (
                        <div className="space-y-3">
                          {!otpSent ? (
                            <div className="text-center py-3 rounded-xl bg-gray-50 border border-gray-200">
                              <Mail className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">OTP → <strong className="text-gray-900">akashxbhavans@gmail.com</strong></p>
                            </div>
                          ) : (
                            <>
                              <Label className="text-sm text-gray-600 font-medium">Enter 6-digit OTP</Label>
                              <Input value={otpCode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                                placeholder="• • • • • •" maxLength={6}
                                className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-gray-50 border-gray-200 rounded-xl" />
                              <button type="button" disabled={resendCooldown > 0}
                                onClick={async () => { await supabase.auth.signInWithOtp({ email: "akashxbhavans@gmail.com", options: { shouldCreateUser: false } }); startResendCooldown(); }}
                                className="text-sm text-indigo-600 hover:underline disabled:text-gray-400 flex items-center gap-1 mx-auto">
                                <RefreshCw className="w-3 h-3" /> {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold text-white border-0"
                        style={{ background: "linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)", boxShadow: "0 4px 15px -3px rgba(129,140,248,0.4)" }}>
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{(authMethod === "otp" || failedAttempts >= 3) && !otpSent ? "Sending OTP..." : "Verifying..."}</> :
                          (authMethod === "otp" || failedAttempts >= 3) && !otpSent ? "Send OTP" : "Sign In"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs text-gray-400 gap-1">
                        <ArrowLeft className="w-3 h-3" /> Back
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center">
              <button onClick={() => navigate("/")} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">← Back to Home</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
