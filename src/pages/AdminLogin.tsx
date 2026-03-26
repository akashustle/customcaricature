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
  emoji: string;
}

const ADMIN_LIST: AdminInfo[] = [
  { name: "Akash", email: "akashxbhavans@gmail.com", mobile: "8421199205", designation: "Chief Strategy & Technology Officer", emoji: "🧠" },
  { name: "Dilip", email: "dilip@gmail.com", mobile: "8369594271", designation: "Chief Operating Officer (COO)", emoji: "⚙️" },
  { name: "Ritesh", email: "ritesh@gmail.com", mobile: "9967047351", designation: "Founder & Chief Executive Officer (CEO)", emoji: "👑" },
  { name: "Kaushik", email: "kaushik@gmail.com", mobile: "9833067656", designation: "Senior Operations & Client Relations Manager", emoji: "🤝" },
  { name: "Manashvi", email: "manashvi@gmail.com", mobile: "8433843725", designation: "Creative Director & Content Lead", emoji: "🎨" },
];

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 3)}${"•".repeat(Math.max(local.length - 3, 2))}@${domain}`;
};
const maskMobile = (m: string) => `${m.slice(0, 2)}••••${m.slice(-2)}`;

// Vibrant blue-teal palette for a fresh modern look
const BRAND = {
  primary: "#1E3A5F",      // deep navy
  accent: "#0EA5E9",       // vivid sky blue
  light: "#BAE6FD",        // light sky
  highlight: "#38BDF8",    // bright blue
  cream: "#F0F9FF",        // ice blue white
};

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
      const emails = ADMIN_LIST.map(a => a.email);
      const { data } = await supabase.from("profiles").select("email, avatar_url").in("email", emails);
      if (data) {
        (data as any[]).forEach((p: any) => {
          if (p.avatar_url) avatars[p.email] = p.avatar_url;
        });
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
    }
    if (failedAttempts >= 3 && authMethod !== "otp") { setAuthMethod("otp"); return; }
    if ((authMethod === "otp" || failedAttempts >= 3) && !otpSent) {
      setLoading(true);
      try {
        // Generate a 4-digit OTP and store it via edge function
        const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
        const { data, error } = await supabase.functions.invoke("send-otp-email", {
          body: { to: "akashxbhavans@gmail.com", otp: generatedOtp, admin_email: selectedAdmin.email },
        });
        if (error) throw error;
        setOtpSent(true); startResendCooldown();
        toast({ title: "OTP Generated! 🔑", description: "Check with main admin for the 4-digit OTP code" });
      } catch (err: any) { toast({ title: "Failed", description: err?.message, variant: "destructive" }); }
      finally { setLoading(false); }
      return;
    }
    if ((authMethod === "otp" || failedAttempts >= 3) && otpCode.length !== 4) { toast({ title: "Enter 4-digit OTP", variant: "destructive" }); return; }

    setLoading(true);
    try {
      if (authMethod === "otp" || failedAttempts >= 3) {
        // Verify OTP against admin_login_tracking table
        const { data: trackData } = await supabase.from("admin_login_tracking" as any)
          .select("otp_code, otp_expires_at")
          .eq("user_id", (await supabase.from("profiles").select("user_id").eq("email", selectedAdmin.email).maybeSingle()).data?.user_id || "")
          .maybeSingle() as any;
        
        if (!trackData || trackData.otp_code !== otpCode || new Date(trackData.otp_expires_at) < new Date()) {
          throw new Error("Invalid or expired OTP");
        }
        // OTP verified, now login via secret code mechanism
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
          body: { email: selectedAdmin.email, secret_code: adminMasterSecret },
        });
        if (error || !data?.success) throw new Error(data?.error || "Login failed after OTP verification");
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (vErr) throw vErr;
      } else if (authMethod === "secret_code") {
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
          body: { email: selectedAdmin.email, secret_code: secretCode.replace(/[-\s]/g, "") },
        });
        if (error || !data?.success) {
          setFailedAttempts(p => p + 1);
          throw new Error(data?.error || "Secret code login failed");
        }
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, #FFFFFF 0%, ${BRAND.cream} 40%, #FFF5EB 70%, #FFFFFF 100%)` }}>

      {/* Soft floating brand-colored shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {[
          { size: 350, x: "-8%", y: "-12%", color: `${BRAND.light}40`, dur: 22 },
          { size: 280, x: "72%", y: "58%", color: `${BRAND.accent}15`, dur: 28 },
          { size: 220, x: "42%", y: "-18%", color: `${BRAND.highlight}12`, dur: 20 },
          { size: 200, x: "82%", y: "8%", color: `${BRAND.light}25`, dur: 25 },
          { size: 160, x: "15%", y: "72%", color: `${BRAND.accent}10`, dur: 18 },
        ].map((orb, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: orb.size, height: orb.size, left: orb.x, top: orb.y, background: orb.color, filter: "blur(60px)" }}
            animate={{ y: [0, -20, 0], x: [0, 10, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }} />
        ))}
      </div>

      {/* Floating sparkles in brand color */}
      {[...Array(8)].map((_, i) => (
        <motion.div key={`sp-${i}`} className="absolute pointer-events-none"
          style={{ top: `${12 + (i * 9) % 76}%`, left: `${8 + (i * 14) % 84}%` }}
          animate={{ y: [0, -20, 0], opacity: [0, 0.5, 0], rotate: [0, 180, 360], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 4 + i * 0.4, repeat: Infinity, delay: i * 0.6 }}>
          <Sparkles className="w-3 h-3" style={{ color: BRAND.accent }} />
        </motion.div>
      ))}

      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle, ${BRAND.primary} 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />

      <motion.div initial={{ opacity: 0, y: 50, scale: 0.88, rotateX: 8 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.2 }} className="w-full max-w-md relative z-10" style={{ perspective: "1200px" }}>

        {/* Outer warm glow */}
        <motion.div className="absolute -inset-3 rounded-[32px] blur-2xl"
          style={{ background: `linear-gradient(135deg, ${BRAND.light}60, ${BRAND.accent}20, ${BRAND.light}40)` }}
          animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />

        {/* Main white card with 3D effect */}
        <motion.div className="relative rounded-3xl overflow-hidden"
          whileHover={{ rotateY: 1, rotateX: -1 }}
          transition={{ type: "spring", stiffness: 200 }}
          style={{
            background: "#FFFFFF",
            boxShadow: `0 25px 60px -12px ${BRAND.primary}15, 0 12px 30px -8px ${BRAND.accent}10, 0 0 0 1px ${BRAND.light}80 inset, 0 -2px 8px ${BRAND.light}40 inset`,
            transformStyle: "preserve-3d",
          }}>

          {/* Shimmer effect */}
          <motion.div className="absolute inset-0 pointer-events-none z-20"
            style={{ background: `linear-gradient(105deg, transparent 35%, ${BRAND.cream}90 42%, #FFFFFF 50%, ${BRAND.cream}90 58%, transparent 65%)` }}
            animate={{ x: ["-200%", "300%"] }} transition={{ duration: 6, repeat: Infinity, repeatDelay: 6, ease: "easeInOut" }} />

          {/* Top brand gradient strip */}
          <motion.div className="h-1.5 w-full"
            style={{ background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight}, ${BRAND.accent}, ${BRAND.primary})`, backgroundSize: "200% 100%" }}
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />

          <div className="relative p-8 space-y-6">
            {/* Logo + Header */}
            <div className="text-center space-y-4">
              <motion.div className="mx-auto w-20 h-20 relative"
                animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                {/* Logo glow in brand color */}
                <motion.div className="absolute -inset-3 rounded-2xl blur-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND.accent}40, ${BRAND.highlight}30, ${BRAND.light}50)` }}
                  animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity }} />
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center shadow-xl"
                  style={{ boxShadow: `0 8px 25px -5px ${BRAND.accent}30, 0 0 0 2px ${BRAND.light}` }}>
                  <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")}
                    onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; t.parentElement!.innerHTML = `<div class="flex items-center justify-center w-full h-full text-2xl font-black" style="background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}); color: white;">C</div>`; }} />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="w-5 h-5" style={{ color: BRAND.accent }} />
                  <h1 className="text-2xl font-black" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Admin Console
                  </h1>
                </div>
                <p className="text-sm font-medium" style={{ color: "#64748B" }}>{getGreeting()}</p>
              </motion.div>

              {/* Step indicators */}
              <div className="flex items-center justify-center gap-3 mt-3">
                {[1, 2, 3].map(s => (
                  <motion.div key={s} className="relative" animate={s === step ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}>
                    <div className={`h-2 rounded-full transition-all duration-500 ${s === step ? "w-12" : s < step ? "w-8" : "w-6"}`}
                      style={{ background: s === step ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})` : s < step ? `${BRAND.accent}50` : "#CBD5E1" }} />
                    {s === step && (
                      <motion.div className="absolute inset-0 rounded-full blur-sm"
                        style={{ background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.highlight})` }}
                        animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
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
                    <Label className="text-sm font-bold flex items-center gap-2" style={{ color: BRAND.primary }}>
                      <User className="w-4 h-4" style={{ color: BRAND.accent }} /> Select Your Profile
                    </Label>
                    <Select value={selectedAdminEmail} onValueChange={handleProfileSelect}>
                      <SelectTrigger className="h-14 rounded-2xl text-base transition-all border"
                        style={{ background: `linear-gradient(135deg, #FFFFFF, ${BRAND.cream})`, borderColor: BRAND.light }}>
                        <SelectValue placeholder="Choose admin profile..." />
                      </SelectTrigger>
                      <SelectContent className="border rounded-xl shadow-2xl overflow-hidden" style={{ borderColor: BRAND.light, background: '#FFFFFF' }}>
                        {ADMIN_LIST.map(admin => (
                          <SelectItem key={admin.email} value={admin.email}
                            className="rounded-lg cursor-pointer transition-all duration-200 focus:!bg-[#F0F9FF] focus:!text-[#1E3A5F] hover:!bg-[#F0F9FF] data-[highlighted]:!bg-[#F0F9FF] data-[highlighted]:!text-[#1E3A5F]"
                            style={{ color: BRAND.primary }}>
                            <div className="flex items-center gap-3 py-1">
                              {adminAvatars[admin.email] ? (
                                <img src={adminAvatars[admin.email]} alt={admin.name} className="w-8 h-8 rounded-full object-cover border-2" style={{ borderColor: BRAND.light }} />
                              ) : (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                                  {admin.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold" style={{ color: BRAND.primary }}>{admin.name}</span>
                                  <span className="text-xs" style={{ color: "#94A3B8" }}>({maskEmail(admin.email)})</span>
                                </div>
                                <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: BRAND.accent }}>{admin.emoji} {admin.designation}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-center font-medium" style={{ color: "#94A3B8" }}>Select your profile to proceed securely</p>
                  </motion.div>
                )}

                {/* STEP 2 */}
                {step === 2 && selectedAdmin && (
                  <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }} className="space-y-4">
                    <motion.div className="text-center py-4 rounded-2xl border"
                      style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFFFFF, ${BRAND.cream})`, borderColor: BRAND.light }}>
                      <motion.div className="mx-auto mb-2 rounded-full overflow-hidden relative"
                        style={{ width: 64, height: 64 }} animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                        <div className="absolute -inset-1 rounded-full blur-sm" style={{ background: `linear-gradient(135deg, ${BRAND.accent}40, ${BRAND.highlight}30)` }} />
                        <div className="relative w-full h-full rounded-full overflow-hidden shadow-lg flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFF)`, boxShadow: `0 0 0 3px white, 0 4px 12px ${BRAND.accent}20` }}>
                          {adminAvatars[selectedAdmin.email] ? (
                            <img src={adminAvatars[selectedAdmin.email]} alt={selectedAdmin.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-black text-white" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>{selectedAdmin.name.charAt(0)}</div>
                          )}
                        </div>
                      </motion.div>
                      <p className="text-lg font-bold" style={{ color: BRAND.primary }}>Hi {selectedAdmin.name}! 👋</p>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: BRAND.accent }}>{selectedAdmin.emoji} {selectedAdmin.designation}</p>
                      <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>Verify your identity to continue</p>
                    </motion.div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>Authenticate With</Label>
                      <Select value={verifyMethod} onValueChange={(v) => { setVerifyMethod(v as "email" | "mobile"); setVerifyInput(""); }}>
                        <SelectTrigger className="h-12 rounded-xl border transition-all"
                          style={{ background: BRAND.cream, borderColor: BRAND.light }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl" style={{ background: '#FFFFFF', borderColor: BRAND.light }}>
                          <SelectItem value="email" className="rounded-lg cursor-pointer focus:!bg-[#F0F9FF] focus:!text-[#1E3A5F] data-[highlighted]:!bg-[#F0F9FF]"><div className="flex items-center gap-2"><Mail className="w-4 h-4" style={{ color: BRAND.accent }} /> Email Address</div></SelectItem>
                          <SelectItem value="mobile" className="rounded-lg cursor-pointer focus:!bg-[#F0F9FF] focus:!text-[#1E3A5F] data-[highlighted]:!bg-[#F0F9FF]"><div className="flex items-center gap-2"><Phone className="w-4 h-4" style={{ color: BRAND.accent }} /> Mobile Number</div></SelectItem>
                        </SelectContent>
                      </Select>

                      <div>
                        <Label className="text-xs font-medium" style={{ color: "#64748B" }}>
                          Enter {verifyMethod} <span className="opacity-60">(hint: {verifyMethod === "email" ? maskEmail(selectedAdmin.email) : maskMobile(selectedAdmin.mobile)})</span>
                        </Label>
                        <div className="relative mt-1.5">
                          {verifyMethod === "email"
                            ? <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: BRAND.accent }} />
                            : <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: BRAND.accent }} />}
                          <Input type={verifyMethod === "email" ? "email" : "tel"} value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)}
                            placeholder={verifyMethod === "email" ? "Enter your email" : "Enter your mobile"}
                            className="pl-11 h-13 rounded-xl border transition-all"
                            style={{ background: BRAND.cream, borderColor: BRAND.light }}
                            onKeyDown={(e) => e.key === "Enter" && handleVerifyIdentity()} />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleVerifyIdentity} className="w-full h-12 rounded-xl font-bold text-white border-0 shadow-lg transition-all hover:shadow-xl hover:brightness-110"
                      style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                      Verify & Continue →
                    </Button>
                    <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs gap-1" style={{ color: "#94A3B8" }}>
                      <ArrowLeft className="w-3 h-3" /> Back
                    </Button>
                  </motion.div>
                )}

                {/* STEP 3 */}
                {step === 3 && selectedAdmin && (
                  <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <motion.div className="text-center py-5 rounded-2xl border"
                        style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFFFFF, ${BRAND.cream})`, borderColor: BRAND.light }}>
                        <motion.div className="mx-auto rounded-full overflow-hidden mb-3 relative"
                          style={{ width: 72, height: 72 }}
                          animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                          <div className="absolute -inset-1 rounded-full blur-sm" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.highlight}, ${BRAND.light})` }} />
                          <div className="relative w-full h-full rounded-full overflow-hidden shadow-xl flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFFFFF)`, boxShadow: `0 0 0 3px white, 0 4px 15px ${BRAND.accent}25` }}>
                            {adminAvatars[selectedAdmin.email] ? (
                              <img src={adminAvatars[selectedAdmin.email]} alt={selectedAdmin.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-8 h-8" style={{ color: BRAND.accent }} />
                            )}
                          </div>
                        </motion.div>
                        <p className="text-lg font-black" style={{ color: BRAND.primary }}>Welcome, {selectedAdmin.name}! 🎉</p>
                        <span className="inline-block text-[10px] font-bold px-3 py-1 rounded-full mt-1.5 text-white"
                          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
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
                          { key: "password" as const, icon: Lock, label: "Password", bg: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary}DD)` },
                          { key: "secret_code" as const, icon: KeyRound, label: "Secret Code", bg: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.highlight})` },
                          { key: "otp" as const, icon: Mail, label: "Email OTP", bg: `linear-gradient(135deg, ${BRAND.highlight}, ${BRAND.accent})` },
                        ]).map(m => (
                          <motion.button key={m.key} type="button" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setAuthMethod(m.key); setOtpSent(false); setOtpCode(""); setSecretCode(""); setPassword(""); }}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                              authMethod === m.key ? "border-transparent text-white shadow-lg" : "bg-white text-gray-500"
                            }`}
                            style={authMethod === m.key ? { background: m.bg } : { borderColor: BRAND.light }}>
                            <m.icon className="w-4 h-4" /> {m.label}
                          </motion.button>
                        ))}
                      </div>

                      {authMethod === "password" && failedAttempts < 3 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: BRAND.accent }} />
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••" className="pl-11 pr-11 h-13 rounded-xl border"
                              style={{ background: BRAND.cream, borderColor: BRAND.light }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "#94A3B8" }}>
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {authMethod === "secret_code" && failedAttempts < 3 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>8-Digit Secret Code</Label>
                          <Input type="password" value={secretCode}
                            onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 8) setSecretCode(d); }}
                            placeholder="• • • • • • • •" maxLength={8}
                            className="h-14 rounded-xl text-center text-2xl tracking-[0.4em] font-black border"
                            style={{ background: BRAND.cream, borderColor: BRAND.light }} />
                        </motion.div>
                      )}

                      {(authMethod === "otp" || failedAttempts >= 3) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          {!otpSent ? (
                            <div className="text-center py-4 rounded-xl border"
                              style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFFFFF)`, borderColor: BRAND.light }}>
                              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                                <Mail className="w-10 h-10 mx-auto mb-2" style={{ color: BRAND.accent }} />
                              </motion.div>
                              <p className="text-xs" style={{ color: "#64748B" }}>OTP will be sent to</p>
                              <p className="text-sm font-bold mt-0.5" style={{ color: BRAND.primary }}>akashxbhavans@gmail.com</p>
                            </div>
                          ) : (
                            <>
                              <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>Enter 4-digit OTP</Label>
                              <Input value={otpCode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 4) setOtpCode(v); }}
                                placeholder="• • • •" maxLength={4}
                                className="h-16 text-center text-3xl tracking-[0.5em] font-black rounded-xl border"
                                style={{ background: BRAND.cream, borderColor: BRAND.light }} />
                              <button type="button" disabled={resendCooldown > 0}
                                onClick={async () => {
                                  const newOtp = String(Math.floor(1000 + Math.random() * 9000));
                                  await supabase.functions.invoke("send-otp-email", { body: { to: "akashxbhavans@gmail.com", otp: newOtp, admin_email: selectedAdmin?.email } });
                                  startResendCooldown();
                                  toast({ title: "New OTP generated" });
                                }}
                                className="text-sm hover:underline disabled:text-gray-400 flex items-center gap-1 mx-auto font-semibold"
                                style={{ color: BRAND.accent }}>
                                <RefreshCw className="w-3 h-3" /> {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}

                      <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                        <Button type="submit" disabled={loading} className="w-full h-13 rounded-xl text-base font-black text-white border-0 shadow-xl transition-all hover:shadow-2xl hover:brightness-110"
                          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})`, backgroundSize: "200% 100%" }}>
                          {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{(authMethod === "otp" || failedAttempts >= 3) && !otpSent ? "Sending OTP..." : "Verifying..."}</> :
                            (authMethod === "otp" || failedAttempts >= 3) && !otpSent ? "Send OTP →" : "Sign In →"}
                        </Button>
                      </motion.div>
                      <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs gap-1" style={{ color: "#94A3B8" }}>
                        <ArrowLeft className="w-3 h-3" /> Back
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center space-y-3">
              <button onClick={() => navigate("/cccworkshop2006")} className="text-xs font-semibold transition-colors block mx-auto" style={{ color: BRAND.accent }}>
                🎓 Switch to Workshop Admin
              </button>
              <button onClick={() => navigate("/")} className="text-xs transition-colors font-medium block mx-auto" style={{ color: "#94A3B8" }}>← Back to Home</button>
              <button
                onClick={() => {
                  const p = (window as any).__pwaInstallPrompt;
                  if (p) { p.prompt(); } else { toast({ title: "Open in browser & use 'Add to Home Screen'", description: "For the best admin experience, install the CCC Admin app" }); }
                }}
                className="text-xs font-bold flex items-center gap-1.5 mx-auto px-4 py-2 rounded-full border transition-all hover:shadow-md"
                style={{ color: BRAND.primary, borderColor: BRAND.light, background: BRAND.cream }}
              >
                <Download className="w-3.5 h-3.5" /> Install Admin App
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
