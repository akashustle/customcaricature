import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Shield, Lock, Mail, KeyRound } from "lucide-react";

const withTimeout = async (promise: Promise<any>, ms = 10000) => {
  return await Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out.")), ms)),
  ]);
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
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
        // Log failed login - not an admin
        await supabase.from("admin_failed_logins" as any).insert({
          email: email.trim().toLowerCase(), reason: "not_authorized",
          ip_address: null, device_info: navigator.userAgent.slice(0, 200),
        });
        toast({ title: "Access Denied", description: "Not authorized for admin access.", variant: "destructive" });
        return;
      }

      // Check active sessions — max 5 concurrent
      const { data: activeSessions } = await supabase.from("admin_sessions").select("id").eq("is_active", true);
      if (activeSessions && activeSessions.length >= 5) {
        await supabase.auth.signOut();
        toast({ title: "Session Limit Reached", description: "Maximum 5 concurrent admin sessions. Please ask an admin to end a session.", variant: "destructive" });
        return;
      }

      // Check login tracking — OTP required after every 5 logins
      const { data: tracking } = await supabase.from("admin_login_tracking" as any).select("*").eq("user_id", authData.user.id).maybeSingle();
      const totalLogins = (tracking as any)?.total_logins || 0;

      if (totalLogins > 0 && totalLogins % 5 === 0) {
        // Generate OTP and send via email
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await supabase.from("admin_login_tracking" as any).update({
          otp_code: otp,
          otp_required: true,
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        } as any).eq("user_id", authData.user.id);

        // Send OTP email
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: email.trim().toLowerCase(),
              subject: "Admin Login OTP - Creative Caricature Club",
              html: `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
                <h2 style="color:#b08d57;">🔐 Admin Login Verification</h2>
                <p>Your one-time password for admin login:</p>
                <div style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center;padding:16px;background:#fdf8f3;border-radius:8px;color:#b08d57;">${otp}</div>
                <p style="color:#666;font-size:12px;margin-top:16px;">This OTP expires in 10 minutes. If you did not request this, ignore this email.</p>
              </div>`,
            },
          });
        } catch {}

        setPendingUserId(authData.user.id);
        setOtpStep(true);
        // Sign out until OTP verified
        await supabase.auth.signOut();
        toast({ title: "OTP Required", description: "A 6-digit OTP has been sent to your email. Please verify to continue." });
        setLoading(false);
        return;
      }

      // Clear any previous session name to force re-entry
      sessionStorage.removeItem("admin_entered_name");

      toast({ title: "Welcome back, admin!" });
      navigate("/admin-panel", { replace: true });
    } catch (err: any) {
      // Log failed login attempt
      try {
        await supabase.from("admin_failed_logins" as any).insert({
          email: email.trim().toLowerCase(), reason: "invalid_credentials",
          ip_address: null, device_info: navigator.userAgent.slice(0, 200),
        });
        // Check if too many failed attempts — create security alert
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

      // OTP valid — clear it and re-authenticate
      await supabase.from("admin_login_tracking" as any).update({
        otp_code: null, otp_required: false, otp_expires_at: null,
        total_logins: (t.total_logins || 0) + 1,
        updated_at: new Date().toISOString(),
      } as any).eq("user_id", pendingUserId);

      // Re-sign in
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
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In as Admin"}
                </Button>
              </motion.div>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 text-center space-y-2">
                <KeyRound className="w-8 h-8 text-primary mx-auto" />
                <p className="text-sm font-semibold text-foreground">Email OTP Verification</p>
                <p className="text-xs text-muted-foreground">A 6-digit OTP has been sent to <strong>{email}</strong>. Enter it below to continue.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Enter OTP</Label>
                <Input
                  value={otpCode}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 6) setOtpCode(v); }}
                  placeholder="123456"
                  maxLength={6}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-background/60 border-border rounded-xl"
                  autoFocus
                />
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
