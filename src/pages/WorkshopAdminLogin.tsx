import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Shield, Mail, Lock } from "lucide-react";

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
      
      // Check admin role
      const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", data.user.id).eq("role", "admin");
      if (!roleData || (roleData as any[]).length === 0) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "You don't have workshop admin access.", variant: "destructive" });
        setLoading(false);
        return;
      }

      localStorage.setItem("workshop_admin", JSON.stringify({ id: data.user.id, email: data.user.email }));
      toast({ title: "Welcome, Admin! 🎓" });
      navigate("/workshop-admin");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border border-white/20">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Workshop Admin</h1>
            <p className="text-white/50 text-sm">Admin access only</p>
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
            <Button onClick={handleLogin} disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-base font-semibold">
              {loading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkshopAdminLogin;
