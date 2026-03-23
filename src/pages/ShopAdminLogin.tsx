import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Store, Lock, Mail, KeyRound, Sparkles } from "lucide-react";

const ShopAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password
      });
      if (authError || !authData.user) throw authError || new Error("Login failed");

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", authData.user.id) as any;
      const isShopAdmin = roles?.some((r: any) => r.role === "shop_admin" || r.role === "admin");
      if (!isShopAdmin) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "Not authorized for shop admin.", variant: "destructive" });
        return;
      }

      if (secretCode) {
        const { data: profile } = await supabase.from("profiles").select("secret_code").eq("user_id", authData.user.id).maybeSingle();
        if (profile?.secret_code && profile.secret_code !== secretCode.trim()) {
          await supabase.auth.signOut();
          toast({ title: "Invalid secret code", variant: "destructive" });
          return;
        }
      }

      toast({ title: "Welcome to Shop Admin!" });
      navigate("/shop-admin", { replace: true });
    } catch (err: any) {
      toast({ title: "Login Failed", description: err?.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%),radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.1),transparent_50%)] bg-background">
      <motion.div className="absolute top-20 right-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--accent)/0.15))" }}
        animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
      <motion.div className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "linear-gradient(225deg, hsl(var(--accent)/0.2), hsl(var(--primary)/0.1))" }}
        animate={{ scale: [1.1, 1, 1.1], x: [0, 20, 0] }} transition={{ duration: 9, repeat: Infinity }} />

      {[...Array(4)].map((_, i) => (
        <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-primary/25 pointer-events-none"
          style={{ top: `${20 + i * 18}%`, left: `${12 + i * 20}%` }}
          animate={{ y: [0, -15, 0], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.4 }} />
      ))}

      <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-card/85 border border-border/50 rounded-3xl shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.2),0_0_0_1px_hsl(var(--border)/0.5)] p-8 space-y-6">
          <div className="text-center space-y-3">
            <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-[0_8px_30px_-5px_hsl(var(--primary)/0.3)]"
              animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} />
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Shop Admin</h1>
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Sparkles className="w-4 h-4 text-primary/60" />
              </motion.div>
            </div>
            <p className="text-sm text-muted-foreground">Creative Caricature Club - Store</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground font-medium">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" required
                  className="pl-10 h-12 bg-background/60 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground font-medium">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required className="pl-10 pr-10 h-12 bg-background/60 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground font-medium">Secret Code (Optional)</Label>
              <div className="relative group">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input type="text" value={secretCode} onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="4-digit code" maxLength={4} className="pl-10 h-12 bg-background/60 border-border/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_-3px_hsl(var(--primary)/0.5)] transition-all">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In to Shop Admin"}
              </Button>
            </motion.div>
          </form>

          <div className="text-center">
            <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back to Home</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ShopAdminLogin;
