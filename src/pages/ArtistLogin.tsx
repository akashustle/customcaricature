import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Palette, Lock, Mail, KeyRound } from "lucide-react";

const withTimeout = async (promise: Promise<any>, ms = 10000) =>
  Promise.race([promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Request timed out.")), ms))]);

const ArtistLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "secret">("password");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      );
      if (authError || !authData.user) throw authError || new Error("Login failed");
      const { data: artist } = await withTimeout((supabase.from("artists").select("id") as any).eq("auth_user_id", authData.user.id).maybeSingle());
      if (!artist) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "This login is only for registered artists.", variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Welcome back! 🎨" });
      navigate("/artist-dashboard");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message || "Invalid credentials", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSecretCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !secretCode) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("login-with-secret-code", {
          body: { email: email.trim().toLowerCase(), secret_code: secretCode.trim(), login_type: "artist" },
        })
      );
      if (error) throw error;
      if (!data?.success) {
        toast({ title: "Login Failed", description: data?.error || "Invalid credentials", variant: "destructive" });
        setLoading(false);
        return;
      }
      // Verify OTP with the token hash
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      });
      if (verifyError) throw verifyError;

      // Verify artist role
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: artist } = await withTimeout(
          (supabase.from("artists").select("id") as any).eq("auth_user_id", session.session.user.id).maybeSingle()
        );
        if (!artist) {
          await supabase.auth.signOut();
          toast({ title: "Access Denied", description: "This login is only for registered artists.", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      toast({ title: "Welcome back! 🎨" });
      navigate("/artist-dashboard");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message || "Invalid credentials", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-secondary via-background to-muted">
      <motion.div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 bg-accent/15 blur-3xl"
        animate={{ scale: [1, 1.3, 1], x: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-20 right-10 w-80 h-80 rounded-full opacity-15 bg-primary/15 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 10, repeat: Infinity }} />

      <motion.div className="absolute top-[15%] left-[8%] text-4xl opacity-20 pointer-events-none" animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }}>🎨</motion.div>
      <motion.div className="absolute bottom-[25%] right-[12%] text-3xl opacity-15 pointer-events-none" animate={{ y: [0, 10, 0] }} transition={{ duration: 7, repeat: Infinity }}>🖌️</motion.div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-card/80 border border-border rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg"
              animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} />
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Artist Login</h1>
            </div>
            <p className="text-sm text-muted-foreground">Creative Caricature Club</p>
          </div>

          {/* Login method toggle */}
          <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
            <button onClick={() => setLoginMethod("password")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === "password" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Lock className="w-3.5 h-3.5 inline mr-1.5" />Password
            </button>
            <button onClick={() => setLoginMethod("secret")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === "secret" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <KeyRound className="w-3.5 h-3.5 inline mr-1.5" />Secret Code
            </button>
          </div>

          {loginMethod === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="artist@email.com" required
                    className="pl-10 h-12 bg-background/60 border-border rounded-xl focus:border-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required className="pl-10 pr-10 h-12 bg-background/60 border-border rounded-xl focus:border-primary" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In"}
                </Button>
              </motion.div>
            </form>
          ) : (
            <form onSubmit={handleSecretCodeLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="artist@email.com" required
                    className="pl-10 h-12 bg-background/60 border-border rounded-xl focus:border-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Secret Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPassword ? "text" : "password"} value={secretCode} onChange={(e) => setSecretCode(e.target.value)}
                    placeholder="Enter your secret code" required maxLength={10}
                    className="pl-10 pr-10 h-12 bg-background/60 border-border rounded-xl focus:border-primary" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In with Code"}
                </Button>
              </motion.div>
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

export default ArtistLogin;
