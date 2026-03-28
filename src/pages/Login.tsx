import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, KeyRound, Sparkles, Mail, Phone, Loader2, ArrowLeft, ArrowRight, Shield, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "secret_code">("password");
  const [loginWith, setLoginWith] = useState<"email" | "phone">("email");
  const [step, setStep] = useState(1);
  const [detecting, setDetecting] = useState(false);
  const [roleChoiceOpen, setRoleChoiceOpen] = useState(false);
  const [detectedRoles, setDetectedRoles] = useState<string[]>([]);

  const withTimeout = async (promise: Promise<any>, ms = 10000) => {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out.")), ms)),
    ]);
  };

  useEffect(() => {
    const checkGoogleReturn = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.app_metadata?.provider === "google") await finalizeLogin();
    };
    checkGoogleReturn();
  }, []);

  const finalizeLogin = async () => {
    const { data: userData, error: userError } = await withTimeout(supabase.auth.getUser());
    if (userError || !userData.user) throw userError || new Error("Could not validate session");
    const [{ data: roles }, { data: artistData }] = await Promise.all([
      withTimeout(supabase.from("user_roles").select("role").eq("user_id", userData.user.id) as any),
      withTimeout((supabase.from("artists").select("id") as any).eq("auth_user_id", userData.user.id).maybeSingle()),
    ]);
    if (roles?.length > 0) {
      await supabase.auth.signOut();
      toast({ title: "Admin account", description: "Use admin login.", variant: "destructive" });
      navigate("/customcad75", { replace: true }); return;
    }
    if (artistData) {
      await supabase.auth.signOut();
      toast({ title: "Artist account", description: "Use artist login.", variant: "destructive" });
      navigate("/artistlogin", { replace: true }); return;
    }
    navigate("/dashboard", { replace: true });
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/login" });
      if (result.error) { toast({ title: "Google login failed", description: String(result.error), variant: "destructive" }); setGoogleLoading(false); return; }
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", userData.user.id).maybeSingle();
        if (!profile) { await supabase.auth.signOut(); toast({ title: "Account not found", description: "Please create an account first.", variant: "destructive" }); navigate("/register"); return; }
        await finalizeLogin();
      }
    } catch (err: any) { toast({ title: "Google login failed", description: err?.message, variant: "destructive" }); }
    finally { setGoogleLoading(false); }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const loginEmail = loginWith === "email" ? email.trim().toLowerCase() : `${phone.replace(/\D/g, "")}@phone.user`;
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email: loginEmail, password }));
      if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
      else await finalizeLogin();
    } catch (err: any) { toast({ title: "Login failed", description: err?.message || "Please try again.", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleSecretCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginWith === "email" ? email : phone;
    if (!identifier || !secretCode) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const emailToUse = loginWith === "email" ? email.trim().toLowerCase() : `${phone.replace(/\D/g, "")}@phone.user`;
      const { data, error } = await supabase.functions.invoke("login-with-secret-code", { body: { email: emailToUse, secret_code: secretCode } });
      if (error) { toast({ title: "Login failed", variant: "destructive" }); setLoading(false); return; }
      if (!data?.success) { toast({ title: "Login failed", description: data?.error || "Invalid credentials", variant: "destructive" }); setLoading(false); return; }
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (verifyError) toast({ title: "Login failed", description: "Could not verify.", variant: "destructive" });
      else { toast({ title: "Login successful!" }); await finalizeLogin(); }
    } catch (err: any) { toast({ title: "Login failed", description: err.message, variant: "destructive" }); }
    setLoading(false);
  };

  const identityValue = loginWith === "email" ? email : phone;
  const canProceedStep1 = identityValue.trim().length > 3;
  const canProceedStep2 = true;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  const [direction, setDirection] = useState(1);

  const detectRole = async () => {
    setDetecting(true);
    try {
      const identifier = loginWith === "email" ? email.trim().toLowerCase() : phone.replace(/\D/g, "");
      if (!identifier || identifier.length < 4) { setDetecting(false); goNextDirect(); return; }

      const emailToCheck = loginWith === "email" ? identifier : `${identifier}@phone.user`;

      // Check admin: profile → user_roles
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", emailToCheck)
        .maybeSingle();

      let isAdmin = false;
      if (profile?.user_id) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.user_id) as any;
        isAdmin = roles?.some((r: any) => r.role === "admin");
      }

      // Check artist
      const artistQuery = loginWith === "email"
        ? supabase.from("artists").select("id").eq("email", identifier).maybeSingle()
        : supabase.from("artists").select("id").eq("mobile", identifier).maybeSingle();
      const { data: artist } = await (artistQuery as any);
      const isArtist = !!artist;

      if (isAdmin && isArtist) {
        setDetectedRoles(["admin", "artist"]);
        setRoleChoiceOpen(true);
      } else if (isAdmin) {
        toast({ title: "Admin account detected", description: "Redirecting to admin login..." });
        navigate("/customcad75", { replace: true });
      } else if (isArtist) {
        toast({ title: "Artist account detected", description: "Redirecting to artist login..." });
        navigate("/artistlogin", { replace: true });
      } else {
        goNextDirect();
      }
    } catch {
      goNextDirect();
    } finally {
      setDetecting(false);
    }
  };

  const goNextDirect = () => { setDirection(1); setStep(s => Math.min(s + 1, 3)); };
  const goNext = () => {
    if (step === 1) { detectRole(); return; }
    goNextDirect();
  };
  const goBack = () => { setDirection(-1); setStep(s => Math.max(s - 1, 1)); };

  return (
    <>
    <SEOHead title="Login" description="Login to Creative Caricature Club to manage orders, events and workshops." canonical="/login" noindex />
    <div className="min-h-[100dvh] flex items-center justify-center px-4 pb-24 md:pb-0 relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.06), transparent 60%)" }} />

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, type: "spring" }} className="w-full max-w-sm relative z-10">
        <Card className="app-card border-border/30 overflow-hidden">
          <CardHeader className="text-center pb-2 pt-6">
            <motion.div className="relative mx-auto mb-2" animate={{ y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto shadow-xl ring-2 ring-primary/10 cursor-pointer" onClick={() => navigate("/")}>
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
              </div>
            </motion.div>
            <CardTitle className="font-display text-xl text-foreground">Welcome Back</CardTitle>
            <CardDescription className="font-sans text-xs text-muted-foreground">Step {step} of 3</CardDescription>
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/40" : "w-4 bg-muted"}`} />
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4 min-h-[260px] relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                  {/* Google */}
                  <Button type="button" variant="outline" onClick={handleGoogleLogin} disabled={googleLoading} className="w-full h-11 rounded-xl font-sans font-medium gap-2 border-border/60">
                    {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    )}
                    Continue with Google
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                  </div>
                  {/* Login With toggle */}
                  <div className="flex gap-2">
                    <Button type="button" variant={loginWith === "email" ? "default" : "outline"} onClick={() => setLoginWith("email")} className="flex-1 h-10 rounded-xl text-sm gap-1.5">
                      <Mail className="w-4 h-4" /> Email
                    </Button>
                    <Button type="button" variant={loginWith === "phone" ? "default" : "outline"} onClick={() => setLoginWith("phone")} className="flex-1 h-10 rounded-xl text-sm gap-1.5">
                      <Phone className="w-4 h-4" /> Phone
                    </Button>
                  </div>
                  {loginWith === "email" ? (
                    <div>
                      <Label className="font-sans text-sm">Email Address</Label>
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="h-11 rounded-xl" />
                    </div>
                  ) : (
                    <div>
                      <Label className="font-sans text-sm">Phone Number</Label>
                      <Input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))} placeholder="+91 9876543210" className="h-11 rounded-xl" maxLength={13} />
                    </div>
                  )}
                  <Button onClick={goNext} disabled={!canProceedStep1} className="w-full h-11 rounded-xl font-sans font-semibold gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                  <p className="text-sm text-muted-foreground font-sans text-center">How would you like to sign in?</p>
                  <div className="space-y-3">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setLoginMethod("password"); goNext(); }}
                      className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${loginMethod === "password" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Lock className="w-5 h-5 text-primary" /></div>
                      <div><p className="font-sans font-semibold text-sm">Password</p><p className="text-xs text-muted-foreground">Use your account password</p></div>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setLoginMethod("secret_code"); goNext(); }}
                      className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${loginMethod === "secret_code" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><KeyRound className="w-5 h-5 text-accent" /></div>
                      <div><p className="font-sans font-semibold text-sm">Secret Code</p><p className="text-xs text-muted-foreground">4-digit code from dashboard</p></div>
                    </motion.button>
                  </div>
                  <Button variant="ghost" onClick={goBack} className="w-full h-10 rounded-xl font-sans gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground font-sans">{loginWith === "email" ? email : phone}</p>
                  </div>
                  {loginMethod === "password" ? (
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                      <div>
                        <Label className="font-sans text-sm">Password</Label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="pr-10 h-11 rounded-xl" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-sans font-semibold shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.3)]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Sign In
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleSecretCodeLogin} className="space-y-4">
                      <div>
                        <Label className="font-sans text-sm">Secret Code (4-digit)</Label>
                        <Input type="text" value={secretCode} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 4) setSecretCode(d); }} maxLength={4} placeholder="• • • •" required className="font-mono text-center text-xl tracking-[0.5em] h-12 rounded-xl" />
                      </div>
                      <Button type="submit" disabled={loading || secretCode.length !== 4} className="w-full h-11 rounded-xl font-sans font-semibold shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.3)]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Sign In with Code
                      </Button>
                    </form>
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={goBack} className="flex-1 h-10 rounded-xl font-sans gap-1 text-sm">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <a href="/forgot-password" className="flex-1 text-center text-sm text-primary hover:underline font-sans font-medium">Forgot password?</a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center pt-4 border-t border-border/30 mt-4">
              <a href="/register" className="text-sm text-primary hover:underline font-sans font-medium">Don't have an account? Sign up</a>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground/60 mt-3 font-sans">Creative Caricature Club © {new Date().getFullYear()}</p>
      </motion.div>
    </div>
    </>
  );
};

export default Login;
