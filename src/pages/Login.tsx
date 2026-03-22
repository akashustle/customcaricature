import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, KeyRound, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "secret_code">("password");

  const withTimeout = async (promise: Promise<any>, ms = 10000) => {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out. Please try again.")), ms)),
    ]);
  };

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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }));
      if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
      else await finalizeLogin();
    } catch (err: any) { toast({ title: "Login failed", description: err?.message || "Please try again.", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleSecretCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !secretCode) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-with-secret-code", {
        body: { email: email.trim().toLowerCase(), secret_code: secretCode },
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
    <div className="min-h-screen flex items-center justify-center px-4 pb-24 md:pb-0 relative overflow-hidden bg-gradient-to-br from-secondary via-background to-muted">
      <motion.div className="absolute top-0 right-0 w-96 h-96 opacity-20 pointer-events-none bg-primary/10 blur-3xl rounded-full" animate={{ scale: [1, 1.15, 1], rotate: [0, 5, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-0 left-0 w-80 h-80 opacity-15 pointer-events-none bg-accent/10 blur-3xl rounded-full" animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 6, repeat: Infinity }} />

      <motion.div className="absolute top-[15%] left-[8%] text-4xl opacity-20 pointer-events-none" animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }}>🎨</motion.div>
      <motion.div className="absolute top-[25%] right-[12%] text-3xl opacity-15 pointer-events-none" animate={{ y: [0, 10, 0], rotate: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity }}>✏️</motion.div>
      <motion.div className="absolute bottom-[20%] right-[8%] text-3xl opacity-15 pointer-events-none" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}>🖌️</motion.div>

      <motion.div initial={{ y: 30, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.6, type: "spring", bounce: 0.3 }} className="w-full max-w-sm relative z-10">
        <Card className="border border-border shadow-2xl backdrop-blur-sm bg-card/95">
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
            <div>
              <Label className="font-sans text-sm font-medium">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" placeholder="you@email.com" />
            </div>

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
                  <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-sans font-semibold text-base">
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
                  <Button type="submit" disabled={loading || secretCode.length !== 4} className="w-full h-11 rounded-xl font-sans font-semibold">
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
