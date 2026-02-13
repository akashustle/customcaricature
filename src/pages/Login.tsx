import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        if (roles && roles.length > 0) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto mb-2 rounded-xl cursor-pointer" onClick={() => navigate("/")} />
          <CardTitle className="font-display text-2xl">Welcome Back</CardTitle>
          <CardDescription className="font-sans">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="font-sans">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label className="font-sans">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <a href="/register" className="text-sm text-primary font-sans hover:underline">Create an account</a>
            <span className="text-muted-foreground mx-2">•</span>
            <a href="/forgot-password" className="text-sm text-primary font-sans hover:underline">Forgot password?</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
