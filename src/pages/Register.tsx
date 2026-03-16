import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { validateEmailFormat } from "@/lib/email-validation";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check } from "lucide-react";
import LocationDropdowns from "@/components/LocationDropdowns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: 1, title: "Personal Info", desc: "Tell us about yourself" },
  { id: 2, title: "Contact", desc: "How can we reach you?" },
  { id: 3, title: "Address", desc: "Where are you located?" },
  { id: 4, title: "Security", desc: "Secure your account" },
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
    if (field === "email") {
      const error = validateEmailFormat(value);
      setEmailError(error || "");
    }
  };

  const validateMobile = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 10) update("mobile", digits);
  };

  const validatePincode = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 6) update("pincode", digits);
  };

  const validateAge = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 3) update("age", digits);
  };

  const withTimeout = async (promise: Promise<any>, ms = 10000) => {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out. Please try again.")), ms)),
    ]);
  };

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
      if (existing) {
        toast({ title: "Email Already Registered", description: "This email is already in use.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data, error } = await withTimeout(supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: form.fullName, mobile: form.mobile,
            instagram_id: form.instagramId || null, address: form.address,
            city: form.city, state: form.state, pincode: form.pincode,
            age: form.age ? parseInt(form.age) : null,
            gender: form.gender || null,
          },
        },
      }));
      if (error) {
        if (error.message?.toLowerCase().includes("already registered")) {
          toast({ title: "Email Already Registered", description: "Please login or use a different email.", variant: "destructive" });
          setLoading(false); return;
        }
        throw error;
      }
      if (!data.user) throw new Error("Registration failed");

      toast({ title: "Registration Successful!", description: "Please check your email to verify your account, then login. Your secret code for password recovery will be available in your Dashboard." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stepValid = (s: number) => {
    if (s === 1) return !!canGoStep2;
    if (s === 2) return !!canGoStep3;
    if (s === 3) return !!canGoStep4;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f0ff] via-[#efe8fc] to-[#fdf0f8] flex items-center justify-center px-4 py-8 pb-24 md:pb-8">
      <Card className="w-full max-w-md" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto mb-2 rounded-xl cursor-pointer" onClick={() => navigate("/")} />
          <CardTitle className="font-display text-2xl">Create Account</CardTitle>
          <CardDescription className="font-sans">Register to track your caricature orders</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6 px-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => { if (s.id < step || stepValid(s.id - 1)) setStep(s.id); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step === s.id ? "bg-primary text-primary-foreground shadow-md scale-110" :
                    step > s.id ? "bg-primary/30 text-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 md:w-12 h-0.5 mx-1 transition-all ${step > s.id ? "bg-primary/50" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm font-sans text-muted-foreground mb-4">
            <span className="font-semibold text-foreground">{STEPS[step - 1].title}</span> — {STEPS[step - 1].desc}
          </p>

          <form onSubmit={handleRegister}>
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <div>
                    <Label className="font-sans">Full Name *</Label>
                    <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Your full name" autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="font-sans">Age *</Label>
                      <Input value={form.age} onChange={(e) => validateAge(e.target.value)} placeholder="25" maxLength={3} />
                      {form.age && (parseInt(form.age) < 5 || parseInt(form.age) > 120) && <p className="text-xs text-destructive font-sans mt-1">Enter valid age</p>}
                    </div>
                    <div>
                      <Label className="font-sans">Gender *</Label>
                      <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="font-sans">Instagram ID</Label>
                    <Input value={form.instagramId} onChange={(e) => update("instagramId", e.target.value)} placeholder="@yourusername" />
                  </div>
                  <Button type="button" onClick={nextStep} disabled={!canGoStep2} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Contact */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <div>
                    <Label className="font-sans">Mobile Number * (10 digits)</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 bg-muted rounded-md border border-input text-sm font-sans">+91</div>
                      <Input value={form.mobile} onChange={(e) => validateMobile(e.target.value)} placeholder="9876543210" maxLength={10} autoFocus />
                    </div>
                    {form.mobile && form.mobile.length < 10 && <p className="text-xs text-destructive font-sans mt-1">Enter 10-digit mobile number</p>}
                  </div>
                  <div>
                    <Label className="font-sans">Email *</Label>
                    <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@gmail.com" />
                    {emailError && <p className="text-xs text-destructive font-sans mt-1">{emailError}</p>}
                    <p className="text-xs text-muted-foreground font-sans mt-1">Allowed: Gmail, Hotmail, Outlook, Yahoo, Zohomail</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1 rounded-full font-sans">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button type="button" onClick={nextStep} disabled={!canGoStep3} className="flex-1 rounded-full font-sans bg-primary hover:bg-primary/90">
                      Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Address */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <div>
                    <Label className="font-sans">Full Address *</Label>
                    <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="House no, Street, Area" autoFocus />
                  </div>
                  <LocationDropdowns
                    state={form.state}
                    district={form.district}
                    city={form.city}
                    onStateChange={(v) => setForm(prev => ({ ...prev, state: v, district: "", city: "" }))}
                    onDistrictChange={(v) => setForm(prev => ({ ...prev, district: v, city: "" }))}
                    onCityChange={(v) => setForm(prev => ({ ...prev, city: v }))}
                  />
                  <div>
                    <Label className="font-sans">Pincode * (6 digits)</Label>
                    <Input value={form.pincode} onChange={(e) => validatePincode(e.target.value)} placeholder="400001" maxLength={6} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1 rounded-full font-sans">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button type="button" onClick={nextStep} disabled={!canGoStep4} className="flex-1 rounded-full font-sans bg-primary hover:bg-primary/90">
                      Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Security */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="font-sans">Password *</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 chars" className="pr-10" autoFocus />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="font-sans">Confirm *</Label>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter" className="pr-10" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-destructive font-sans">Passwords don't match</p>
                  )}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                    <Label className="font-sans font-semibold text-sm">🔑 Secret Code for Password Recovery</Label>
                    <p className="text-xs text-muted-foreground font-sans">A unique secret code will be automatically generated for your account. You can view and copy it from your Dashboard after logging in.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1 rounded-full font-sans">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button type="submit" disabled={!canSubmit || loading} className="flex-1 rounded-full font-sans bg-primary hover:bg-primary/90">
                      {loading ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
          <p className="text-center text-sm font-sans mt-4">
            Already have an account? <a href="/login" className="text-primary hover:underline">Sign In</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
