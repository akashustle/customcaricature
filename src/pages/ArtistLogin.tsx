import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Lock, Mail, KeyRound } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { saveCredentials, verifyOfflineCredentials, hasCachedCredentials } from "@/lib/offline-credentials";

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
    <>
      <SEOHead title="Artist Login" noindex />
      <AuthShell
        title="Artist Login"
        subtitle="Sign in to your artist dashboard"
        badge="Artist"
        heroTitle="Welcome back, artist"
        heroSubtitle="Manage your assigned events, payouts and earnings — all in one place."
        accent="rose"
      >
        {/* Login method toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-5">
          <button onClick={() => setLoginMethod("password")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === "password" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            <Lock className="w-3.5 h-3.5 inline mr-1.5" />Password
          </button>
          <button onClick={() => setLoginMethod("secret")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === "secret" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            <KeyRound className="w-3.5 h-3.5 inline mr-1.5" />Secret Code
          </button>
        </div>

        {loginMethod === "password" ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="artist@email.com" required className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl text-base font-semibold shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In"}
              </Button>
            </motion.div>
          </form>
        ) : (
          <form onSubmit={handleSecretCodeLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="artist@email.com" required className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">Secret Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input type={showPassword ? "text" : "password"} value={secretCode} onChange={(e) => setSecretCode(e.target.value)} placeholder="Enter your secret code" required maxLength={10} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl text-base font-semibold shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In with Code"}
              </Button>
            </motion.div>
          </form>
        )}

        <div className="text-center mt-5 pt-5 border-t border-slate-100">
          <button onClick={() => navigate("/")} className="text-xs text-slate-500 hover:text-primary transition-colors">← Back to Home</button>
        </div>
      </AuthShell>
    </>
  );
};

export default ArtistLogin;
