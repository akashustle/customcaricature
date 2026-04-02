import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, Lock, Mail, KeyRound, RefreshCw, ArrowLeft, User, MapPin, Phone, Shield, Sparkles } from "lucide-react";
import AdminSplashScreen from "@/components/AdminSplashScreen";
import { useSiteSettings } from "@/hooks/useSiteSettings";

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

const BRAND = {
  primary: "#3A2E22",
  accent: "#A76C4E",
  light: "#E8D6C3",
  highlight: "#C49A6C",
  cream: "#FDF8F3",
};

/* ───── Profile Photo Component (reused on all steps) ───── */
const AdminAvatar = ({ admin, avatarUrl, size = 72 }: { admin: AdminInfo; avatarUrl?: string; size?: number }) => (
  <motion.div
    className="relative mx-auto"
    style={{ width: size, height: size }}
    animate={{ y: [0, -4, 0] }}
    transition={{ duration: 3, repeat: Infinity }}
  >
    {/* Glow ring */}
    <motion.div
      className="absolute rounded-full"
      style={{
        inset: -6,
        background: `linear-gradient(135deg, ${BRAND.accent}50, ${BRAND.highlight}40, ${BRAND.light}60)`,
        filter: "blur(8px)",
      }}
      animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
      transition={{ duration: 3, repeat: Infinity }}
    />
    {/* Rotating border */}
    <motion.div
      className="absolute rounded-full"
      style={{
        inset: -3,
        background: `conic-gradient(from 0deg, ${BRAND.accent}, ${BRAND.highlight}, ${BRAND.light}, ${BRAND.accent})`,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
    {/* White ring + photo */}
    <div
      className="absolute inset-0 rounded-full overflow-hidden"
      style={{
        boxShadow: `0 0 0 3px white, 0 8px 25px ${BRAND.accent}30`,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={admin.name}
          className="w-full h-full object-cover"
          loading="eager"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white font-black"
          style={{
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            fontSize: size * 0.4,
          }}
        >
          {admin.name.charAt(0)}
        </div>
      )}
    </div>
  </motion.div>
);

const AdminLogin = () => {
  const navigate = useNavigate();
  const { settings: siteSettingsData } = useSiteSettings();
  const [showSplash, setShowSplash] = useState(true);
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const resumeAdminSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin") as any;
      if (roles && roles.length > 0) {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", session.user.id).maybeSingle();
        const fullName = profile?.full_name || session.user.user_metadata?.full_name || "Admin";
        sessionStorage.setItem("admin_entered_name", fullName);
        localStorage.setItem("workshop_admin", JSON.stringify({ id: session.user.id, email: profile?.email || session.user.email, name: fullName }));
        navigate("/admin-panel", { replace: true });
      }
    };
    resumeAdminSession();
  }, [navigate]);

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
          if (p.avatar_url) {
            const sep = p.avatar_url.includes("?") ? "&" : "?";
            avatars[p.email] = `${p.avatar_url}${sep}v=${Date.now()}`;
          }
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

  const requestLocationAccess = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setLocationGranted(true); setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast({ title: "Location enabled" }); },
      () => { setLocationGranted(false); toast({ title: "Location still blocked", description: "Tap again and allow location in browser settings.", variant: "destructive" }); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

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
        const { data: trackData } = await supabase.from("admin_login_tracking" as any)
          .select("otp_code, otp_expires_at")
          .eq("user_id", (await supabase.from("profiles").select("user_id").eq("email", selectedAdmin.email).maybeSingle()).data?.user_id || "")
          .maybeSingle() as any;
        if (!trackData || trackData.otp_code !== otpCode || new Date(trackData.otp_expires_at) < new Date()) throw new Error("Invalid or expired OTP");
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", { body: { email: selectedAdmin.email, secret_code: adminMasterSecret } });
        if (error || !data?.success) throw new Error(data?.error || "Login failed after OTP verification");
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (vErr) throw vErr;
      } else if (authMethod === "secret_code") {
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", { body: { email: selectedAdmin.email, secret_code: secretCode.replace(/[-\s]/g, "") } });
        if (error || !data?.success) { setFailedAttempts(p => p + 1); throw new Error(data?.error || "Secret code login failed"); }
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (vErr) throw vErr;
      } else {
        const { data: authData, error: authError } = await withTimeout(supabase.auth.signInWithPassword({ email: selectedAdmin.email, password }));
        if (authError || !authData.user) { setFailedAttempts(p => p + 1); throw authError || new Error("Login failed"); }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Auth failed");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id) as any;
      if (!roles || roles.length === 0) { await supabase.auth.signOut(); toast({ title: "Access Denied", variant: "destructive" }); setLoading(false); return; }
      await setAdminSessionName(userData.user.id);
      if (locationData) {
        try { await supabase.from("admin_sessions" as any).insert({ user_id: userData.user.id, admin_name: selectedAdmin.name, entered_name: selectedAdmin.name, device_info: navigator.userAgent.slice(0, 200), location_info: JSON.stringify(locationData), is_active: true } as any); } catch {}
      }
      setFailedAttempts(0);
      sessionStorage.setItem("admin_entered_name", selectedAdmin.name);
      localStorage.setItem("workshop_admin", JSON.stringify({ id: userData.user.id, email: selectedAdmin.email, name: selectedAdmin.name }));
      toast({ title: `Welcome back, ${selectedAdmin.name}! 🎉` });
      navigate("/admin-panel", { replace: true });
    } catch (err: any) {
      try { await supabase.from("admin_failed_logins" as any).insert({ email: selectedAdmin.email, reason: "invalid_credentials", device_info: navigator.userAgent.slice(0, 200) }); } catch {}
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

  // Show splash first for new visitors (if enabled in admin settings)
  const { settings: siteSettingsData } = useSiteSettings();
  const splashEnabled = (siteSettingsData as any).admin_splash_enabled?.enabled !== false;
  if (showSplash && splashEnabled) {
    return <AdminSplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="admin-pwa-bg min-h-screen relative overflow-hidden flex items-center justify-center p-4"
    >
      <SEOHead title="Admin Login" noindex />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {[
          { size: 400, x: "-10%", y: "-15%", color: `${BRAND.light}50`, dur: 18 },
          { size: 320, x: "68%", y: "55%", color: `${BRAND.accent}18`, dur: 24 },
          { size: 260, x: "40%", y: "-20%", color: `${BRAND.highlight}15`, dur: 16 },
          { size: 220, x: "80%", y: "5%", color: `${BRAND.light}30`, dur: 22 },
          { size: 180, x: "12%", y: "68%", color: `${BRAND.accent}12`, dur: 20 },
          { size: 150, x: "55%", y: "80%", color: `${BRAND.highlight}10`, dur: 15 },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: orb.size, height: orb.size, left: orb.x, top: orb.y, background: orb.color, filter: "blur(70px)" }}
            animate={{ y: [0, -25, 0], x: [0, 12, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }}
          />
        ))}
      </div>

      {/* Floating sparkles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`sp-${i}`}
          className="absolute pointer-events-none"
          style={{ top: `${10 + (i * 7) % 80}%`, left: `${6 + (i * 12) % 88}%` }}
          animate={{ y: [0, -25, 0], opacity: [0, 0.6, 0], rotate: [0, 180, 360], scale: [0.3, 1.2, 0.3] }}
          transition={{ duration: 3.5 + i * 0.5, repeat: Infinity, delay: i * 0.5 }}
        >
          <Sparkles className="w-3 h-3" style={{ color: BRAND.accent }} />
        </motion.div>
      ))}

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: `radial-gradient(circle, ${BRAND.primary} 1px, transparent 1px)`, backgroundSize: "36px 36px" }}
      />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, type: "spring", bounce: 0.15 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Outer glow */}
        <motion.div
          className="absolute -inset-4 rounded-[32px] blur-2xl"
          style={{ background: `linear-gradient(135deg, ${BRAND.light}60, ${BRAND.accent}25, ${BRAND.light}50)` }}
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Card */}
        <motion.div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "#FFFFFF",
            boxShadow: `0 30px 70px -15px ${BRAND.primary}18, 0 15px 35px -10px ${BRAND.accent}12, 0 0 0 1px ${BRAND.light}90 inset`,
          }}
        >
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none z-20"
            style={{ background: `linear-gradient(105deg, transparent 35%, ${BRAND.cream}80 42%, #FFFFFF 50%, ${BRAND.cream}80 58%, transparent 65%)` }}
            animate={{ x: ["-200%", "300%"] }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 8, ease: "easeInOut" }}
          />

          {/* Top gradient strip with animation */}
          <motion.div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight}, ${BRAND.accent}, ${BRAND.primary})`,
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative p-7 md:p-8 space-y-5">
            {/* Header — Logo + title (always visible) */}
            <div className="text-center space-y-3">
              <motion.div
                className="mx-auto w-20 h-20 relative"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div
                  className="absolute -inset-4 rounded-full blur-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND.accent}40, ${BRAND.highlight}30, ${BRAND.light}50)` }}
                  animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="admin-logo-frame relative w-full h-full flex items-center justify-center shadow-xl">
                  <img src="/logo.png" alt="CCC" className="w-full h-full object-cover scale-[1.02]" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="w-5 h-5" style={{ color: BRAND.accent }} />
                  <h1
                    className="text-2xl font-black"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Admin Console
                  </h1>
                </div>
                <p className="text-sm font-medium" style={{ color: "#64748B" }}>{getGreeting()}</p>
              </motion.div>

              {/* Step indicators */}
              <div className="flex items-center justify-center gap-3 mt-3">
                {[1, 2, 3].map(s => (
                  <motion.div key={s} className="relative" animate={s === step ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}>
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${s === step ? "w-12" : s < step ? "w-8" : "w-6"}`}
                      style={{
                        background: s === step
                          ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})`
                          : s < step ? `${BRAND.accent}50` : "#CBD5E1",
                      }}
                    />
                    {s === step && (
                      <motion.div
                        className="absolute inset-0 rounded-full blur-sm"
                        style={{ background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.highlight})` }}
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Location chip */}
              <motion.button
                type="button"
                onClick={requestLocationAccess}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold admin-3d-button ${
                  locationGranted
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-red-50 text-red-500 border border-red-200"
                }`}
                animate={locationGranted ? {} : { scale: [1, 1.03, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <MapPin className="w-3 h-3" />
                {locationGranted ? "Location verified ✓" : "Location required — click here to allow"}
              </motion.button>

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
                {/* STEP 1 — Profile Select */}
                {step === 1 && (
                  <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }} className="space-y-5">
                    <Label className="text-sm font-bold flex items-center gap-2" style={{ color: BRAND.primary }}>
                      <User className="w-4 h-4" style={{ color: BRAND.accent }} /> Select Your Profile
                    </Label>
                    <Select value={selectedAdminEmail} onValueChange={handleProfileSelect}>
                      <SelectTrigger
                        className="h-14 rounded-2xl text-base transition-all border"
                        style={{ background: `linear-gradient(135deg, #FFFFFF, ${BRAND.cream})`, borderColor: BRAND.light }}
                      >
                        <SelectValue placeholder="Choose admin profile..." />
                      </SelectTrigger>
                      <SelectContent
                        className="border rounded-xl shadow-2xl overflow-visible"
                        style={{ borderColor: BRAND.light, background: "#FFFFFF" }}
                      >
                        {ADMIN_LIST.map(admin => (
                          <SelectItem
                            key={admin.email}
                            value={admin.email}
                            className="rounded-lg cursor-pointer transition-all duration-200 py-2.5 focus:!bg-[#F0F9FF] hover:!bg-[#F0F9FF] data-[highlighted]:!bg-[#F0F9FF]"
                            style={{ color: BRAND.primary }}
                          >
                            <div className="flex items-center gap-3">
                              {/* Profile photo in dropdown */}
                              <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border-2" style={{ borderColor: BRAND.light }}>
                                {adminAvatars[admin.email] ? (
                                  <img src={adminAvatars[admin.email]} alt={admin.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                                    style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}
                                  >
                                    {admin.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold truncate" style={{ color: BRAND.primary }}>{admin.name}</span>
                                  <span className="text-xs shrink-0" style={{ color: "#94A3B8" }}>({maskEmail(admin.email)})</span>
                                </div>
                                <span className="text-[10px] font-semibold flex items-center gap-1 truncate" style={{ color: BRAND.accent }}>
                                  {admin.emoji} {admin.designation}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-center font-medium" style={{ color: "#94A3B8" }}>Select your profile to proceed securely</p>
                  </motion.div>
                )}

                {/* STEP 2 — Identity Verification */}
                {step === 2 && selectedAdmin && (
                  <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }} className="space-y-4">
                    <motion.div
                      className="text-center py-5 rounded-2xl border"
                      style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFFFFF, ${BRAND.cream})`, borderColor: BRAND.light }}
                    >
                      <AdminAvatar admin={selectedAdmin} avatarUrl={adminAvatars[selectedAdmin.email]} size={72} />
                      <p className="text-lg font-bold mt-3" style={{ color: BRAND.primary }}>Hi {selectedAdmin.name}! 👋</p>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: BRAND.accent }}>{selectedAdmin.emoji} {selectedAdmin.designation}</p>
                      <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>Verify your identity to continue</p>
                    </motion.div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>Authenticate With</Label>
                      <Select value={verifyMethod} onValueChange={(v) => { setVerifyMethod(v as "email" | "mobile"); setVerifyInput(""); }}>
                        <SelectTrigger className="h-12 rounded-xl border transition-all" style={{ background: BRAND.cream, borderColor: BRAND.light }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl" style={{ background: "#FFFFFF", borderColor: BRAND.light }}>
                          <SelectItem value="email" className="rounded-lg cursor-pointer focus:!bg-[#F0F9FF] data-[highlighted]:!bg-[#F0F9FF]">
                            <div className="flex items-center gap-2"><Mail className="w-4 h-4" style={{ color: BRAND.accent }} /> Email Address</div>
                          </SelectItem>
                          <SelectItem value="mobile" className="rounded-lg cursor-pointer focus:!bg-[#F0F9FF] data-[highlighted]:!bg-[#F0F9FF]">
                            <div className="flex items-center gap-2"><Phone className="w-4 h-4" style={{ color: BRAND.accent }} /> Mobile Number</div>
                          </SelectItem>
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
                          <Input
                            type={verifyMethod === "email" ? "email" : "tel"}
                            value={verifyInput}
                            onChange={(e) => setVerifyInput(e.target.value)}
                            placeholder={verifyMethod === "email" ? "Enter your email" : "Enter your mobile"}
                            className="pl-11 h-13 rounded-xl border transition-all"
                            style={{ background: BRAND.cream, borderColor: BRAND.light }}
                            onKeyDown={(e) => e.key === "Enter" && handleVerifyIdentity()}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleVerifyIdentity}
                      className="admin-3d-button w-full h-12 rounded-xl font-bold text-white border-0 shadow-lg hover:shadow-xl hover:brightness-110"
                      style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}
                    >
                      Verify & Continue →
                    </Button>
                    <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs gap-1" style={{ color: "#94A3B8" }}>
                      <ArrowLeft className="w-3 h-3" /> Back
                    </Button>
                  </motion.div>
                )}

                {/* STEP 3 — Credentials */}
                {step === 3 && selectedAdmin && (
                  <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <motion.div
                        className="text-center py-5 rounded-2xl border"
                        style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFFFFF, ${BRAND.cream})`, borderColor: BRAND.light }}
                      >
                        <AdminAvatar admin={selectedAdmin} avatarUrl={adminAvatars[selectedAdmin.email]} size={80} />
                        <p className="text-lg font-black mt-3" style={{ color: BRAND.primary }}>Welcome, {selectedAdmin.name}! 🎉</p>
                        <span
                          className="inline-block text-[10px] font-bold px-3 py-1 rounded-full mt-1.5 text-white"
                          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}
                        >
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
                              className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }}>
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
                        <Button type="submit" disabled={loading}
                          className="admin-3d-button w-full h-13 rounded-xl text-base font-black text-white border-0 shadow-xl hover:shadow-2xl hover:brightness-110"
                          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})`, backgroundSize: "200% 100%" }}>
                          {loading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{(authMethod === "otp" || failedAttempts >= 3) && !otpSent ? "Sending OTP..." : "Verifying..."}</>
                          ) : (
                            (authMethod === "otp" || failedAttempts >= 3) && !otpSent ? "Send OTP →" : "Sign In →"
                          )}
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
              {!(window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) && (
                <button onClick={() => navigate("/")} className="text-xs transition-colors font-medium block mx-auto" style={{ color: "#94A3B8" }}>← Back to Home</button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default AdminLogin;
