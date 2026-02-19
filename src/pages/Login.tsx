import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, KeyRound } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "secret_code">("password");

  const redirectAfterLogin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (roles && roles.length > 0) {
        navigate("/admin");
        return;
      }
      const { data: artistData } = await (supabase.from("artists").select("id") as any).eq("auth_user_id", session.user.id).maybeSingle();
      if (artistData) {
        navigate("/artist-dashboard");
        return;
      }
      navigate("/dashboard");
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      await redirectAfterLogin();
    }
    setLoading(false);
  };

  const handleSecretCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !secretCode) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
        body: { email: email.trim().toLowerCase(), secret_code: secretCode },
      });
      if (error) {
        toast({ title: "Login failed", description: "Could not connect. Please try again.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!data?.success) {
        toast({ title: "Login failed", description: data?.error || "Invalid credentials", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Use the token hash to verify OTP and create session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        toast({ title: "Login failed", description: "Could not verify. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Login successful!" });
        await redirectAfterLogin();
      }
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pb-16 md:pb-0">
      <Card className="w-full max-w-sm" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto mb-2 rounded-xl cursor-pointer" onClick={() => navigate("/")} />
          <CardTitle className="font-display text-2xl">Welcome Back</CardTitle>
          <CardDescription className="font-sans">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Email - always required */}
          <div className="mb-4">
            <Label className="font-sans">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {/* Login method tabs */}
          <div className="flex rounded-full border border-border mb-4 overflow-hidden">
            <button
              type="button"
              onClick={() => setLoginMethod("password")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-sans font-medium transition-colors ${
                loginMethod === "password"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod("secret_code")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-sans font-medium transition-colors ${
                loginMethod === "secret_code"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" /> Secret Code
            </button>
          </div>

          {loginMethod === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <Label className="font-sans">Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSecretCodeLogin} className="space-y-4">
              <div>
                <Label className="font-sans">Secret Code (4-digit)</Label>
                <Input
                  type="text"
                  value={secretCode}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "");
                    if (d.length <= 4) setSecretCode(d);
                  }}
                  maxLength={4}
                  placeholder="Enter your 4-digit secret code"
                  required
                  className="font-mono text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground font-sans mt-1">
                  Your secret code was provided during registration. Check your dashboard.
                </p>
              </div>
              <Button type="submit" disabled={loading || secretCode.length !== 4} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
                {loading ? "Signing in..." : "Sign In with Secret Code"}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center space-y-2">
            <a href="/register" className="text-sm text-primary font-sans hover:underline">Create an account</a>
            <span className="text-muted-foreground mx-2">•</span>
            <a href="/forgot-password" className="text-sm text-primary font-sans hover:underline">Forgot password?</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
