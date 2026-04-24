import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, KeyRound, Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const validateSecretCode = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) setSecretCode(digits);
  };

  const handleResetWithSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { email: email.trim().toLowerCase(), secret_code: secretCode, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) {
        setErrorMsg(data.error);
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Password Reset Successful!", description: "You can now login with your new password" });
      navigate("/login");
    } catch (err: any) {
      const msg = err.message || "Failed to reset password";
      setErrorMsg(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Password Recovery"
      subtitle="Reset using your email + 4-digit secret code"
      badge="Reset"
      heroTitle="Forgot your password?"
      heroSubtitle="No worries — use your registered email and the 4-digit secret code we generated for you to set a new one."
      accent="rose"
    >
      <form onSubmit={handleResetWithSecret} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="font-sans text-sm text-slate-700">Email</Label>
          <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }} required placeholder="Enter your registered email" />
        </div>
        <div className="space-y-1.5">
          <Label className="font-sans text-sm text-slate-700 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" />4-digit Secret Code</Label>
          <Input value={secretCode} onChange={(e) => validateSecretCode(e.target.value)} maxLength={4} type="password" required placeholder="• • • •" className="font-mono text-center text-xl tracking-[0.5em] h-12" />
          <p className="text-[11px] text-slate-500 font-sans">Your secret code was provided during registration.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="font-sans text-sm text-slate-700">New Password (min 6 characters)</Label>
          <div className="relative">
            <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="pr-10" />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="font-sans text-sm text-slate-700">Confirm Password</Label>
          <div className="relative">
            <Input type={showConfirmPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pr-10" />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-destructive font-sans">Passwords don't match</p>
        )}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-sans font-medium">{errorMsg}</p>
          </div>
        )}
        <Button type="submit" disabled={loading || !email || secretCode.length !== 4 || newPassword.length < 6 || newPassword !== confirmPassword} className="w-full h-11 rounded-xl font-sans font-semibold shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : "Reset Password"}
        </Button>
      </form>

      <p className="text-center text-sm font-sans mt-5 text-slate-500">
        <a href="/login" className="text-primary hover:underline font-medium">← Back to Login</a>
      </p>
    </AuthShell>
  );
};

export default ForgotPassword;
