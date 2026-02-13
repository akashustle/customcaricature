import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "", mobile: "", email: "", instagramId: "",
    address: "", city: "", state: "", pincode: "",
    password: "", confirmPassword: "", secretCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "email") {
      if (value.trim() && !value.includes("@")) {
        setEmailError("Please enter a valid email with @ included");
      } else {
        setEmailError("");
      }
    }
  };

  const validateMobile = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 10) update("mobile", digits);
  };

  const validatePincode = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 6) update("pincode", digits);
  };

  const validateSecretCode = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) update("secretCode", digits);
  };

  const canSubmit = form.fullName.trim() && form.mobile.length === 10 &&
    form.email.includes("@") && form.address.trim() && form.city.trim() &&
    form.state.trim() && form.pincode.length === 6 && form.password.length >= 6 &&
    form.password === form.confirmPassword && form.secretCode.length === 4;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);

    try {
      // Check if email already exists in profiles
      const { data: existing } = await supabase.from("profiles").select("email").eq("email", form.email).maybeSingle();
      if (existing) {
        toast({ title: "Email Already Registered", description: "This email is already in use. Please login or use a different email.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        if (error.message?.toLowerCase().includes("already registered")) {
          toast({ title: "Email Already Registered", description: "This email is already in use. Please login or use a different email.", variant: "destructive" });
          setLoading(false);
          return;
        }
        throw error;
      }
      if (!data.user) throw new Error("Registration failed");

      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        full_name: form.fullName,
        mobile: form.mobile,
        email: form.email,
        instagram_id: form.instagramId || null,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        secret_code: form.secretCode,
      });
      if (profileError) console.error("Profile creation error:", profileError);

      toast({ title: "Registration Successful!", description: "Please check your email to verify your account, then login." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto mb-2 rounded-xl" />
          <CardTitle className="font-display text-2xl">Create Account</CardTitle>
          <CardDescription className="font-sans">Register to track your caricature orders</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label className="font-sans">Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <Label className="font-sans">Mobile Number * (10 digits)</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted rounded-md border border-input text-sm font-sans">+91</div>
                <Input value={form.mobile} onChange={(e) => validateMobile(e.target.value)} placeholder="9876543210" maxLength={10} />
              </div>
            </div>
            <div>
              <Label className="font-sans">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@email.com" />
              {emailError && <p className="text-xs text-destructive font-sans mt-1">{emailError}</p>}
            </div>
            <div>
              <Label className="font-sans">Instagram ID</Label>
              <Input value={form.instagramId} onChange={(e) => update("instagramId", e.target.value)} placeholder="@yourusername" />
            </div>
            <div>
              <Label className="font-sans">Full Address *</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="House no, Street, Area" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-sans">City *</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Mumbai" />
              </div>
              <div>
                <Label className="font-sans">State *</Label>
                <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="Maharashtra" />
              </div>
            </div>
            <div>
              <Label className="font-sans">Pincode * (6 digits)</Label>
              <Input value={form.pincode} onChange={(e) => validatePincode(e.target.value)} placeholder="400001" maxLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-sans">Password *</Label>
                <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 chars" />
              </div>
              <div>
                <Label className="font-sans">Confirm Password *</Label>
                <Input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter" />
              </div>
            </div>
            {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-destructive font-sans">Passwords don't match</p>
            )}
            <div>
              <Label className="font-sans">Secret Code * (4 digits for password recovery)</Label>
              <Input value={form.secretCode} onChange={(e) => validateSecretCode(e.target.value)} placeholder="1234" maxLength={4} type="password" />
              <p className="text-xs text-muted-foreground font-sans mt-1">Remember this code — you'll need it to reset your password</p>
            </div>
            <Button type="submit" disabled={!canSubmit || loading} className="w-full rounded-full font-sans">
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm font-sans mt-4">
            Already have an account? <a href="/login" className="text-primary hover:underline">Sign In</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
