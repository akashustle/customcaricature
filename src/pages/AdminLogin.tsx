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
import AuthShell from "@/components/auth/AuthShell";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { checkAdminRole, clearAdminAuthHandoff, readAdminAuthHandoff, startAdminAuthHandoff, waitForAdminSessionHandoff } from "@/lib/admin-auth";

const withTimeout = async (promise: Promise<any>, ms = 10000) =>
  Promise.race([promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Request timed out.")), ms))]);

interface AdminInfo {
  name: string;
  email: string;
  mobile: string;
  designation: string;
  emoji: string;
}

interface LoginDebugInfo {
  authEvent: string;
  handoff: string;
  reason: string;
  roleCheck: string;
  sessionStatus: string;
  userId: string | null;
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
  const adminLocationRequired = (siteSettingsData as any).admin_location_required?.enabled === true;
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
  const [debugInfo, setDebugInfo] = useState<LoginDebugInfo>({
    authEvent: "idle",
    handoff: "no handoff in progress",
    reason: "Awaiting user action.",
    roleCheck: "not checked",
    sessionStatus: "checking…",
    userId: null,
  });
  const [showDebug, setShowDebug] = useState(true);

  const updateDebug = (patch: Partial<LoginDebugInfo>) =>
    setDebugInfo((prev) => ({ ...prev, ...patch }));

  // Live-track auth events so the debug panel reflects exactly what Supabase is doing.
  useEffect(() => {
    const handoff = readAdminAuthHandoff();
    updateDebug({ handoff: handoff ? `pending (expects ${handoff.expectedUserId ?? "any user"})` : "no handoff in progress" });

    supabase.auth.getSession().then(({ data: { session } }) => {
      updateDebug({
        sessionStatus: session?.user ? "active session" : "no session",
        userId: session?.user?.id ?? null,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      updateDebug({
        authEvent: event,
        sessionStatus: session?.user ? "active session" : "no session",
        userId: session?.user?.id ?? null,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const resumeAdminSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      const adminCheck = await checkAdminRole(session.user.id);
      if (cancelled) return;
      updateDebug({
        roleCheck: `${adminCheck.status} (${adminCheck.attempts} attempt${adminCheck.attempts === 1 ? "" : "s"})`,
        reason: adminCheck.reason,
      });
      if (adminCheck.status === "granted") {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", session.user.id).maybeSingle();
        const fullName = profile?.full_name || session.user.user_metadata?.full_name || "Admin";
        sessionStorage.setItem("admin_entered_name", fullName);
        localStorage.setItem("workshop_admin", JSON.stringify({ id: session.user.id, email: profile?.email || session.user.email, name: fullName }));
        sessionStorage.setItem("admin_panel_unlocked", "1");
        startAdminAuthHandoff(session.user.id);
        navigate("/admin-panel", { replace: true });
      }
    };
    resumeAdminSession();
    return () => { cancelled = true; };
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
    if (!adminLocationRequired || !navigator.geolocation) {
      setLocationGranted(true);
      return;
    }
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
  }, [adminLocationRequired]);

  const requestLocationAccess = () => {
    if (!adminLocationRequired) {
      setLocationGranted(true);
      return;
    }
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
    if (adminLocationRequired && !locationGranted) {
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

  // Email-driven auto-detect: as admin types their email, find matching profile
  const [emailLookup, setEmailLookup] = useState("");
  const [lookupError, setLookupError] = useState("");
  const handleEmailDetect = (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalized = emailLookup.trim().toLowerCase();
    if (!normalized) { setLookupError("Enter your admin email"); return; }
    if (adminLocationRequired && !locationGranted) {
      toast({ title: "📍 Location Required", description: "Please allow location access to continue", variant: "destructive" });
      return;
    }
    const admin = ADMIN_LIST.find(a => a.email.toLowerCase() === normalized);
    if (!admin) { setLookupError("No admin profile found for this email"); return; }
    setLookupError("");
    setSelectedAdminEmail(admin.email);
    setSelectedAdmin(admin);
    setDirection(1);
    // Skip the redundant "verify email/mobile" step — email IS the identity proof
    setStep(3);
    setPassword(""); setSecretCode(""); setOtpCode(""); setOtpSent(false); setAuthMethod("password");
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

      const expectedUserId = (await supabase.auth.getUser()).data.user?.id ?? null;
      startAdminAuthHandoff(expectedUserId);
      updateDebug({ handoff: `waiting for session (expects ${expectedUserId ?? "any user"})`, reason: "Sign-in succeeded — waiting for session hydration." });

      const handoff = await waitForAdminSessionHandoff({ expectedUserId });
      const authenticatedUser = handoff.user;
      updateDebug({
        handoff: `session hydrated via ${handoff.source}`,
        sessionStatus: "active session",
        userId: authenticatedUser.id,
        reason: "Running admin role verification…",
      });

      const adminCheck = await checkAdminRole(authenticatedUser.id);
      updateDebug({
        roleCheck: `${adminCheck.status} (${adminCheck.attempts} attempt${adminCheck.attempts === 1 ? "" : "s"})`,
        reason: adminCheck.reason,
      });
      if (adminCheck.status === "denied") {
        clearAdminAuthHandoff();
        await supabase.auth.signOut();
        toast({ title: "Access Denied", variant: "destructive" });
        setLoading(false);
        return;
      }
      // status === "pending" (transient): keep the session, let RLS protect data, push to admin panel.
      await setAdminSessionName(authenticatedUser.id);
      if (locationData) {
        try { await supabase.from("admin_sessions" as any).insert({ user_id: authenticatedUser.id, admin_name: selectedAdmin.name, entered_name: selectedAdmin.name, device_info: navigator.userAgent.slice(0, 200), location_info: JSON.stringify(locationData), is_active: true } as any); } catch {}
      }
      setFailedAttempts(0);
      sessionStorage.setItem("admin_entered_name", selectedAdmin.name);
      localStorage.setItem("workshop_admin", JSON.stringify({ id: authenticatedUser.id, email: selectedAdmin.email, name: selectedAdmin.name }));
      sessionStorage.setItem("admin_panel_unlocked", "1");
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

  // Show splash first for new visitors (only if explicitly enabled in admin settings)
  const splashEnabled = (siteSettingsData as any).admin_splash_enabled?.enabled === true;
  if (showSplash && splashEnabled) {
    return <AdminSplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <AuthShell
      title="Admin Console"
      subtitle="Creative Caricature Club — internal access"
      badge="Admin Access"
      heroTitle="Admin Console"
      heroSubtitle="Secure 3-step verification with location, identity and credentials. Only the founding admins can sign in here."
      accent="amber"
    >
      <SEOHead title="Admin Login" noindex />
      <div className="space-y-5">
        {/* Compact header rail (logo, step pills, location chip) */}
        <div className="text-center space-y-3">
          <motion.div
            className="mx-auto w-14 h-14 relative"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="admin-logo-frame relative w-full h-full flex items-center justify-center shadow-md">
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover scale-[1.02]" />
            </div>
          </motion.div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Shield className="w-4 h-4" style={{ color: BRAND.accent }} />
              <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: BRAND.accent }}>
                Admin Access
              </p>
            </div>
            <p className="text-sm font-medium" style={{ color: "#64748B" }}>{getGreeting()}</p>
          </div>

          {/* Step pills */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-500 ${
                  s === step ? "w-10" : s < step ? "w-7" : "w-5"
                }`}
                style={{
                  background:
                    s === step
                      ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})`
                      : s < step
                      ? `${BRAND.accent}55`
                      : "#E5E7EB",
                }}
              />
            ))}
          </div>

          {/* Location chip */}
          <button
            type="button"
            onClick={requestLocationAccess}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
              locationGranted
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-red-50 text-red-500 border border-red-200"
            }`}
          >
            <MapPin className="w-3 h-3" />
            {locationGranted ? "Location verified ✓" : "Tap to allow location"}
          </button>

          {failedAttempts >= 2 && (
            <div className="text-xs text-red-500 font-semibold bg-red-50 rounded-xl px-4 py-2 border border-red-200">
              ⚠️ {failedAttempts} failed attempts. {failedAttempts >= 3 ? "OTP required." : "1 more → OTP required."}
            </div>
          )}
        </div>

        {/* Existing 3-step body — wrapped to preserve original structure */}
        <div className="relative">
          <div className="space-y-3.5 sm:space-y-5">

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

            {/* Debug panel — verifies session + role state in real time so we can pinpoint redirects */}
            <div className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed font-mono text-muted-foreground">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-foreground">Auth Debug</span>
                <button
                  type="button"
                  onClick={() => setShowDebug((v) => !v)}
                  className="text-[10px] underline text-muted-foreground hover:text-foreground"
                >
                  {showDebug ? "hide" : "show"}
                </button>
              </div>
              {showDebug && (
                <div className="space-y-0.5">
                  <div><span className="text-foreground/70">session:</span> {debugInfo.sessionStatus}</div>
                  <div><span className="text-foreground/70">user id:</span> {debugInfo.userId ?? "—"}</div>
                  <div><span className="text-foreground/70">role check:</span> {debugInfo.roleCheck}</div>
                  <div><span className="text-foreground/70">handoff:</span> {debugInfo.handoff}</div>
                  <div><span className="text-foreground/70">last event:</span> {debugInfo.authEvent}</div>
                  <div className="pt-1 border-t border-border/50 mt-1"><span className="text-foreground/70">reason:</span> {debugInfo.reason}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
};

export default AdminLogin;
