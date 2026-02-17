import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, KeyRound, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Reset tab state
  const [email, setEmail] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Know Password tab state
  const [kpEmail, setKpEmail] = useState("");
  const [kpSecretCode, setKpSecretCode] = useState("");
  const [kpLoading, setKpLoading] = useState(false);
  const [kpError, setKpError] = useState("");
  const [revealedPassword, setRevealedPassword] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer for revealed password
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (countdown === 0 && revealedPassword) {
      setRevealedPassword("");
      setKpSecretCode("");
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [countdown, revealedPassword]);

  const validateSecretCode = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) setter(digits);
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

  const handleKnowPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setKpLoading(true);
    setKpError("");
    setRevealedPassword("");
    try {
      const { data, error } = await supabase.functions.invoke("get-password-hint", {
        body: { email: kpEmail.trim().toLowerCase(), secret_code: kpSecretCode },
      });
      if (error) throw error;
      if (data?.error) {
        setKpError(data.error);
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      if (data?.password) {
        setRevealedPassword(data.password);
        setCountdown(15);
        toast({ title: "Password Generated!", description: "This is your new temporary password. It will disappear in 15 seconds." });
      }
    } catch (err: any) {
      setKpError(err.message || "Failed to retrieve password");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setKpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pb-16 md:pb-0">
      <Card className="w-full max-w-md" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto mb-2 rounded-xl cursor-pointer" onClick={() => navigate("/")} />
          <CardTitle className="font-display text-2xl">Password Recovery</CardTitle>
          <CardDescription className="font-sans">
            Reset your password or view your current password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reset" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="reset" className="flex-1 font-sans text-xs gap-1"><Lock className="w-3 h-3" />Reset Password</TabsTrigger>
              <TabsTrigger value="know" className="flex-1 font-sans text-xs gap-1"><ShieldCheck className="w-3 h-3" />Know Password</TabsTrigger>
            </TabsList>

            {/* Reset Password Tab */}
            <TabsContent value="reset">
              <form onSubmit={handleResetWithSecret} className="space-y-4">
                <div>
                  <Label className="font-sans">Email</Label>
                  <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }} required placeholder="Enter your registered email" />
                </div>
                <div>
                  <Label className="font-sans flex items-center gap-1"><KeyRound className="w-3 h-3" />4-digit Secret Code</Label>
                  <Input value={secretCode} onChange={(e) => validateSecretCode(e.target.value, setSecretCode)} maxLength={4} type="password" required placeholder="Enter your secret code" />
                  <p className="text-[10px] text-muted-foreground font-sans mt-1">Your secret code was provided during registration</p>
                </div>
                <div>
                  <Label className="font-sans">New Password (min 6 characters)</Label>
                  <div className="relative">
                    <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="font-sans">Confirm Password</Label>
                  <div className="relative">
                    <Input type={showConfirmPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
            </TabsContent>

            {/* Know Password Tab */}
            <TabsContent value="know">
              {revealedPassword ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="text-xs text-muted-foreground font-sans mb-2">Your new temporary password:</p>
                    <p className="text-2xl font-mono font-bold text-primary tracking-wider select-all">{revealedPassword}</p>
                    <p className="text-xs text-muted-foreground font-sans mt-2">Use this to login. You can change it in Settings.</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-destructive font-mono">{countdown}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">seconds remaining</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate("/login")} className="w-full rounded-full font-sans">
                    Go to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleKnowPassword} className="space-y-4">
                  <p className="text-xs text-muted-foreground font-sans">Enter your email and secret code to generate a temporary password. It will be visible for 15 seconds.</p>
                  <div>
                    <Label className="font-sans">Email</Label>
                    <Input type="email" value={kpEmail} onChange={(e) => { setKpEmail(e.target.value); setKpError(""); }} required placeholder="Enter your registered email" />
                  </div>
                  <div>
                    <Label className="font-sans flex items-center gap-1"><KeyRound className="w-3 h-3" />4-digit Secret Code</Label>
                    <Input value={kpSecretCode} onChange={(e) => validateSecretCode(e.target.value, setKpSecretCode)} maxLength={4} type="password" required placeholder="Enter your secret code" />
                  </div>
                  {kpError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive font-sans font-medium">{kpError}</p>
                    </div>
                  )}
                  <Button type="submit" disabled={kpLoading || !kpEmail || kpSecretCode.length !== 4} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
                    {kpLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Show My Password"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm font-sans mt-4">
            <a href="/login" className="text-primary hover:underline">Back to Login</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
