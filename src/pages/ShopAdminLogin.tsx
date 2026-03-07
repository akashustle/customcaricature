import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Store, Eye, EyeOff } from "lucide-react";

const ShopAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password
      });
      if (authError || !authData.user) throw authError || new Error("Login failed");

      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", authData.user.id) as any;

      const isShopAdmin = roles?.some((r: any) => r.role === "shop_admin" || r.role === "admin");
      if (!isShopAdmin) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "Not authorized for shop admin.", variant: "destructive" });
        return;
      }

      // Verify secret code if provided
      if (secretCode) {
        const { data: profile } = await supabase
          .from("profiles").select("secret_code").eq("user_id", authData.user.id).maybeSingle();
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Store className="w-8 h-8 text-accent-foreground" />
            </div>
          </div>
          <CardTitle className="font-display text-2xl">Shop Admin</CardTitle>
          <p className="text-sm text-muted-foreground font-sans">Creative Caricature Club - Store</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="font-sans">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" required />
            </div>
            <div>
              <Label className="font-sans">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="font-sans">Secret Code (Optional)</Label>
              <Input type="text" value={secretCode} onChange={(e) => setSecretCode(e.target.value)} placeholder="4-digit code" maxLength={4} />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full font-sans">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In to Shop Admin"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-primary font-sans transition-colors">← Back to Home</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopAdminLogin;
