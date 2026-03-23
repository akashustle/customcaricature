import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, KeyRound, Sparkles, Mail, Phone, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

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

  const withTimeout = async (promise: Promise<any>, ms = 10000) => {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out. Please try again.")), ms)),
    ]);
  };

  // Check for returning Google OAuth users
  useEffect(() => {
    const checkGoogleReturn = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const provider = session.user.app_metadata?.provider;
        if (provider === "google") {
          await finalizeLogin();
        }
      }
    };
    checkGoogleReturn();
  }, []);

  const finalizeLogin = async () => {
    const { data: userData, error: userError } = await withTimeout(supabase.auth.getUser());
    if (userError || !userData.user) throw userError || new Error("Could not validate session");
    const [{ data: roles, error: rolesError }, { data: artistData, error: artistError }] = await Promise.all([
      withTimeout(supabase.from("user_roles").select("role").eq("user_id", userData.user.id) as any),
      withTimeout((supabase.from("artists").select("id") as any).eq("auth_user_id", userData.user.id).maybeSingle()),
    ]);
    if (rolesError || artistError) throw rolesError || artistError;
    if (roles && roles.length > 0) {
      await supabase.auth.signOut();
      toast({ title: "Admin account detected", description: "Please use the admin login page.", variant: "destructive" });
      navigate("/customcad75", { replace: true }); return;
    }
    if (artistData) {
      await supabase.auth.signOut();
      toast({ title: "Artist account detected", description: "Please use the artist login page.", variant: "destructive" });
      navigate("/artistlogin", { replace: true }); return;
    }
    navigate("/dashboard", { replace: true });
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/login",
      });
      if (result.error) {
        toast({ title: "Google login failed", description: String(result.error), variant: "destructive" });
        setGoogleLoading(false);
        return;
      }
      // If not redirected, check if user exists
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        // Check if user has a profile (registered)
        const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", userData.user.id).maybeSingle();
        if (!profile) {
          // Not registered - redirect to register
          await supabase.auth.signOut();
          toast({ title: "Account not found", description: "Please create an account first.", variant: "destructive" });
          navigate("/register");
          return;
        }
        await finalizeLogin();
      }
    } catch (err: any) {
      toast({ title: "Google login failed", description: err?.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
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
      const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
        body: { email: emailToUse, secret_code: secretCode },
      });
      if (error) { toast({ title: "Login failed", description: "Could not connect.", variant: "destructive" }); setLoading(false); return; }
      if (!data?.success) { toast({ title: "Login failed", description: data?.error || "Invalid credentials", variant: "destructive" }); setLoading(false); return; }
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (verifyError) toast({ title: "Login failed", description: "Could not verify.", variant: "destructive" });
      else { toast({ title: "Login successful!" }); await finalizeLogin(); }
    } catch (err: any) { toast({ title: "Login failed", description: err.message, variant: "destructive" }); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pb-24 md:pb-0 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%),radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.08),transparent_50%)] bg-background">
      <motion.div className="absolute top-0 right-0 w-96 h-96 opacity-20 pointer-events-none blur-3xl rounded-full"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.15))" }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-0 left-0 w-80 h-80 opacity-15 pointer-events-none blur-3xl rounded-full"
        style={{ background: "linear-gradient(225deg, hsl(var(--accent)/0.2), hsl(var(--primary)/0.1))" }}
        animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 6, repeat: Infinity }} />

      {[...Array(4)].map((_, i) => (
        <motion.div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-primary/25 pointer-events-none"
          style={{ top: `${15 + i * 20}%`, left: `${8 + i * 22}%` }}
          animate={{ y: [0, -12, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }} />
      ))}

      <motion.div initial={{ y: 30, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.6, type: "spring", bounce: 0.3 }} className="w-full max-w-sm relative z-10">
        <Card className="border border-border/50 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.2)] backdrop-blur-xl bg-card/92">
          <CardHeader className="text-center pb-4">
            <motion.div className="relative mx-auto mb-3" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto shadow-lg ring-2 ring-primary/20 cursor-pointer" onClick={() => navigate("/")}>
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
              </div>
              <motion.div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Sparkles className="w-3 h-3 text-primary-foreground" />
              </motion.div>
            </motion.div>
            <CardTitle className="font-display text-2xl text-foreground">Welcome Back</CardTitle>
            <CardDescription className="font-sans text-sm">Sign in to your caricature studio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Login Button */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button type="button" variant="outline" onClick={handleGoogleLogin} disabled={googleLoading}
                className="w-full h-11 rounded-xl font-sans font-medium gap-2 border-border/60 hover:bg-muted/50">
                {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                )}
                Continue with Google
              </Button>
            </motion.div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or sign in with</span></div>
            </div>

            {/* Login With selector */}
            <div>
              <Label className="font-sans text-sm font-medium">Login With</Label>
              <Select value={loginWith} onValueChange={(v: any) => setLoginWith(v)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email"><span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email Address</span></SelectItem>
                  <SelectItem value="phone"><span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Phone Number</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loginWith === "email" ? (
              <div>
                <Label className="font-sans text-sm font-medium">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" placeholder="you@email.com" />
              </div>
            ) : (
              <div>
                <Label className="font-sans text-sm font-medium">Phone Number</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))} required className="h-11 rounded-xl" placeholder="+91 9876543210" maxLength={13} />
              </div>
            )}

            <div>
              <Label className="font-sans text-sm font-medium">Login Method</Label>
              <Select value={loginMethod} onValueChange={(v: any) => setLoginMethod(v)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">🔒 Password</SelectItem>
                  <SelectItem value="secret_code">🔑 Secret Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loginMethod === "password" ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <Label className="font-sans text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10 h-11 rounded-xl" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-sans font-semibold text-base shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.3)]">
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </motion.div>
              </form>
            ) : (
              <form onSubmit={handleSecretCodeLogin} className="space-y-4">
                <div>
                  <Label className="font-sans text-sm font-medium">Secret Code (4-digit)</Label>
                  <Input type="text" value={secretCode} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 4) setSecretCode(d); }} maxLength={4} placeholder="• • • •" required className="font-mono text-center text-xl tracking-[0.5em] h-12 rounded-xl" />
                  <p className="text-xs text-muted-foreground font-sans mt-1">Available in your dashboard after first login.</p>
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button type="submit" disabled={loading || secretCode.length !== 4} className="w-full h-11 rounded-xl font-sans font-semibold shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.3)]">
                    {loading ? "Signing in..." : "Sign In with Code"}
                  </Button>
                </motion.div>
              </form>
            )}

            <div className="text-center space-y-1 pt-2">
              <div className="flex items-center justify-center gap-3 text-sm font-sans">
                <a href="/register" className="text-primary hover:underline font-medium">Create account</a>
                <span className="text-muted-foreground/40">•</span>
                <a href="/forgot-password" className="text-primary hover:underline font-medium">Forgot password?</a>
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground/60 mt-4 font-sans">Creative Caricature Club © {new Date().getFullYear()}</p>
      </motion.div>
    </div>
  );
};

export default Login;
