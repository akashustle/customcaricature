import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const validateSecretCode = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) setSecretCode(digits);
    setErrorMsg("");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
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
        if (data.error.toLowerCase().includes("secret code") || data.error.toLowerCase().includes("invalid")) {
          setErrorMsg("⚠️ The secret code you entered is incorrect. Please check and try again.");
          toast({ title: "Wrong Secret Code", description: "The secret code entered is incorrect.", variant: "destructive" });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast({ title: "Password Reset Successful!", description: "You can now login with your new password" });
      navigate("/login");
    } catch (err: any) {
      const msg = err.message || "Failed to reset password";
      if (msg.toLowerCase().includes("secret") || msg.toLowerCase().includes("invalid")) {
        setErrorMsg("⚠️ The secret code you entered is incorrect. Please check and try again.");
      } else if (msg.toLowerCase().includes("not found")) {
        setErrorMsg("⚠️ No account found with this email address.");
      } else {
        setErrorMsg(msg);
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto mb-2 rounded-xl cursor-pointer" onClick={() => navigate("/")} />
          <CardTitle className="font-display text-2xl">Reset Password</CardTitle>
          <CardDescription className="font-sans">
            Enter your email, secret code, and new password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label className="font-sans">Email</Label>
              <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }} required />
            </div>
            <div>
              <Label className="font-sans">4-digit Secret Code</Label>
              <Input value={secretCode} onChange={(e) => validateSecretCode(e.target.value)} maxLength={4} type="password" required placeholder="Enter your secret code" />
            </div>
            <div>
              <Label className="font-sans">New Password (min 6 characters)</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <Label className="font-sans">Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive font-sans">Passwords don't match</p>
            )}
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive font-sans font-medium">{errorMsg}</p>
              </div>
            )}
            <Button type="submit" disabled={loading || !email || secretCode.length !== 4 || newPassword.length < 6 || newPassword !== confirmPassword} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : "Reset Password"}
            </Button>
          </form>
          <p className="text-center text-sm font-sans mt-4">
            <a href="/login" className="text-primary hover:underline">Back to Login</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
