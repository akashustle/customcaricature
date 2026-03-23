import { useState } from "react";
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

const ADMIN_MASTER_SECRET = "01022006";

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
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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
        sessionStorage.removeItem("admin_entered_name");
        toast({ title: "Welcome back, admin!" });
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
      if (activeSessions && activeSessions.length >= 5) {
        await supabase.auth.signOut();
        toast({ title: "Session Limit Reached", description: "Maximum 5 concurrent admin sessions.", variant: "destructive" });
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

      sessionStorage.removeItem("admin_entered_name");
      toast({ title: "Welcome back, admin!" });
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
      if (adminSecretCode !== ADMIN_MASTER_SECRET) {
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

        sessionStorage.removeItem("admin_entered_name");
        toast({ title: "Secret Code Verified! Welcome back, admin! 🔐" });
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%),radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.1),transparent_50%)] bg-background">
      {/* Animated 3D blobs */}
      <motion.div className="absolute top-10 left-10 w-80 h-80 rounded-full opacity-25 blur-3xl"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--accent)/0.2))" }}
        animate={{ scale: [1, 1.3, 1], x: [0, 40, 0], rotate: [0, 90, 0] }} transition={{ duration: 12, repeat: Infinity }} />
      <motion.div className="absolute bottom-10 right-10 w-96 h-96 rounded-full opacity-15 blur-3xl"
        style={{ background: "linear-gradient(225deg, hsl(var(--accent)/0.3), hsl(var(--primary)/0.15))" }}
        animate={{ scale: [1.2, 1, 1.2], rotate: [0, -60, 0] }} transition={{ duration: 10, repeat: Infinity }} />
      <motion.div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full opacity-10 blur-3xl bg-primary/20"
        animate={{ y: [0, -30, 0] }} transition={{ duration: 7, repeat: Infinity }} />

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-primary/30"
          style={{ top: `${15 + i * 18}%`, left: `${10 + i * 20}%` }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }} />
      ))}

      <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-card/85 border border-border/50 rounded-3xl shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.25),0_0_0_1px_hsl(var(--border)/0.5)] p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-[0_8px_30px_-5px_hsl(var(--primary)/0.3)]"
              animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} />
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <Shield className="w-5 h-5 text-primary" />
              </motion.div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Admin Console
              </h1>
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Sparkles className="w-4 h-4 text-primary/60" />
              </motion.div>
            </div>
            <p className="text-sm text-muted-foreground">Creative Caricature Club • Secure Access</p>
          </div>

          {!otpStep ? (
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
