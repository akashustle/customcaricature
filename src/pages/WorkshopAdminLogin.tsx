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
import { Loader2, Eye, EyeOff, Lock, Mail, KeyRound, RefreshCw, ArrowLeft, User, MapPin, GraduationCap, Phone, Sparkles, Download } from "lucide-react";

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

// Warm logo-aligned palette
const BRAND = {
  primary: "#3A2E22",
  accent: "#A76C4E",
  light: "#E8D6C3",
  highlight: "#C49A6C",
  cream: "#FDF8F3",
};

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
  const [adminAvatars, setAdminAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    const resumeSharedSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: roles } = await supabase.from("user_roles" as any).select("role").eq("user_id", session.user.id).eq("role", "admin");
      if (!roles || (roles as any[]).length === 0) return;
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", session.user.id).maybeSingle();
      const info = { id: session.user.id, email: profile?.email || session.user.email, name: profile?.full_name || "Admin" };
      localStorage.setItem("workshop_admin", JSON.stringify(info));
      sessionStorage.setItem("admin_entered_name", info.name);
      navigate("/workshop-admin-panel", { replace: true });
    };
    resumeSharedSession();
  }, [navigate]);

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

  const requestLocationAccess = () => {
    navigator.geolocation?.getCurrentPosition(
      () => {
        setLocationGranted(true);
        toast({ title: "Location enabled" });
      },
      () => {
        setLocationGranted(false);
        toast({ title: "Location still blocked", description: "Tap again and allow location in browser settings.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => { setResendCooldown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; }); }, 1000);
  };

  const handleProfileSelect = (email: string) => {
    if (!locationGranted) {
      toast({ title: "📍 Location Required", variant: "destructive" });
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
          const { data, error: scErr } = await supabase.functions.invoke("login-with-secret-code", { body: { email: selectedAdmin.email, secret_code: adminMasterSecret } });
          if (scErr || !data?.success) throw new Error("Could not sign in");
          const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
          if (vErr) throw vErr;
        }
      } else if (authMethod === "secret_code") {
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", { body: { email: selectedAdmin.email, secret_code: secretCode.replace(/[-\s]/g, "") } });
        if (error || !data?.success) { setFailedAttempts(p => p + 1); throw new Error(data?.error || "Secret code login failed"); }
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (vErr) throw vErr;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: selectedAdmin.email, password });
        if (error) { setFailedAttempts(p => p + 1); throw error; }
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
      sessionStorage.setItem("admin_entered_name", selectedAdmin.name);
      toast({ title: `Welcome, ${selectedAdmin.name}! 🎓` });
      navigate("/workshop-admin-panel", { replace: true });
    } catch (err: any) {
      toast({ title: "Login Failed", description: err?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙"; };
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0, scale: 0.9 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0, scale: 0.9 }),
  };
  const goBack = () => { setDirection(-1); if (step === 3) setStep(2); else if (step === 2) { setStep(1); setSelectedAdmin(null); setSelectedAdminEmail(""); } };

  return (
    <div className="admin-pwa-bg min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <SEOHead title="Workshop Admin Login" noindex />

      {/* Soft floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {[
          { size: 320, x: "-6%", y: "-10%", color: `${BRAND.light}35`, dur: 24 },
          { size: 260, x: "68%", y: "55%", color: `${BRAND.accent}12`, dur: 30 },
          { size: 200, x: "38%", y: "-15%", color: `${BRAND.highlight}10`, dur: 22 },
          { size: 170, x: "84%", y: "12%", color: `${BRAND.light}20`, dur: 26 },
        ].map((orb, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: orb.size, height: orb.size, left: orb.x, top: orb.y, background: orb.color, filter: "blur(50px)" }}
            animate={{ y: [0, -18, 0], x: [0, 8, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut", delay: i * 1.3 }} />
        ))}
      </div>

      {/* Sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div key={`sp-${i}`} className="absolute pointer-events-none"
          style={{ top: `${15 + (i * 10) % 70}%`, left: `${10 + (i * 15) % 80}%` }}
          animate={{ y: [0, -18, 0], opacity: [0, 0.4, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 4 + i * 0.4, repeat: Infinity, delay: i * 0.7 }}>
          <Sparkles className="w-3 h-3" style={{ color: BRAND.accent }} />
        </motion.div>
      ))}

      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `radial-gradient(circle, ${BRAND.primary} 1px, transparent 1px)`, backgroundSize: "34px 34px" }} />

      <motion.div initial={{ opacity: 0, y: 50, scale: 0.88, rotateX: 8 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.2 }} className="w-full max-w-md relative z-10" style={{ perspective: "1200px" }}>

        <motion.div className="absolute -inset-3 rounded-[32px] blur-2xl"
          style={{ background: `linear-gradient(135deg, ${BRAND.light}50, ${BRAND.accent}15, ${BRAND.light}35)` }}
          animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />

        <motion.div className="relative rounded-3xl overflow-hidden"
          whileHover={{ rotateY: 1, rotateX: -1 }}
          transition={{ type: "spring", stiffness: 200 }}
          style={{
            background: "#FFFFFF",
            boxShadow: `0 25px 60px -12px ${BRAND.primary}15, 0 12px 30px -8px ${BRAND.accent}10, 0 0 0 1px ${BRAND.light}80 inset`,
            transformStyle: "preserve-3d",
          }}>

          <motion.div className="absolute inset-0 pointer-events-none z-20"
            style={{ background: `linear-gradient(105deg, transparent 35%, ${BRAND.cream}90 42%, #FFFFFF 50%, ${BRAND.cream}90 58%, transparent 65%)` }}
            animate={{ x: ["-200%", "300%"] }} transition={{ duration: 6, repeat: Infinity, repeatDelay: 6, ease: "easeInOut" }} />

          <motion.div className="h-1.5 w-full"
            style={{ background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight}, ${BRAND.accent}, ${BRAND.primary})`, backgroundSize: "200% 100%" }}
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />

          <div className="relative p-8 space-y-6">
            <div className="text-center space-y-4">
              <motion.div className="mx-auto w-20 h-20 relative" animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <motion.div className="absolute -inset-4 rounded-full blur-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND.accent}40, ${BRAND.highlight}30, ${BRAND.light}50)` }}
                  animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity }} />
                <div className="admin-logo-frame relative w-full h-full flex items-center justify-center shadow-xl">
                  <img src="/logo.png" alt="CCC" className="w-full h-full object-cover scale-[1.02]" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <GraduationCap className="w-5 h-5" style={{ color: BRAND.accent }} />
                  <h1 className="text-2xl font-black" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Workshop Admin
                  </h1>
                </div>
                <p className="text-sm font-medium" style={{ color: "#6B7280" }}>{getGreeting()}</p>
              </motion.div>

              <div className="flex items-center justify-center gap-3 mt-3">
                {[1, 2, 3].map(s => (
                  <motion.div key={s} className="relative" animate={s === step ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}>
                    <div className={`h-2 rounded-full transition-all duration-500 ${s === step ? "w-12" : s < step ? "w-8" : "w-6"}`}
                      style={{ background: s === step ? `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})` : s < step ? `${BRAND.accent}50` : "#D1D5DB" }} />
                  </motion.div>
                ))}
              </div>

              <motion.button type="button" onClick={requestLocationAccess} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold admin-3d-button ${
                locationGranted ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-500 border border-red-200"
              }`} animate={locationGranted ? {} : { scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <MapPin className="w-3 h-3" />
                {locationGranted ? "Location verified ✓" : "Location required — click here to allow"}
              </motion.button>
            </div>

            <div className="min-h-[270px] relative">
              <AnimatePresence mode="wait" custom={direction}>
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
                            className="rounded-lg cursor-pointer transition-all duration-200 focus:!bg-[#F5F3FF] focus:!text-[#4C1D95] hover:!bg-[#F5F3FF] data-[highlighted]:!bg-[#F5F3FF] data-[highlighted]:!text-[#4C1D95]"
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
                                  <span className="text-xs" style={{ color: "#9CA3AF" }}>({maskEmail(admin.email)})</span>
                                </div>
                                <span className="text-[10px] font-semibold" style={{ color: BRAND.accent }}>{admin.designation}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

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
                      <p className="text-[11px] font-semibold" style={{ color: BRAND.accent }}>{selectedAdmin.designation}</p>
                      <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>Verify your identity</p>
                    </motion.div>
                    <div className="space-y-3">
                      <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>Authenticate With</Label>
                      <Select value={verifyMethod} onValueChange={(v) => { setVerifyMethod(v as "email" | "mobile"); setVerifyInput(""); }}>
                        <SelectTrigger className="h-12 rounded-xl border" style={{ background: BRAND.cream, borderColor: BRAND.light }}><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl" style={{ background: '#FFFFFF', borderColor: BRAND.light }}>
                          <SelectItem value="email" className="rounded-lg cursor-pointer focus:!bg-[#F5F3FF] focus:!text-[#4C1D95] data-[highlighted]:!bg-[#F5F3FF]"><div className="flex items-center gap-2"><Mail className="w-4 h-4" style={{ color: BRAND.accent }} /> Email</div></SelectItem>
                          <SelectItem value="mobile" className="rounded-lg cursor-pointer focus:!bg-[#F5F3FF] focus:!text-[#4C1D95] data-[highlighted]:!bg-[#F5F3FF]"><div className="flex items-center gap-2"><Phone className="w-4 h-4" style={{ color: BRAND.accent }} /> Mobile</div></SelectItem>
                        </SelectContent>
                      </Select>
                      <div>
                        <Label className="text-xs" style={{ color: "#6B7280" }}>Enter {verifyMethod} <span className="opacity-60">(hint: {verifyMethod === "email" ? maskEmail(selectedAdmin.email) : maskMobile(selectedAdmin.mobile)})</span></Label>
                        <div className="relative mt-1.5">
                          {verifyMethod === "email" ? <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: BRAND.accent }} /> : <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: BRAND.accent }} />}
                          <Input type={verifyMethod === "email" ? "email" : "tel"} value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)}
                            placeholder={verifyMethod === "email" ? "Enter email" : "Enter mobile"}
                            className="pl-11 h-13 rounded-xl border"
                            style={{ background: BRAND.cream, borderColor: BRAND.light }}
                            onKeyDown={(e) => e.key === "Enter" && handleVerifyIdentity()} />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleVerifyIdentity} className="admin-3d-button w-full h-12 rounded-xl font-bold text-white border-0 shadow-lg hover:brightness-110"
                      style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>Verify & Continue →</Button>
                    <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs gap-1" style={{ color: "#9CA3AF" }}><ArrowLeft className="w-3 h-3" /> Back</Button>
                  </motion.div>
                )}

                {step === 3 && selectedAdmin && (
                  <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 30 }}>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <motion.div className="text-center py-5 rounded-2xl border"
                        style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFFFFF, ${BRAND.cream})`, borderColor: BRAND.light }}>
                        <motion.div className="mx-auto rounded-full overflow-hidden mb-3 relative"
                          style={{ width: 72, height: 72 }} animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                          <div className="absolute -inset-1 rounded-full blur-sm" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.highlight}, ${BRAND.light})` }} />
                          <div className="relative w-full h-full rounded-full overflow-hidden shadow-xl flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFF)`, boxShadow: `0 0 0 3px white, 0 4px 15px ${BRAND.accent}25` }}>
                            {adminAvatars[selectedAdmin.email] ? (
                              <img src={adminAvatars[selectedAdmin.email]} alt={selectedAdmin.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-8 h-8" style={{ color: BRAND.accent }} />
                            )}
                          </div>
                        </motion.div>
                        <p className="text-lg font-black" style={{ color: BRAND.primary }}>Welcome, {selectedAdmin.name}! 🎓</p>
                        <span className="inline-block text-[10px] font-bold px-3 py-1 rounded-full mt-1.5 text-white"
                          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>{selectedAdmin.designation}</span>
                      </motion.div>

                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: "password" as const, icon: Lock, label: "Password", bg: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary}DD)` },
                          { key: "secret_code" as const, icon: KeyRound, label: "Secret", bg: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.highlight})` },
                          { key: "otp" as const, icon: Mail, label: "OTP", bg: `linear-gradient(135deg, ${BRAND.highlight}, ${BRAND.accent})` },
                        ]).map(m => (
                          <motion.button key={m.key} type="button" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setAuthMethod(m.key); setOtpSent(false); }}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                              authMethod === m.key ? "border-transparent text-white shadow-lg" : "bg-white text-gray-500"
                            }`} style={authMethod === m.key ? { background: m.bg } : { borderColor: BRAND.light }}>
                            <m.icon className="w-4 h-4" /> {m.label}
                          </motion.button>
                        ))}
                      </div>

                      {authMethod === "password" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: BRAND.accent }} />
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••" className="pl-11 pr-11 h-13 rounded-xl border" style={{ background: BRAND.cream, borderColor: BRAND.light }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </motion.div>
                      )}
                      {authMethod === "secret_code" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>8-Digit Secret Code</Label>
                          <Input type="password" value={secretCode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 8) setSecretCode(d); }}
                            placeholder="• • • • • • • •" className="h-14 rounded-xl text-center text-2xl tracking-[0.4em] font-black border"
                            style={{ background: BRAND.cream, borderColor: BRAND.light }} />
                        </motion.div>
                      )}
                      {authMethod === "otp" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          {!otpSent ? (
                            <div className="text-center py-4 rounded-xl border" style={{ background: `linear-gradient(135deg, ${BRAND.cream}, #FFF)`, borderColor: BRAND.light }}>
                              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                                <Mail className="w-10 h-10 mx-auto mb-2" style={{ color: BRAND.accent }} />
                              </motion.div>
                              <p className="text-xs" style={{ color: "#6B7280" }}>OTP → <strong style={{ color: BRAND.primary }}>akashxbhavans@gmail.com</strong></p>
                            </div>
                          ) : (
                            <>
                              <Label className="text-sm font-bold" style={{ color: BRAND.primary }}>Enter 6-digit OTP</Label>
                              <Input value={otpCode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                                placeholder="• • • • • •" className="h-16 text-center text-3xl tracking-[0.5em] font-black rounded-xl border"
                                style={{ background: BRAND.cream, borderColor: BRAND.light }} />
                              <button type="button" disabled={resendCooldown > 0}
                                onClick={async () => { await supabase.auth.signInWithOtp({ email: "akashxbhavans@gmail.com", options: { shouldCreateUser: false } }); startResendCooldown(); }}
                                className="text-sm hover:underline disabled:text-gray-400 flex items-center gap-1 mx-auto font-semibold"
                                style={{ color: BRAND.accent }}>
                                <RefreshCw className="w-3 h-3" /> {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}

                      <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                        <Button type="submit" disabled={loading} className="admin-3d-button w-full h-13 rounded-xl text-base font-black text-white border-0 shadow-xl hover:brightness-110"
                          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent}, ${BRAND.highlight})` }}>
                          {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{authMethod === "otp" && !otpSent ? "Sending..." : "Verifying..."}</> : authMethod === "otp" && !otpSent ? "Send OTP →" : "Sign In →"}
                        </Button>
                      </motion.div>
                      <Button type="button" variant="ghost" onClick={goBack} className="w-full text-xs gap-1" style={{ color: "#9CA3AF" }}><ArrowLeft className="w-3 h-3" /> Back</Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center space-y-3">
              <button onClick={() => navigate("/customcad75")} className="text-xs font-semibold transition-colors block mx-auto" style={{ color: BRAND.accent }}>
                🛡️ Switch to Main Admin
              </button>
              {!(window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) && (
                <button onClick={() => navigate("/")} className="text-xs transition-colors font-medium block mx-auto" style={{ color: "#9CA3AF" }}>← Back to Home</button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default WorkshopAdminLogin;
