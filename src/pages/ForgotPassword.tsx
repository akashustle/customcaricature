import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const validateSecretCode = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) setSecretCode(digits);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if secret code matches
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("secret_code, user_id")
        .eq("email", email)
        .maybeSingle();

      if (error || !profiles) {
        toast({ title: "Error", description: "Email not found", variant: "destructive" });
        return;
      }
      if (profiles.secret_code !== secretCode) {
        toast({ title: "Error", description: "Invalid secret code", variant: "destructive" });
        return;
      }
      setVerified(true);
      toast({ title: "Verified!", description: "Enter your new password" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // We need an edge function to reset password by admin/secret code
      // For now use Supabase's standard password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast({ title: "Reset Link Sent", description: "Check your email for password reset link" });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto mb-2 rounded-xl" />
          <CardTitle className="font-display text-2xl">Reset Password</CardTitle>
          <CardDescription className="font-sans">Enter your email and secret code</CardDescription>
        </CardHeader>
        <CardContent>
          {!verified ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Label className="font-sans">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label className="font-sans">4-digit Secret Code</Label>
                <Input value={secretCode} onChange={(e) => validateSecretCode(e.target.value)} maxLength={4} type="password" required />
              </div>
              <Button type="submit" disabled={loading || secretCode.length !== 4} className="w-full rounded-full font-sans">
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label className="font-sans">New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div>
                <Label className="font-sans">Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full font-sans">
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
          <p className="text-center text-sm font-sans mt-4">
            <a href="/login" className="text-primary hover:underline">Back to Login</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
