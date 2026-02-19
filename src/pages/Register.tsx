import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { validateEmailFormat } from "@/lib/email-validation";
import { Eye, EyeOff } from "lucide-react";
import LocationDropdowns from "@/components/LocationDropdowns";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "", mobile: "", email: "", instagramId: "",
    address: "", city: "", state: "", district: "", pincode: "",
    password: "", confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "email") {
      const error = validateEmailFormat(value);
      setEmailError(error || "");
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


  const canSubmit = form.fullName.trim() && form.mobile.length === 10 &&
    !emailError && form.email.includes("@") && form.address.trim() && form.city.trim() &&
    form.state.trim() && form.district.trim() && form.pincode.length === 6 && form.password.length >= 6 &&
    form.password === form.confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    const emailErr = validateEmailFormat(form.email);
    if (emailErr) { setEmailError(emailErr); return; }
    
    setLoading(true);
    try {
      const { data: existing } = await supabase.from("profiles").select("email").eq("email", form.email).maybeSingle();
      if (existing) {
        toast({ title: "Email Already Registered", description: "This email is already in use.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: form.fullName, mobile: form.mobile,
            instagram_id: form.instagramId || null, address: form.address,
            city: form.city, state: form.state, pincode: form.pincode,
          },
        },
      });
      if (error) {
        if (error.message?.toLowerCase().includes("already registered")) {
          toast({ title: "Email Already Registered", description: "Please login or use a different email.", variant: "destructive" });
          setLoading(false); return;
        }
        throw error;
      }
      if (!data.user) throw new Error("Registration failed");

      toast({ title: "Registration Successful!", description: "Please check your email to verify your account, then login. Your secret code for password recovery will be available in your Dashboard." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 pb-20 md:pb-8">
      <Card className="w-full max-w-md" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="text-center">
          <img src="/logo.png" alt="CCC" className="w-16 h-16 mx-auto mb-2 rounded-xl cursor-pointer" onClick={() => navigate("/")} />
          <CardTitle className="font-display text-2xl">Create Account</CardTitle>
          <CardDescription className="font-sans">Register to track your caricature orders</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label className="font-sans">Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Your full name" />
              {!form.fullName.trim() && form.email.trim() && <p className="text-xs text-destructive font-sans mt-1">Please fill your name</p>}
            </div>
            <div>
              <Label className="font-sans">Mobile Number * (10 digits)</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted rounded-md border border-input text-sm font-sans">+91</div>
                <Input value={form.mobile} onChange={(e) => validateMobile(e.target.value)} placeholder="9876543210" maxLength={10} />
              </div>
              {form.mobile && form.mobile.length < 10 && <p className="text-xs text-destructive font-sans mt-1">Enter 10-digit mobile number</p>}
            </div>
            <div>
              <Label className="font-sans">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@gmail.com" />
              {emailError && <p className="text-xs text-destructive font-sans mt-1">{emailError}</p>}
              <p className="text-xs text-muted-foreground font-sans mt-1">Allowed: Gmail, Hotmail, Outlook, Yahoo, Zohomail</p>
            </div>
            <div><Label className="font-sans">Instagram ID</Label><Input value={form.instagramId} onChange={(e) => update("instagramId", e.target.value)} placeholder="@yourusername" /></div>
            <div>
              <Label className="font-sans">Full Address *</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="House no, Street, Area" />
              {!form.address.trim() && form.fullName.trim() && form.mobile.length === 10 && <p className="text-xs text-destructive font-sans mt-1">Please fill your address</p>}
            </div>
            
            {/* Location Dropdowns */}
            <LocationDropdowns
              state={form.state}
              district={form.district}
              city={form.city}
              onStateChange={(v) => setForm(prev => ({ ...prev, state: v, district: "", city: "" }))}
              onDistrictChange={(v) => setForm(prev => ({ ...prev, district: v, city: "" }))}
              onCityChange={(v) => setForm(prev => ({ ...prev, city: v }))}
            />
            
            <div><Label className="font-sans">Pincode * (6 digits)</Label><Input value={form.pincode} onChange={(e) => validatePincode(e.target.value)} placeholder="400001" maxLength={6} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-sans">Password *</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 chars" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="font-sans">Confirm *</Label>
                <div className="relative">
                  <Input type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter" className="pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-destructive font-sans">Passwords don't match</p>
            )}
            {/* Secret Code Info */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <Label className="font-sans font-semibold text-sm">🔑 Secret Code for Password Recovery</Label>
              <p className="text-xs text-muted-foreground font-sans">A unique secret code will be automatically generated for your account. You can view and copy it from your Dashboard after logging in. You'll need it to reset your password.</p>
            </div>
            <Button type="submit" disabled={!canSubmit || loading} className="w-full rounded-full font-sans bg-primary hover:bg-primary/90">
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
