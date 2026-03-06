import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Palette, GraduationCap } from "lucide-react";

const Workshop = () => {
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginValue.trim()) {
      toast({ title: "Please enter your email or mobile number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const isEmail = loginValue.includes("@");
      const query = supabase.from("workshop_users" as any).select("*");
      const { data, error } = isEmail
        ? await query.eq("email", loginValue.trim().toLowerCase())
        : await query.eq("mobile", loginValue.trim());

      if (error) throw error;
      const users = data as any[];
      if (!users || users.length === 0) {
        toast({ title: "You are not registered for this workshop.", description: "Please contact the admin for registration.", variant: "destructive" });
        setLoading(false);
        return;
      }
      // Store workshop user in localStorage
      localStorage.setItem("workshop_user", JSON.stringify(users[0]));
      toast({ title: `Welcome, ${users[0].name}!` });
      navigate("/workshop/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Workshop Login</CardTitle>
          <CardDescription className="font-sans text-base">
            <span className="flex items-center justify-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Creative Caricature Club
            </span>
          </CardDescription>
          <div className="bg-primary/5 rounded-xl p-3 text-sm space-y-1">
            <p className="font-semibold text-foreground">🎨 2 Days Live Workshop</p>
            <p className="text-muted-foreground">14 March & 15 March 2026</p>
            <div className="flex gap-4 justify-center text-xs text-muted-foreground mt-1">
              <span>Slot 1: 12 PM – 3 PM</span>
              <span>Slot 2: 6 PM – 9 PM</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <Label className="font-sans">Email or Mobile Number</Label>
            <Input
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              placeholder="Enter your email or mobile"
              className="mt-1"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <Button onClick={handleLogin} disabled={loading} className="w-full font-sans text-base h-12">
            {loading ? "Logging in..." : "Login to Workshop"}
          </Button>
          <p className="text-xs text-center text-muted-foreground font-sans">
            Only pre-registered workshop participants can login.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Workshop;
