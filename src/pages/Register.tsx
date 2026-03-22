import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { validateEmailFormat } from "@/lib/email-validation";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, UserPlus } from "lucide-react";
import LocationDropdowns from "@/components/LocationDropdowns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: 1, title: "Personal Info", desc: "Tell us about yourself", emoji: "👤" },
  { id: 2, title: "Contact", desc: "How can we reach you?", emoji: "📱" },
  { id: 3, title: "Address", desc: "Where are you located?", emoji: "📍" },
  { id: 4, title: "Security", desc: "Secure your account", emoji: "🔒" },
];

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "", mobile: "", email: "", instagramId: "",
    address: "", city: "", state: "", district: "", pincode: "",
    password: "", confirmPassword: "", age: "", gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "email") setEmailError(validateEmailFormat(value) || "");
  };
  const validateMobile = (val: string) => { const d = val.replace(/\D/g, ""); if (d.length <= 10) update("mobile", d); };
  const validatePincode = (val: string) => { const d = val.replace(/\D/g, ""); if (d.length <= 6) update("pincode", d); };
  const validateAge = (val: string) => { const d = val.replace(/\D/g, ""); if (d.length <= 3) update("age", d); };

  const withTimeout = async (promise: Promise<any>, ms = 10000) => Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out.")), ms))]);

  const canGoStep2 = form.fullName.trim() && form.age && parseInt(form.age) >= 5 && parseInt(form.age) <= 120 && form.gender;
  const canGoStep3 = form.mobile.length === 10 && !emailError && form.email.includes("@");
  const canGoStep4 = form.address.trim() && form.city.trim() && form.state.trim() && form.district.trim() && form.pincode.length === 6;
  const canSubmit = canGoStep2 && canGoStep3 && canGoStep4 && form.password.length >= 6 && form.password === form.confirmPassword;

  const nextStep = () => {
    if (step === 1 && !canGoStep2) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    if (step === 2 && !canGoStep3) { toast({ title: "Please fix errors", variant: "destructive" }); return; }
    if (step === 3 && !canGoStep4) { toast({ title: "Please complete address", variant: "destructive" }); return; }
    setStep(s => Math.min(s + 1, 4));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const emailErr = validateEmailFormat(form.email);
    if (emailErr) { setEmailError(emailErr); return; }
    setLoading(true);
    try {
      const { data: existing } = await withTimeout(supabase.from("profiles").select("email").eq("email", form.email).maybeSingle() as any);
      if (existing) { toast({ title: "Email Already Registered", variant: "destructive" }); setLoading(false); return; }
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email: form.email.trim().toLowerCase(), password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: form.fullName, mobile: form.mobile, instagram_id: form.instagramId || null, address: form.address, city: form.city, state: form.state, pincode: form.pincode, age: form.age ? parseInt(form.age) : null, gender: form.gender || null },
        },
      }));
      if (error) {
        if (error.message?.toLowerCase().includes("already registered")) { toast({ title: "Email Already Registered", variant: "destructive" }); setLoading(false); return; }
        throw error;
      }
      if (!data.user) throw new Error("Registration failed");
      toast({ title: "Registration Successful! 🎉", description: "Check your email to verify, then login." });
      navigate("/login");
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const stepValid = (s: number) => s === 1 ? !!canGoStep2 : s === 2 ? !!canGoStep3 : s === 3 ? !!canGoStep4 : false;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 pb-24 md:pb-8 relative overflow-hidden bg-gradient-to-br from-secondary via-background to-muted">
      <motion.div className="absolute top-0 left-0 w-80 h-80 opacity-15 pointer-events-none bg-primary/10 blur-3xl rounded-full" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 7, repeat: Infinity }} />
      <motion.div className="absolute bottom-0 right-0 w-96 h-96 opacity-10 pointer-events-none bg-accent/10 blur-3xl rounded-full" animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 9, repeat: Infinity }} />

      <motion.div className="absolute top-[10%] right-[10%] text-3xl opacity-15 pointer-events-none" animate={{ y: [0, -10, 0], rotate: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity }}>🎨</motion.div>
      <motion.div className="absolute bottom-[15%] left-[8%] text-3xl opacity-10 pointer-events-none" animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity }}>✨</motion.div>

      <motion.div initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md relative z-10">
        <Card className="border border-border shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-3">
            <motion.div className="relative mx-auto mb-2" animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <div className="w-18 h-18 rounded-2xl overflow-hidden mx-auto shadow-lg ring-2 ring-primary/20 cursor-pointer" style={{ width: 72, height: 72 }} onClick={() => navigate("/")}>
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
              </div>
              <motion.div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <UserPlus className="w-3 h-3 text-accent-foreground" />
              </motion.div>
            </motion.div>
            <CardTitle className="font-display text-2xl text-foreground">Create Account</CardTitle>
            <CardDescription className="font-sans text-sm">Join our caricature community</CardDescription>
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
                    <div><Label className="font-sans text-sm font-medium">Full Name *</Label><Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Your full name" autoFocus className="h-11 rounded-xl" /></div>
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
                      <div className="flex gap-2"><div className="flex items-center px-3 bg-muted rounded-xl border border-input text-sm font-sans h-11">+91</div><Input value={form.mobile} onChange={(e) => validateMobile(e.target.value)} placeholder="9876543210" maxLength={10} autoFocus className="h-11 rounded-xl" /></div>
                      {form.mobile && form.mobile.length < 10 && <p className="text-xs text-destructive mt-1">Enter 10-digit number</p>}
                    </div>
                    <div><Label className="font-sans text-sm font-medium">Email *</Label><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@gmail.com" className="h-11 rounded-xl" />{emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}<p className="text-xs text-muted-foreground mt-1">Gmail, Hotmail, Outlook, Yahoo, Zohomail</p></div>
                    <div className="flex gap-2"><Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11 rounded-xl font-sans"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button><Button type="button" onClick={nextStep} disabled={!canGoStep3} className="flex-1 h-11 rounded-xl font-sans font-semibold">Next <ArrowRight className="w-4 h-4 ml-1" /></Button></div>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div><Label className="font-sans text-sm font-medium">Full Address *</Label><Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="House no, Street, Area" autoFocus className="h-11 rounded-xl" /></div>
                    <LocationDropdowns state={form.state} district={form.district} city={form.city} onStateChange={(v) => setForm(prev => ({ ...prev, state: v, district: "", city: "" }))} onDistrictChange={(v) => setForm(prev => ({ ...prev, district: v, city: "" }))} onCityChange={(v) => setForm(prev => ({ ...prev, city: v }))} />
                    <div><Label className="font-sans text-sm font-medium">Pincode * (6 digits)</Label><Input value={form.pincode} onChange={(e) => validatePincode(e.target.value)} placeholder="400001" maxLength={6} className="h-11 rounded-xl" /></div>
                    <div className="flex gap-2"><Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11 rounded-xl font-sans"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button><Button type="button" onClick={nextStep} disabled={!canGoStep4} className="flex-1 h-11 rounded-xl font-sans font-semibold">Next <ArrowRight className="w-4 h-4 ml-1" /></Button></div>
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="font-sans text-sm font-medium">Password *</Label><div className="relative"><Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 chars" className="pr-9 h-11 rounded-xl" autoFocus /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div>
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
        <p className="text-center text-xs text-muted-foreground/60 mt-4 font-sans">Creative Caricature Club © {new Date().getFullYear()}</p>
      </motion.div>
    </div>
  );
};

export default Register;
