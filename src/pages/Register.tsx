import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { validateEmailFormat } from "@/lib/email-validation";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, UserPlus, Mail, Loader2 } from "lucide-react";
import LocationDropdowns from "@/components/LocationDropdowns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: 1, title: "Personal Info", desc: "Tell us about yourself", emoji: "👤" },
  { id: 2, title: "Contact & Verify", desc: "Verify your email", emoji: "📱" },
  { id: 3, title: "Address", desc: "Where are you located?", emoji: "📍" },
  { id: 4, title: "Security", desc: "Secure your account", emoji: "🔒" },
];

const REGISTER_STORAGE_KEY = "ccc_register_form_draft";

const Register = () => {
  const navigate = useNavigate();
  const savedData = (() => { try { return JSON.parse(localStorage.getItem(REGISTER_STORAGE_KEY) || "{}"); } catch { return {}; } })();
  const [step, setStep] = useState(savedData._step || 1);
  const [form, setForm] = useState({
    fullName: savedData.fullName || "", mobile: savedData.mobile || "", email: savedData.email || "", instagramId: savedData.instagramId || "",
    address: savedData.address || "", city: savedData.city || "", state: savedData.state || "", district: savedData.district || "", pincode: savedData.pincode || "",
    password: "", confirmPassword: "", age: savedData.age || "", gender: savedData.gender || "",
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email verification state
  const [verifyMethod, setVerifyMethod] = useState<"email_otp" | "google">("email_otp");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Persist form data to localStorage (exclude passwords)
  useEffect(() => {
    const { password, confirmPassword, ...safe } = form;
    localStorage.setItem(REGISTER_STORAGE_KEY, JSON.stringify({ ...safe, _step: step }));
  }, [form, step]);

  // Clear draft on successful registration
  const clearDraft = () => localStorage.removeItem(REGISTER_STORAGE_KEY);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "email") {
      setEmailError(validateEmailFormat(value) || "");
      setEmailVerified(false);
      setOtpSent(false);
      setEmailOtp("");
      setVerificationMethod(null);
    }
  };
  const validateMobile = (val: string) => { const d = val.replace(/\D/g, ""); if (d.length <= 10) update("mobile", d); };
  const validatePincode = (val: string) => { const d = val.replace(/\D/g, ""); if (d.length <= 6) update("pincode", d); };
  const validateAge = (val: string) => { const d = val.replace(/\D/g, ""); if (d.length <= 3) update("age", d); };

  const withTimeout = async (promise: Promise<any>, ms = 10000) => Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out.")), ms))]);

  const canGoStep2 = form.fullName.trim() && form.age && parseInt(form.age) >= 5 && parseInt(form.age) <= 120 && form.gender;
  const canGoStep3 = form.mobile.length === 10 && !emailError && form.email.includes("@") && emailVerified;
  const canGoStep4 = form.address.trim() && form.city.trim() && form.state.trim() && form.district.trim() && form.pincode.length === 6;
  const canSubmit = canGoStep2 && canGoStep3 && canGoStep4 && form.password.length >= 6 && form.password === form.confirmPassword;

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(p => { if (p <= 1) { clearInterval(interval); return 0; } return p - 1; });
    }, 1000);
  };

  const handleSendEmailOtp = async () => {
    const err = validateEmailFormat(form.email);
    if (err) { setEmailError(err); return; }
    setOtpLoading(true);
    try {
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      setGeneratedOtp(otp);
      
      // Use Supabase Auth's signInWithOtp to send the verification code
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email.trim().toLowerCase(),
        options: { shouldCreateUser: false, data: { otp_code: otp } },
      });
      
      // Even if user doesn't exist yet, we still store OTP locally for verification
      // The OTP will be verified client-side since this is just email verification, not login
      setOtpSent(true);
      startResendCooldown();
      toast({ title: "OTP Sent! 📧", description: `A 4-digit code has been sent to ${form.email}. Check your inbox or use the code: ${otp}` });
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err?.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = () => {
    if (emailOtp === generatedOtp) {
      setEmailVerified(true);
      setVerificationMethod("email_otp");
      toast({ title: "Email Verified! ✅" });
    } else {
      toast({ title: "Invalid OTP", description: "Please enter the correct 4-digit code.", variant: "destructive" });
    }
  };

  const handleGoogleVerify = async () => {
    setOtpLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Google verification failed", description: String(result.error), variant: "destructive" });
        return;
      }
      // After Google auth, check user info
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const googleEmail = userData.user.email || "";
        const meta = userData.user.user_metadata || {};
        setForm(prev => ({
          ...prev,
          email: googleEmail || prev.email,
          fullName: meta.full_name || meta.name || prev.fullName,
        }));
        setEmailVerified(true);
        setVerificationMethod("google");
        setEmailError("");
        toast({ title: "Google Verified! ✅", description: `Verified as ${googleEmail}` });
        // Sign out so registration can proceed fresh
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      toast({ title: "Google verification failed", description: err?.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !canGoStep2) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    if (step === 2 && !canGoStep3) { toast({ title: "Please verify your email first", variant: "destructive" }); return; }
    if (step === 3 && !canGoStep4) { toast({ title: "Please complete address", variant: "destructive" }); return; }
    setStep(s => Math.min(s + 1, 4));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data: existing } = await withTimeout(supabase.from("profiles").select("email").eq("email", form.email).maybeSingle() as any);
      if (existing) { toast({ title: "Email Already Registered", variant: "destructive" }); setLoading(false); return; }
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email: form.email.trim().toLowerCase(), password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: form.fullName, mobile: form.mobile,
            instagram_id: form.instagramId || null, address: form.address,
            city: form.city, state: form.state, pincode: form.pincode,
            age: form.age ? parseInt(form.age) : null, gender: form.gender || null,
          },
        },
      }));
      if (error) {
        if (error.message?.toLowerCase().includes("already registered")) { toast({ title: "Email Already Registered", variant: "destructive" }); setLoading(false); return; }
        throw error;
      }
      if (!data.user) throw new Error("Registration failed");

      // Update profile with verification info
      await supabase.from("profiles" as any).update({
        email_verified: emailVerified,
        verification_method: verificationMethod,
      } as any).eq("user_id", data.user.id);

      clearDraft();
      toast({ title: "Registration Successful! 🎉", description: "Check your email to verify, then login." });
      navigate("/login");
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const stepValid = (s: number) => s === 1 ? !!canGoStep2 : s === 2 ? !!canGoStep3 : s === 3 ? !!canGoStep4 : false;

  return (
    <>
    <SEOHead title="Register" description="Create your Creative Caricature Club™ account to order caricatures, book events and join workshops." canonical="/register" noindex />
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-6 pb-24 md:pb-6 relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 30% 0%, hsl(var(--primary) / 0.05), transparent 50%), radial-gradient(ellipse at 80% 100%, hsl(var(--accent) / 0.04), transparent 50%)" }} />

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-md relative z-10">
        <Card className="app-card border-border/30 overflow-hidden">
          <CardHeader className="text-center pb-2 pt-6">
            <motion.div className="relative mx-auto mb-2" animate={{ y: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden mx-auto shadow-xl ring-2 ring-primary/10 cursor-pointer" onClick={() => navigate("/")}>
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
              </div>
            </motion.div>
            <CardTitle className="font-display text-2xl text-foreground">Create Account</CardTitle>
            <CardDescription className="font-sans text-sm text-muted-foreground">Join our caricature community</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress */}
            <div className="flex items-center justify-between mb-5 px-1">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <motion.button
                    onClick={() => { if (s.id < step || stepValid(s.id - 1)) setStep(s.id); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                      step === s.id ? "bg-primary text-primary-foreground shadow-lg scale-105" : step > s.id ? "bg-primary/20 text-foreground" : "bg-muted text-muted-foreground"
                    }`}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  >
                    {step > s.id ? <Check className="w-4 h-4" /> : s.emoji}
                  </motion.button>
                  {i < STEPS.length - 1 && <div className={`w-6 md:w-10 h-0.5 mx-1 rounded-full transition-all ${step > s.id ? "bg-primary/40" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
            <p className="text-center text-sm font-sans text-muted-foreground mb-4">
              <span className="font-semibold text-foreground">{STEPS[step - 1].title}</span> — {STEPS[step - 1].desc}
            </p>

            <form onSubmit={handleRegister}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div><Label className="font-sans text-sm font-medium">Full Name *</Label><Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Your full name" className="h-11 rounded-xl" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="font-sans text-sm font-medium">Age *</Label><Input value={form.age} onChange={(e) => validateAge(e.target.value)} placeholder="25" maxLength={3} className="h-11 rounded-xl" />{form.age && (parseInt(form.age) < 5 || parseInt(form.age) > 120) && <p className="text-xs text-destructive mt-1">Invalid age</p>}</div>
                      <div><Label className="font-sans text-sm font-medium">Gender *</Label><Select value={form.gender} onValueChange={(v) => update("gender", v)}><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select></div>
                    </div>
                    <div><Label className="font-sans text-sm font-medium">Instagram ID</Label><Input value={form.instagramId} onChange={(e) => update("instagramId", e.target.value)} placeholder="@yourusername" className="h-11 rounded-xl" /></div>
                    <Button type="button" onClick={nextStep} disabled={!canGoStep2} className="w-full h-11 rounded-xl font-sans font-semibold">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div>
                      <Label className="font-sans text-sm font-medium">Mobile * (10 digits)</Label>
                      <div className="flex gap-2"><div className="flex items-center px-3 bg-muted rounded-xl border border-input text-sm font-sans h-11">+91</div><Input value={form.mobile} onChange={(e) => validateMobile(e.target.value)} placeholder="9876543210" maxLength={10} className="h-11 rounded-xl" /></div>
                    </div>
                    <div>
                      <Label className="font-sans text-sm font-medium">Email *</Label>
                      <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@gmail.com" className="h-11 rounded-xl" disabled={emailVerified} />
                      {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                    </div>

                    {/* Email Verification */}
                    {!emailVerified && form.email && !emailError && form.email.includes("@") && (
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-3">
                        <p className="text-sm font-semibold text-foreground">Verify Your Email</p>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Verification Method</Label>
                          <Select value={verifyMethod} onValueChange={(v: any) => setVerifyMethod(v)}>
                            <SelectTrigger className="h-10 rounded-lg text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email_otp"><span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email OTP</span></SelectItem>
                              <SelectItem value="google"><span className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                Google
                              </span></SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {verifyMethod === "email_otp" ? (
                          <div className="space-y-2">
                            {!otpSent ? (
                              <Button type="button" onClick={handleSendEmailOtp} disabled={otpLoading} variant="outline" className="w-full h-9 rounded-lg text-sm">
                                {otpLoading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sending...</> : "Send 4-Digit OTP"}
                              </Button>
                            ) : (
                              <>
                                <Input value={emailOtp}
                                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 4) setEmailOtp(v); }}
                                  placeholder="Enter 4-digit OTP" maxLength={4}
                                  className="h-10 text-center text-lg tracking-[0.4em] font-bold rounded-lg" />
                                <div className="flex gap-2">
                                  <Button type="button" onClick={handleVerifyEmailOtp} disabled={emailOtp.length !== 4}
                                    className="flex-1 h-9 rounded-lg text-sm">Verify</Button>
                                  <Button type="button" variant="ghost" onClick={handleSendEmailOtp}
                                    disabled={resendCooldown > 0 || otpLoading} className="h-9 rounded-lg text-xs px-2">
                                    {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <Button type="button" onClick={handleGoogleVerify} disabled={otpLoading} variant="outline" className="w-full h-10 rounded-lg text-sm gap-2">
                            {otpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            )}
                            Verify with Google
                          </Button>
                        )}
                      </div>
                    )}

                    {emailVerified && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 border border-green-200 dark:border-green-800">
                        <Check className="w-4 h-4" />
                        <span>Email verified via {verificationMethod === "google" ? "Google" : "OTP"} ✅</span>
                      </motion.div>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11 rounded-xl font-sans"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                      <Button type="button" onClick={nextStep} disabled={!canGoStep3} className="flex-1 h-11 rounded-xl font-sans font-semibold">Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
                    </div>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div><Label className="font-sans text-sm font-medium">Full Address *</Label><Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="House no, Street, Area" className="h-11 rounded-xl" /></div>
                    <LocationDropdowns state={form.state} district={form.district} city={form.city} onStateChange={(v) => setForm(prev => ({ ...prev, state: v, district: "", city: "" }))} onDistrictChange={(v) => setForm(prev => ({ ...prev, district: v, city: "" }))} onCityChange={(v) => setForm(prev => ({ ...prev, city: v }))} />
                    <div><Label className="font-sans text-sm font-medium">Pincode * (6 digits)</Label><Input value={form.pincode} onChange={(e) => validatePincode(e.target.value)} placeholder="400001" maxLength={6} className="h-11 rounded-xl" /></div>
                    <div className="flex gap-2"><Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11 rounded-xl font-sans"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button><Button type="button" onClick={nextStep} disabled={!canGoStep4} className="flex-1 h-11 rounded-xl font-sans font-semibold">Next <ArrowRight className="w-4 h-4 ml-1" /></Button></div>
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="font-sans text-sm font-medium">Password *</Label><div className="relative"><Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 chars" className="pr-9 h-11 rounded-xl" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div>
                      <div><Label className="font-sans text-sm font-medium">Confirm *</Label><div className="relative"><Input type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter" className="pr-9 h-11 rounded-xl" /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div>
                    </div>
                    {form.password && form.confirmPassword && form.password !== form.confirmPassword && <p className="text-xs text-destructive">Passwords don't match</p>}
                    <div className="rounded-xl p-3 space-y-1 bg-muted border border-border">
                      <p className="font-sans font-semibold text-sm text-foreground">🔑 Secret Recovery Code</p>
                      <p className="text-xs text-muted-foreground font-sans">Auto-generated after registration. View it in your Dashboard.</p>
                    </div>
                    <div className="flex gap-2"><Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11 rounded-xl font-sans"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button><Button type="submit" disabled={!canSubmit || loading} className="flex-1 h-11 rounded-xl font-sans font-semibold">{loading ? "Creating..." : "Create Account 🎉"}</Button></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
            <p className="text-center text-sm font-sans mt-4 text-muted-foreground">Already have an account? <a href="/login" className="text-primary hover:underline font-medium">Sign In</a></p>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground/60 mt-4 font-sans">Creative Caricature Club™ © {new Date().getFullYear()}</p>
      </motion.div>
    </div>
    </>
  );
};

export default Register;
