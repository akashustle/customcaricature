import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Shield, Lock, Mail, KeyRound, RefreshCw, Sparkles } from "lucide-react";

const withTimeout = async (promise: Promise<any>, ms = 10000) =>
  Promise.race([promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Request timed out.")), ms))]);

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [adminSecretCode, setAdminSecretCode] = useState("");
  const [otpVerifyMethod, setOtpVerifyMethod] = useState<"otp" | "secret">("otp");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<"password" | "secret_code">("password");
  const [loginField, setLoginField] = useState<"email" | "mobile">("email");
  const [adminGreetName, setAdminGreetName] = useState<string | null>(null);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sessionLimitReached, setSessionLimitReached] = useState(false);
  const [sessionSecretCode, setSessionSecretCode] = useState("");
  const [adminMasterSecret, setAdminMasterSecret] = useState("01022006");

  // Fetch admin secret code from DB
  useEffect(() => {
    const fetchSecret = async () => {
      const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "admin_secret_code").maybeSingle();
      if (data?.value && (data.value as any).code) {
        setAdminMasterSecret((data.value as any).code);
      }
    };
    fetchSecret();
  }, []);

  // Lookup admin name on email/mobile blur
  const lookupAdminName = async (val: string) => {
    if (!val.trim()) { setAdminGreetName(null); return; }
    const field = loginField === "email" ? "email" : "mobile";
    const { data } = await supabase.from("profiles").select("full_name, email").eq(field, val.trim().toLowerCase()).maybeSingle();
    if (data?.full_name) {
      setAdminGreetName(data.full_name);
      if (loginField === "mobile" && data.email) setEmail(data.email); // auto-fill email for auth
    } else {
      setAdminGreetName(null);
    }
  };

  // Helper to set admin name in session after successful login
  const setAdminSessionName = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
    const name = profile?.full_name || "Admin";
    sessionStorage.setItem("admin_entered_name", name);
    sessionStorage.setItem("admin_action_name", name);
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(p => {
        if (p <= 1) { clearInterval(interval); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!password && loginMethod === "password")) {
      toast({ title: "Please fill all fields", variant: "destructive" }); return;
    }
    if (loginMethod === "secret_code" && secretCode.length !== 4) {
      toast({ title: "Enter 4-digit secret code", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      if (loginMethod === "secret_code") {
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
          body: { email: email.trim().toLowerCase(), secret_code: secretCode },
        });
        if (error) { toast({ title: "Login failed", description: "Could not connect.", variant: "destructive" }); setLoading(false); return; }
        if (!data?.success) { toast({ title: "Login failed", description: data?.error || "Invalid credentials", variant: "destructive" }); setLoading(false); return; }
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (verifyError) { toast({ title: "Login failed", description: "Could not verify.", variant: "destructive" }); setLoading(false); return; }
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) throw new Error("Auth failed");
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id) as any;
        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast({ title: "Access Denied", description: "Not authorized for admin.", variant: "destructive" });
          setLoading(false); return;
        }
        await setAdminSessionName(userData.user.id);
        toast({ title: `Welcome back, ${adminGreetName || "admin"}! 🎉` });
        navigate("/admin-panel", { replace: true });
        setLoading(false); return;
      }

      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      );
      if (authError || !authData.user) throw authError || new Error("Login failed");
      const { data: roles, error: roleError } = await withTimeout(
        supabase.from("user_roles").select("role").eq("user_id", authData.user.id) as any
      );
      if (roleError) throw roleError;
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        await supabase.from("admin_failed_logins" as any).insert({
          email: email.trim().toLowerCase(), reason: "not_authorized",
          ip_address: null, device_info: navigator.userAgent.slice(0, 200),
        });
        toast({ title: "Access Denied", description: "Not authorized for admin access.", variant: "destructive" });
        return;
      }

      const { data: activeSessions } = await supabase.from("admin_sessions").select("id").eq("is_active", true);
      const sessionLimit = parseInt(sessionStorage.getItem("admin_extended_limit") || "5");
      if (activeSessions && activeSessions.length >= sessionLimit) {
        await supabase.auth.signOut();
        setPendingUserId(authData.user.id);
        setSessionLimitReached(true);
        setLoading(false);
        return;
      }

      const { data: tracking } = await supabase.from("admin_login_tracking" as any).select("*").eq("user_id", authData.user.id).maybeSingle();
      const totalLogins = (tracking as any)?.total_logins || 0;

      if (totalLogins > 0 && totalLogins % 5 === 0) {
        // Use Supabase Auth's built-in OTP which actually sends an email
        await supabase.auth.signOut();
        
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { shouldCreateUser: false },
        });

        if (otpError) {
          console.error("OTP send error:", otpError);
          toast({ title: "Could not send OTP", description: otpError.message, variant: "destructive" });
          setLoading(false); return;
        }

        setPendingUserId(authData.user.id);
        setOtpStep(true);
        startResendCooldown();
        toast({ title: "OTP Sent! 📧", description: "Check your email for the 6-digit verification code." });
        setLoading(false);
        return;
      }

      const currentUser = (await supabase.auth.getUser()).data.user;
      if (currentUser) await setAdminSessionName(currentUser.id);
      toast({ title: `Welcome back, ${adminGreetName || "admin"}! 🎉` });
      navigate("/admin-panel", { replace: true });
    } catch (err: any) {
      try {
        await supabase.from("admin_failed_logins" as any).insert({
          email: email.trim().toLowerCase(), reason: "invalid_credentials",
          ip_address: null, device_info: navigator.userAgent.slice(0, 200),
        });
        const { data: recent } = await supabase.from("admin_failed_logins" as any)
          .select("id").eq("email", email.trim().toLowerCase())
          .gte("created_at", new Date(Date.now() - 3600000).toISOString());
        if (recent && recent.length >= 5) {
          await supabase.from("admin_security_alerts" as any).insert({
            alert_type: "brute_force", severity: "high",
            title: "Multiple Failed Login Attempts",
            description: `${recent.length} failed attempts for ${email} in the last hour.`,
            ip_address: null,
          });
        }
      } catch {}
      toast({ title: "Login Failed", description: err?.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendingOtp(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      startResendCooldown();
      toast({ title: "OTP Resent ✅", description: "Check your email for the new code." });
    } catch {
      toast({ title: "Failed to resend OTP", variant: "destructive" });
    } finally {
      setResendingOtp(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    // Admin secret code bypass
    if (otpVerifyMethod === "secret") {
      if (adminSecretCode !== adminMasterSecret) {
        toast({ title: "Invalid Admin Secret Code", variant: "destructive" });
        return;
      }
      setLoading(true);
      try {
        // Sign in with password since secret code is valid
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password,
        });
        if (error) throw error;

        // Update tracking
        if (pendingUserId) {
          await supabase.from("admin_login_tracking" as any).update({
            otp_code: null, otp_required: false, otp_expires_at: null,
            total_logins: ((await supabase.from("admin_login_tracking" as any).select("total_logins").eq("user_id", pendingUserId).maybeSingle()).data as any)?.total_logins + 1 || 1,
            updated_at: new Date().toISOString(),
          } as any).eq("user_id", pendingUserId);
        }

        if (pendingUserId) await setAdminSessionName(pendingUserId);
        toast({ title: `Secret Code Verified! Welcome back, ${adminGreetName || "admin"}! 🔐` });
        navigate("/admin-panel", { replace: true });
      } catch (err: any) {
        toast({ title: "Verification Failed", description: err?.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal OTP verification
    if (!otpCode || otpCode.length !== 6) { toast({ title: "Enter 6-digit OTP", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode,
        type: "email",
      });
      if (verifyError) {
        toast({ title: "Invalid OTP", description: verifyError.message, variant: "destructive" });
        setLoading(false); return;
      }

      // Update tracking
      if (pendingUserId) {
        const { data: t } = await supabase.from("admin_login_tracking" as any).select("total_logins").eq("user_id", pendingUserId).maybeSingle();
        await supabase.from("admin_login_tracking" as any).update({
          otp_code: null, otp_required: false, otp_expires_at: null,
          total_logins: ((t as any)?.total_logins || 0) + 1,
          updated_at: new Date().toISOString(),
        } as any).eq("user_id", pendingUserId);
      }

      sessionStorage.removeItem("admin_entered_name");
      toast({ title: "OTP Verified! Welcome back, admin! ✅" });
      navigate("/admin-panel", { replace: true });
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-background">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(260 80% 60%), hsl(var(--primary)))" }}
          animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
        <motion.div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "conic-gradient(from 180deg, hsl(var(--accent)), hsl(var(--primary)), hsl(320 70% 55%), hsl(var(--accent)))" }}
          animate={{ rotate: [360, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} />
        <motion.div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] bg-primary/30"
          animate={{ scale: [1, 1.4, 1], y: [0, -50, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

      {/* Floating orbs with glow */}
      {[...Array(8)].map((_, i) => (
        <motion.div key={i} className="absolute pointer-events-none"
          style={{ top: `${10 + (i * 11) % 80}%`, left: `${5 + (i * 13) % 90}%` }}
          animate={{ y: [0, -30 - i * 5, 0], x: [0, (i % 2 ? 15 : -15), 0], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: 4 + i * 0.7, repeat: Infinity, delay: i * 0.3 }}>
          <div className={`rounded-full bg-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.3)]`}
            style={{ width: `${6 + (i % 3) * 4}px`, height: `${6 + (i % 3) * 4}px` }} />
        </motion.div>
      ))}

      {/* Floating emoji decorations */}
      {["🎨", "✨", "🖌️", "🌟"].map((emoji, i) => (
        <motion.span key={i} className="absolute text-2xl pointer-events-none select-none opacity-20"
          style={{ top: `${20 + i * 20}%`, right: `${8 + i * 12}%` }}
          animate={{ y: [0, -20, 0], rotate: [0, 15, -15, 0], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.8 }}>
          {emoji}
        </motion.span>
      ))}

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.9, rotateX: 10 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }} className="w-full max-w-md relative z-10" style={{ perspective: "1200px" }}>
        
        {/* Outer glow ring */}
        <motion.div className="absolute -inset-1 rounded-[28px] opacity-40 blur-sm"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.4), hsl(var(--accent)/0.3), hsl(var(--primary)/0.2))" }}
          animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />

        <div className="relative backdrop-blur-2xl bg-card/90 border border-border/40 rounded-3xl shadow-[0_25px_80px_-15px_hsl(var(--primary)/0.3),0_0_0_1px_hsl(var(--border)/0.3),inset_0_1px_0_hsl(var(--card)/0.8)] p-8 space-y-6 overflow-hidden">
          {/* Inner shimmer effect */}
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(105deg, transparent 40%, hsl(var(--primary)/0.05) 45%, hsl(var(--primary)/0.08) 50%, hsl(var(--primary)/0.05) 55%, transparent 60%)" }}
            animate={{ x: ["-100%", "200%"] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }} />

          {/* Header */}
          <div className="text-center space-y-4 relative">
            <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden relative"
              animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
              whileHover={{ scale: 1.1, rotateY: 15, rotateX: -5 }}>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/50 to-accent/30 blur-sm" />
              <img src="/logo.png" alt="CCC" className="relative w-full h-full object-cover cursor-pointer rounded-2xl ring-2 ring-white/20" onClick={() => navigate("/")} />
            </motion.div>

            <div className="flex items-center justify-center gap-2">
              <motion.div animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }} transition={{ duration: 4, repeat: Infinity }}>
                <Shield className="w-5 h-5 text-primary" />
              </motion.div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-foreground via-primary/80 to-foreground/60 bg-clip-text text-transparent">
                Admin Console
              </h1>
              <motion.div animate={{ scale: [1, 1.4, 1], rotate: [0, 180, 360] }} transition={{ duration: 3, repeat: Infinity }}>
                <Sparkles className="w-4 h-4 text-primary/70" />
              </motion.div>
            </div>
            <motion.p className="text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Creative Caricature Club • Secure Access
            </motion.p>

            {/* Animated security badge */}
            <motion.div className="mx-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit"
              animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <motion.div className="w-2 h-2 rounded-full bg-green-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <span className="text-[10px] font-semibold text-primary">256-bit Encrypted</span>
            </motion.div>
          </div>

          {sessionLimitReached ? (
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-orange-500/10 to-red-500/5 rounded-xl p-4 border border-orange-500/20 text-center space-y-2">
                <Shield className="w-10 h-10 text-orange-500 mx-auto" />
                <p className="text-sm font-semibold text-foreground">Session Limit Reached</p>
                <p className="text-xs text-muted-foreground">Maximum concurrent sessions active. Enter admin secret code to unlock 10 more sessions.</p>
              </motion.div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground font-medium">Admin Secret Code</Label>
                <div className="relative group">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input type="password" value={sessionSecretCode}
                    onChange={(e) => setSessionSecretCode(e.target.value)}
                    placeholder="Enter admin secret code"
                    className="pl-10 h-14 bg-background/60 border-border/60 rounded-xl text-center text-lg tracking-wider font-bold focus:border-primary"
                    autoFocus />
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={async () => {
                    if (sessionSecretCode !== adminMasterSecret) {
                      toast({ title: "Invalid Secret Code", variant: "destructive" });
                      return;
                    }
                    sessionStorage.setItem("admin_extended_limit", "15");
                    setSessionLimitReached(false);
                    setSessionSecretCode("");
                    // Re-login
                    setLoading(true);
                    try {
                      const { error } = await supabase.auth.signInWithPassword({
                        email: email.trim().toLowerCase(), password,
                      });
                      if (error) throw error;
                      sessionStorage.removeItem("admin_entered_name");
                      toast({ title: "Session limit extended! Welcome back! 🔓" });
                      navigate("/admin-panel", { replace: true });
                    } catch (err: any) {
                      toast({ title: "Login Failed", description: err?.message, variant: "destructive" });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !sessionSecretCode}
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.4)]">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Unlock & Login"}
                </Button>
              </motion.div>
              <Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground"
                onClick={() => { setSessionLimitReached(false); setSessionSecretCode(""); }}>
                ← Back to Login
              </Button>
            </div>
          ) : !otpStep ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground font-medium">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" required
                    className="pl-10 h-12 bg-background/60 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground font-medium">Login Method</Label>
                <Select value={loginMethod} onValueChange={(v: any) => setLoginMethod(v)}>
                  <SelectTrigger className="h-12 rounded-xl bg-background/60 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password"><span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Password</span></SelectItem>
                    <SelectItem value="secret_code"><span className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Secret Code (4-digit)</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loginMethod === "password" ? (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground font-medium">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" required className="pl-10 pr-10 h-12 bg-background/60 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground font-medium">Secret Code (4-digit)</Label>
                  <div className="relative group">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input type="text" value={secretCode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 4) setSecretCode(d); }}
                      placeholder="• • • •" maxLength={4} required
                      className="pl-10 h-12 bg-background/60 border-border/60 rounded-xl text-center text-xl tracking-[0.5em] font-bold focus:border-primary" />
                  </div>
                </div>
              )}

              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_-3px_hsl(var(--primary)/0.5)] transition-all">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In as Admin"}
                </Button>
              </motion.div>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-xl p-4 border border-primary/20 text-center space-y-2">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Shield className="w-10 h-10 text-primary mx-auto" />
                </motion.div>
                <p className="text-sm font-semibold text-foreground">Security Verification Required</p>
                <p className="text-xs text-muted-foreground">Choose your verification method below</p>
              </motion.div>

              {/* Verification method selector */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground font-medium">Verify Using</Label>
                <Select value={otpVerifyMethod} onValueChange={(v: any) => setOtpVerifyMethod(v)}>
                  <SelectTrigger className="h-12 rounded-xl bg-background/60 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="otp"><span className="flex items-center gap-2">📧 Email OTP</span></SelectItem>
                    <SelectItem value="secret"><span className="flex items-center gap-2">🔐 Admin Secret Code</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {otpVerifyMethod === "otp" ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground font-medium">Enter 6-digit OTP</Label>
                    <p className="text-xs text-muted-foreground">Sent to <strong className="text-foreground">{email}</strong></p>
                    <Input value={otpCode}
                      onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                      placeholder="• • • • • •" maxLength={6}
                      className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-background/60 border-border/60 rounded-xl"
                      autoFocus />
                  </div>
                  <div className="text-center">
                    <button type="button" onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || resendingOtp}
                      className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline inline-flex items-center gap-1.5 transition-colors">
                      {resendingOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground font-medium">Admin Secret Code</Label>
                  <p className="text-xs text-muted-foreground">Enter the master admin secret code to bypass OTP</p>
                  <div className="relative group">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input type="password" value={adminSecretCode}
                      onChange={(e) => setAdminSecretCode(e.target.value)}
                      placeholder="Enter admin secret code"
                      className="pl-10 h-14 bg-background/60 border-border/60 rounded-xl text-center text-lg tracking-wider font-bold focus:border-primary"
                      autoFocus />
                  </div>
                </div>
              )}

              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={loading || (otpVerifyMethod === "otp" && otpCode.length !== 6) || (otpVerifyMethod === "secret" && !adminSecretCode)}
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.4)]">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : otpVerifyMethod === "otp" ? "Verify OTP & Login" : "Verify Secret & Login"}
                </Button>
              </motion.div>
              <Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => { setOtpStep(false); setOtpCode(""); setAdminSecretCode(""); }}>
                ← Back to Login
              </Button>
            </form>
          )}

          <div className="text-center">
            <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back to Home</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
