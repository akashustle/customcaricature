import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Store, Lock, Mail, KeyRound } from "lucide-react";

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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-secondary via-background to-muted">

      <motion.div className="absolute top-20 right-20 w-72 h-72 rounded-full opacity-20 bg-primary/15 blur-3xl"
        animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
      <motion.div className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-15 bg-accent/15 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], x: [0, 20, 0] }} transition={{ duration: 9, repeat: Infinity }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-card/80 border border-border rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg"
              animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} />
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Shop Admin</h1>
            </div>
            <p className="text-sm text-muted-foreground">Creative Caricature Club - Store</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" required
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
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Secret Code (Optional)</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="text" value={secretCode} onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="4-digit code" maxLength={4} className="pl-10 h-12 bg-background/60 border-border rounded-xl focus:border-primary" />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg">
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
