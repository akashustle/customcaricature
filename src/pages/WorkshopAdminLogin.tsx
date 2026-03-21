import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Sparkles, Loader2, Eye, EyeOff } from "lucide-react";

const WorkshopAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_admin");
    if (stored) navigate("/workshop-admin-panel");
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password.trim()) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", data.user.id).eq("role", "admin");
      if (!roleData || (roleData as any[]).length === 0) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "You don't have workshop admin access.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", data.user.id).single();
      const adminInfo = { id: data.user.id, email: data.user.email, name: profile?.full_name || data.user.email };
      localStorage.setItem("workshop_admin", JSON.stringify(adminInfo));

      await supabase.from("workshop_admin_log" as any).insert({
        admin_id: data.user.id, admin_name: adminInfo.name, action: "login", details: "Logged into Workshop Admin Panel",
      } as any);

      await supabase.from("workshop_admins" as any).upsert({
        user_id: data.user.id, name: adminInfo.name, email: data.user.email,
      } as any, { onConflict: "user_id" } as any);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try { await supabase.from("workshop_user_locations" as any).upsert({ user_id: data.user.id, lat: pos.coords.latitude, lng: pos.coords.longitude, location_allowed: true, location_name: "Admin Location", last_updated: new Date().toISOString() } as any, { onConflict: "user_id" }); } catch {}
          },
          async () => {
            try { await supabase.from("workshop_user_locations" as any).upsert({ user_id: data.user.id, lat: 0, lng: 0, location_allowed: false, location_name: "Admin - Denied", last_updated: new Date().toISOString() } as any, { onConflict: "user_id" }); } catch {}
          }
        );
      }

      toast({ title: "Welcome, Admin! 🎓" });
      navigate("/workshop-admin-panel");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning ☀️";
    if (h < 17) return "Good Afternoon 🌤️";
    return "Good Evening 🌙";
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, hsl(280 25% 97%) 0%, hsl(340 20% 96%) 35%, hsl(210 30% 96%) 65%, hsl(38 25% 96%) 100%)" }}>

      <motion.div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, hsl(280 50% 60%), transparent)" }}
        animate={{ scale: [1, 1.3, 1], x: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, hsl(340 55% 58%), transparent)" }}
        animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 10, repeat: Infinity }} />
      <motion.div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, hsl(38 88% 50%), transparent)" }}
        animate={{ y: [0, -25, 0] }} transition={{ duration: 6, repeat: Infinity }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-white/50 border border-white/30 rounded-3xl shadow-2xl shadow-purple-200/20 p-8 space-y-6">
          <div className="text-center space-y-3">
            <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-200/40 shadow-lg shadow-purple-200/20"
              animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate("/")} />
            </motion.div>
            <p className="text-sm font-medium" style={{ color: "hsl(280 50% 55%)" }}>{getGreeting()}</p>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: "hsl(280 50% 55%)" }} />
              <h1 className="text-2xl font-bold text-foreground">Workshop Admin</h1>
            </div>
            <p className="text-sm text-muted-foreground">Creative Caricature Club</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com"
                  className="pl-10 h-12 bg-white/60 border-purple-100 rounded-xl focus:border-purple-400 focus:ring-purple-200" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 bg-white/60 border-purple-100 rounded-xl focus:border-purple-400 focus:ring-purple-200" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-purple-300/20"
                style={{ background: "linear-gradient(135deg, hsl(280 50% 55%), hsl(340 55% 55%))" }}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</> : "Login"}
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

export default WorkshopAdminLogin;
