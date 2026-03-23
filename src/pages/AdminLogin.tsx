import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Shield, Lock, Mail, KeyRound, RefreshCw } from "lucide-react";

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
      // Secret code login for admin
      if (loginMethod === "secret_code") {
        const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
          body: { email: email.trim().toLowerCase(), secret_code: secretCode },
        });
        if (error) { toast({ title: "Login failed", description: "Could not connect.", variant: "destructive" }); setLoading(false); return; }
        if (!data?.success) { toast({ title: "Login failed", description: data?.error || "Invalid credentials", variant: "destructive" }); setLoading(false); return; }
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
        if (verifyError) { toast({ title: "Login failed", description: "Could not verify.", variant: "destructive" }); setLoading(false); return; }

        // Verify admin role
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

      // Password login
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

      // Check active sessions — max 5
      const { data: activeSessions } = await supabase.from("admin_sessions").select("id").eq("is_active", true);
      if (activeSessions && activeSessions.length >= 5) {
        await supabase.auth.signOut();
        toast({ title: "Session Limit Reached", description: "Maximum 5 concurrent admin sessions.", variant: "destructive" });
        return;
      }

      // OTP check every 5 logins
      const { data: tracking } = await supabase.from("admin_login_tracking" as any).select("*").eq("user_id", authData.user.id).maybeSingle();
      const totalLogins = (tracking as any)?.total_logins || 0;

      if (totalLogins > 0 && totalLogins % 5 === 0) {
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await supabase.from("admin_login_tracking" as any).update({
          otp_code: otp, otp_required: true,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        } as any).eq("user_id", authData.user.id);

        try {
          await supabase.functions.invoke("send-otp-email", {
            body: { to: email.trim().toLowerCase(), otp },
          });
        } catch {}

        setPendingUserId(authData.user.id);
        setOtpStep(true);
        startResendCooldown();
        await supabase.auth.signOut();
        toast({ title: "OTP Required", description: "A 6-digit OTP has been sent to your email." });
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
    if (resendCooldown > 0 || !pendingUserId) return;
    setResendingOtp(true);
    try {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      await supabase.from("admin_login_tracking" as any).update({
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      } as any).eq("user_id", pendingUserId);

      await supabase.functions.invoke("send-otp-email", {
        body: { to: email.trim().toLowerCase(), otp },
      });
      startResendCooldown();
      toast({ title: "OTP Resent", description: "Check your email for the new code." });
    } catch {
      toast({ title: "Failed to resend OTP", variant: "destructive" });
    } finally {
      setResendingOtp(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6 || !pendingUserId) { toast({ title: "Enter 6-digit OTP", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data: tracking } = await supabase.from("admin_login_tracking" as any).select("*").eq("user_id", pendingUserId).maybeSingle();
      if (!tracking) throw new Error("No tracking record found");
      const t = tracking as any;
      if (t.otp_code !== otpCode) { toast({ title: "Invalid OTP", variant: "destructive" }); setLoading(false); return; }
      if (new Date(t.otp_expires_at) < new Date()) { toast({ title: "OTP Expired", description: "Please login again.", variant: "destructive" }); setOtpStep(false); setLoading(false); return; }

      await supabase.from("admin_login_tracking" as any).update({
        otp_code: null, otp_required: false, otp_expires_at: null,
        total_logins: (t.total_logins || 0) + 1,
        updated_at: new Date().toISOString(),
      } as any).eq("user_id", pendingUserId);

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInErr) throw signInErr;

      sessionStorage.removeItem("admin_entered_name");
      toast({ title: "OTP Verified! Welcome back, admin!" });
      navigate("/admin-panel", { replace: true });
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-secondary via-background to-muted">
      <motion.div className="absolute top-10 left-10 w-80 h-80 rounded-full opacity-20 bg-primary/20 blur-3xl"
        animate={{ scale: [1, 1.3, 1], x: [0, 40, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-10 right-10 w-96 h-96 rounded-full opacity-15 bg-accent/20 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 10, repeat: Infinity }} />
      <motion.div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full opacity-10 bg-primary/10 blur-3xl"
        animate={{ y: [0, -30, 0] }} transition={{ duration: 7, repeat: Infinity }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-card/80 border border-border rounded-3xl shadow-2xl shadow-primary/10 p-8 space-y-6">
          <div className="text-center space-y-3">
            <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/10"
              animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} />
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Admin Console</h1>
            </div>
            <p className="text-sm text-muted-foreground">Creative Caricature Club</p>
          </div>

          {!otpStep ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" required
                    className="pl-10 h-12 bg-background/60 border-border rounded-xl focus:border-primary focus:ring-primary/20" />
                </div>
              </div>

              {/* Login method dropdown */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Login Method</Label>
                <Select value={loginMethod} onValueChange={(v: any) => setLoginMethod(v)}>
                  <SelectTrigger className="h-12 rounded-xl bg-background/60 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password"><span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Password</span></SelectItem>
                    <SelectItem value="secret_code"><span className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Secret Code</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loginMethod === "password" ? (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" required className="pl-10 pr-10 h-12 bg-background/60 border-border rounded-xl focus:border-primary focus:ring-primary/20" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Secret Code (4-digit)</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="text" value={secretCode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 4) setSecretCode(d); }}
                      placeholder="• • • •" maxLength={4} required
                      className="pl-10 h-12 bg-background/60 border-border rounded-xl text-center text-xl tracking-[0.5em] font-bold focus:border-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Use the secret code assigned to your admin profile.</p>
                </div>
              )}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In as Admin"}
                </Button>
              </motion.div>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 text-center space-y-2">
                <KeyRound className="w-8 h-8 text-primary mx-auto" />
                <p className="text-sm font-semibold text-foreground">Email OTP Verification</p>
                <p className="text-xs text-muted-foreground">A 6-digit OTP has been sent to <strong>{email}</strong>.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Enter OTP</Label>
                <Input value={otpCode}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                  placeholder="123456" maxLength={6}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-background/60 border-border rounded-xl"
                  autoFocus />
              </div>

              {/* Resend OTP */}
              <div className="text-center">
                <button type="button" onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resendingOtp}
                  className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline inline-flex items-center gap-1.5">
                  {resendingOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={loading || otpCode.length !== 6}
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify & Login"}
                </Button>
              </motion.div>
              <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => { setOtpStep(false); setOtpCode(""); }}>
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
