import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

const withTimeout = async (promise: Promise<any>, ms = 10000) => {
  return await Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out. Please try again.")), ms)),
  ]);
};

const ArtistLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border border-border shadow-2xl bg-card/95">
        <CardHeader className="text-center space-y-2">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto rounded-xl cursor-pointer" onClick={() => navigate("/")} />
          <CardTitle className="font-display text-2xl text-foreground">Artist Login</CardTitle>
          <p className="text-sm text-muted-foreground font-body">Creative Caricature Club</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="font-body">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <div>
              <Label className="font-body">Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full font-body">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</> : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate("/")} className="text-xs text-muted-foreground hover:text-primary font-body transition-colors">← Back to Home</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtistLogin;
