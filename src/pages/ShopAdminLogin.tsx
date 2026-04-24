import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Lock, Mail, KeyRound, Store } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

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
    <>
      <SEOHead title="Shop Admin Login" noindex />
      <AuthShell
        title="Shop Admin Login"
        subtitle="Manage your Creative Caricature Club store with ease."
        badge="Store"
        accent="amber"
        heroTitle="Run the Caricature Store"
        heroSubtitle="Update products, track orders, and keep your shop fresh — all from one beautiful panel."
      >
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                required
                className="pl-10 h-12"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-10 pr-10 h-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Secret Code <span className="text-slate-400 normal-case font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="4-digit code"
                maxLength={4}
                className="pl-10 h-12"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-semibold mt-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
            ) : (
              <><Store className="w-4 h-4 mr-2" /> Sign in to Shop Admin</>
            )}
          </Button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </AuthShell>
    </>
  );
};

export default ShopAdminLogin;
