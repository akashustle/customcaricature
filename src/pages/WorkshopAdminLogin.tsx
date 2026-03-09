import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Sparkles } from "lucide-react";

const WorkshopAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_admin");
    if (stored) navigate("/workshop-admin");
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
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

      // Get profile name
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", data.user.id).single();

      const adminInfo = { id: data.user.id, email: data.user.email, name: profile?.full_name || data.user.email };
      localStorage.setItem("workshop_admin", JSON.stringify(adminInfo));

      // Log admin login
      await supabase.from("workshop_admin_log" as any).insert({
        admin_id: data.user.id,
        admin_name: adminInfo.name,
        action: "login",
        details: "Logged into Workshop Admin Panel",
      } as any);

      // Register in workshop_admins table
      await supabase.from("workshop_admins" as any).upsert({
        user_id: data.user.id,
        name: adminInfo.name,
        email: data.user.email,
      } as any, { onConflict: "user_id" } as any);

      toast({ title: "Welcome, Admin! 🎓" });
      navigate("/workshop-admin");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
      <motion.div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} animate={{ scale: [1, 1.3, 1], x: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #ec4899, transparent)" }} animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 10, repeat: Infinity }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <motion.div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <img src="/logo.png" alt="Creative Caricature Club" className="w-full h-full object-cover" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Workshop Admin</h1>
            <p className="text-white/50 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Creative Caricature Club
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com"
                  className="pl-10 h-12 bg-white/5 border-white/20 text-white placeholder:text-white/30 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="pl-10 h-12 bg-white/5 border-white/20 text-white placeholder:text-white/30 rounded-xl"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={handleLogin} disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-base font-semibold shadow-lg shadow-purple-500/25">
                {loading ? "Logging in..." : "Login"}
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkshopAdminLogin;
