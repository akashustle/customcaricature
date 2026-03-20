import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Phone, Sparkles, Calendar, Clock, Mail, MessageCircle, ArrowRight, ArrowLeft, CheckCircle, Users, Award, Star, Palette } from "lucide-react";
import SEOHead from "@/components/SEOHead";

type WorkshopDetails = {
  title: string;
  description: string;
  dates: string;
  duration: string;
  highlights: string[];
  price: string;
  contact_whatsapp: string;
};

const defaultDetails: WorkshopDetails = {
  title: "Caricature Masterclass Workshop",
  description: "Learn the art of caricature from professional artists.",
  dates: "14 & 15 March 2026",
  duration: "3 hours per session",
  highlights: ["Live demonstrations", "Hands-on practice", "Personal feedback", "Certificate of completion"],
  price: "₹2,999",
  contact_whatsapp: "8433843725",
};

const Workshop = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"details" | "login" | "register">("details");
  const [loginType, setLoginType] = useState<"mobile" | "email">("mobile");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [workshopDetails, setWorkshopDetails] = useState<WorkshopDetails>(defaultDetails);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [slots, setSlots] = useState<string[]>(["12pm-3pm", "6pm-9pm"]);
  const [whatsappNumber, setWhatsappNumber] = useState("8433843725");

  // Registration form - multi-step
  const [regStep, setRegStep] = useState(0);
  const [regForm, setRegForm] = useState({
    name: "", email: "", mobile: "", instagram_id: "", age: "",
    occupation: "", artist_background: "no",
    why_suitable: "", slot: "",
  });
  const [submittingReg, setSubmittingReg] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (stored) { navigate("/workshop/dashboard"); return; }
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) {
      (data as any[]).forEach((s: any) => {
        if (s.id === "workshop_details" && s.value) setWorkshopDetails({ ...defaultDetails, ...s.value });
        if (s.id === "registration_enabled") setRegistrationEnabled(s.value?.enabled ?? false);
        if (s.id === "registration_slots" && s.value?.slots) setSlots(s.value.slots);
        if (s.id === "whatsapp_support_number" && s.value?.number) setWhatsappNumber(s.value.number);
      });
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      let query = supabase.from("workshop_users" as any).select("*");
      if (loginType === "mobile") {
        if (!mobile.trim() || mobile.trim().length < 10) { toast({ title: "Enter valid mobile", variant: "destructive" }); setLoading(false); return; }
        query = query.eq("mobile", mobile.trim());
      } else {
        if (!email.trim() || !email.includes("@")) { toast({ title: "Enter valid email", variant: "destructive" }); setLoading(false); return; }
        query = query.eq("email", email.trim().toLowerCase());
      }
      const { data, error } = await query;
      if (error) throw error;
      const users = data as any[];
      if (!users || users.length === 0) { toast({ title: "Not Registered", description: "Please register first or contact admin.", variant: "destructive" }); setLoading(false); return; }
      if (!users[0].is_enabled) { toast({ title: "Account Disabled", variant: "destructive" }); setLoading(false); return; }
      localStorage.setItem("workshop_user", JSON.stringify(users[0]));
      toast({ title: `Welcome, ${users[0].name}! 🎨` });
      navigate("/workshop/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!regForm.name || !regForm.email || !regForm.mobile || !regForm.slot) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    setSubmittingReg(true);
    try {
      // Check if already registered
      const { data: existing } = await supabase.from("workshop_users" as any).select("id").or(`email.eq.${regForm.email.trim().toLowerCase()},mobile.eq.${regForm.mobile.trim()}`);
      if (existing && (existing as any[]).length > 0) {
        toast({ title: "Already Registered", description: "You are already registered. Please login.", variant: "destructive" });
        setView("login");
        setSubmittingReg(false);
        return;
      }
      const { error } = await supabase.from("workshop_users" as any).insert({
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        mobile: regForm.mobile.trim(),
        instagram_id: regForm.instagram_id.trim() || null,
        age: regForm.age ? parseInt(regForm.age) : null,
        occupation: regForm.occupation.trim() || null,
        artist_background: regForm.artist_background === "yes",
        why_suitable: regForm.why_suitable.trim() || null,
        slot: regForm.slot,
        student_type: "registered_online",
        workshop_date: "2026-03-14",
      } as any);
      if (error) throw error;
      toast({ title: "Registration Successful! 🎉", description: "You can now login to the workshop." });
      setView("login");
      setEmail(regForm.email);
      setRegStep(0);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSubmittingReg(false); }
  };

  const SLOT_LABELS: Record<string, string> = { "12pm-3pm": "12 PM – 3 PM", "6pm-9pm": "6 PM – 9 PM" };

  const regSteps = [
    // Step 0: Personal Info
    <div key="step0" className="space-y-4">
      <h3 className="font-body font-bold text-foreground">Personal Information</h3>
      <div><Label>Full Name *</Label><Input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} placeholder="Your full name" /></div>
      <div><Label>Email *</Label><Input type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder="your@email.com" /></div>
      <div><Label>Mobile Number *</Label><Input value={regForm.mobile} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setRegForm({...regForm, mobile: d}); }} placeholder="10-digit number" maxLength={10} /></div>
      <div><Label>Instagram ID</Label><Input value={regForm.instagram_id} onChange={e => setRegForm({...regForm, instagram_id: e.target.value})} placeholder="@yourid" /></div>
    </div>,
    // Step 1: Background
    <div key="step1" className="space-y-4">
      <h3 className="font-body font-bold text-foreground">Your Background</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Age</Label><Input type="number" value={regForm.age} onChange={e => setRegForm({...regForm, age: e.target.value})} placeholder="Your age" /></div>
        <div><Label>Occupation</Label><Input value={regForm.occupation} onChange={e => setRegForm({...regForm, occupation: e.target.value})} placeholder="Student, Artist..." /></div>
      </div>
      <div>
        <Label>Do you have an artist background?</Label>
        <RadioGroup value={regForm.artist_background} onValueChange={v => setRegForm({...regForm, artist_background: v})} className="flex gap-6 mt-2">
          <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="bg-yes" /><Label htmlFor="bg-yes">Yes</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="no" id="bg-no" /><Label htmlFor="bg-no">No</Label></div>
        </RadioGroup>
      </div>
      <div>
        <Label>Why do you think this workshop is suitable for you?</Label>
        <Textarea value={regForm.why_suitable} onChange={e => setRegForm({...regForm, why_suitable: e.target.value})} placeholder="Tell us why..." rows={3} />
      </div>
    </div>,
    // Step 2: Select Slot
    <div key="step2" className="space-y-4">
      <h3 className="font-body font-bold text-foreground">Select Your Slot *</h3>
      <RadioGroup value={regForm.slot} onValueChange={v => setRegForm({...regForm, slot: v})} className="space-y-3">
        {slots.map(slot => (
          <div key={slot} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${regForm.slot === slot ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}>
            <RadioGroupItem value={slot} id={`slot-${slot}`} />
            <Label htmlFor={`slot-${slot}`} className="cursor-pointer flex items-center gap-2 font-body">
              <Clock className="w-4 h-4 text-accent" />
              {SLOT_LABELS[slot] || slot}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>,
  ];

  // Details View
  if (view === "details") {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Workshop - Creative Caricature Club" description={workshopDetails.description} />
        
        {/* Hero */}
        <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-br from-accent/5 via-background to-primary/5">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 text-center max-w-3xl">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }} className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-border shadow-lg mb-6">
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
            </motion.div>
            <h1 className="font-calligraphy text-4xl md:text-6xl font-bold text-foreground mb-4">{workshopDetails.title}</h1>
            <p className="font-body text-muted-foreground text-lg mb-8 leading-relaxed">{workshopDetails.description}</p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border shadow-sm">
                <Calendar className="w-4 h-4 text-accent" /><span className="font-body text-sm">{workshopDetails.dates}</span>
              </div>
              <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border shadow-sm">
                <Clock className="w-4 h-4 text-accent" /><span className="font-body text-sm">{workshopDetails.duration}</span>
              </div>
              <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border shadow-sm">
                <Star className="w-4 h-4 text-accent" /><span className="font-body font-bold text-sm">{workshopDetails.price}</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Highlights */}
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="font-calligraphy text-3xl font-bold text-center mb-8 text-foreground">What You'll Get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workshopDetails.highlights.map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="card-3d">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      {[Palette, Award, Users, CheckCircle][i % 4] && (() => { const Icon = [Palette, Award, Users, CheckCircle][i % 4]; return <Icon className="w-5 h-5 text-accent" />; })()}
                    </div>
                    <p className="font-body font-medium text-foreground">{h}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Buttons */}
        <section className="container mx-auto px-4 py-12 text-center max-w-lg pb-28 md:pb-12">
          <div className="space-y-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button size="lg" className="w-full rounded-full btn-3d font-body text-base" onClick={() => setView("login")}>
                Already Registered? Login <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
            {registrationEnabled && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" variant="outline" className="w-full rounded-full font-body text-base border-accent text-accent hover:bg-accent/5" onClick={() => setView("register")}>
                  <GraduationCap className="w-5 h-5 mr-2" /> Register Now
                </Button>
              </motion.div>
            )}
            <a href={`https://wa.me/91${workshopDetails.contact_whatsapp}?text=${encodeURIComponent("Hi! I'd like to know more about the CCC Workshop.")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-full border border-green-200 bg-green-50/80 text-green-600 text-sm font-body font-medium hover:bg-green-100 transition-colors">
              <MessageCircle className="w-4 h-4" /> Contact on WhatsApp
            </a>
          </div>
        </section>
      </div>
    );
  }

  // Registration View
  if (view === "register") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24 md:pb-4 bg-gradient-to-br from-accent/5 via-background to-primary/5">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="card-3d">
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="font-calligraphy text-2xl font-bold text-foreground">Workshop Registration</h2>
                <p className="text-sm text-muted-foreground font-body">Step {regStep + 1} of {regSteps.length}</p>
                <div className="flex gap-1 mt-3 justify-center">
                  {regSteps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i <= regStep ? "w-8 bg-accent" : "w-4 bg-border"}`} />
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={regStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {regSteps[regStep]}
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-3">
                {regStep > 0 && (
                  <Button variant="outline" onClick={() => setRegStep(regStep - 1)} className="flex-1 rounded-full">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                )}
                <Button variant="outline" onClick={() => setView("details")} className="rounded-full">
                  Cancel
                </Button>
                {regStep < regSteps.length - 1 ? (
                  <Button onClick={() => {
                    if (regStep === 0 && (!regForm.name || !regForm.email || !regForm.mobile)) {
                      toast({ title: "Fill required fields", variant: "destructive" }); return;
                    }
                    setRegStep(regStep + 1);
                  }} className="flex-1 rounded-full">
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleRegister} disabled={submittingReg || !regForm.slot} className="flex-1 rounded-full">
                    {submittingReg ? "Registering..." : "Submit"} <CheckCircle className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Login View
  const whatsappLink = `https://wa.me/91${whatsappNumber}?text=${encodeURIComponent("Hi, I'm unable to login to the Creative Caricature Club Workshop. Can you help me?")}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pb-24 md:pb-4 bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6 }} className="w-full max-w-md relative z-10">
        <Card className="card-3d">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-3">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-border shadow-lg">
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
              </motion.div>
              <h1 className="font-calligraphy text-3xl font-bold text-foreground">Workshop Login</h1>
              <p className="text-muted-foreground text-sm font-body flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" /> Creative Caricature Club
              </p>
            </div>

            <div className="flex bg-muted rounded-xl p-1">
              <button onClick={() => setLoginType("mobile")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-body font-medium transition-all ${loginType === "mobile" ? "bg-card shadow-sm text-accent" : "text-muted-foreground"}`}>
                <Phone className="w-4 h-4" /> Mobile
              </button>
              <button onClick={() => setLoginType("email")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-body font-medium transition-all ${loginType === "email" ? "bg-card shadow-sm text-accent" : "text-muted-foreground"}`}>
                <Mail className="w-4 h-4" /> Email
              </button>
            </div>

            <div className="space-y-4">
              {loginType === "mobile" ? (
                <div className="space-y-2">
                  <Label className="font-body text-sm">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={mobile} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setMobile(d); }}
                      placeholder="Enter registered mobile" className="pl-10 h-12 rounded-xl" maxLength={10} onKeyDown={e => e.key === "Enter" && handleLogin()} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="font-body text-sm">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter registered email" className="pl-10 h-12 rounded-xl" onKeyDown={e => e.key === "Enter" && handleLogin()} />
                  </div>
                </div>
              )}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={handleLogin} disabled={loading} className="w-full h-12 rounded-xl text-base font-body font-semibold">
                  {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> : "Login to Workshop"}
                </Button>
              </motion.div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl font-body text-sm" onClick={() => setView("details")}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                {registrationEnabled && (
                  <Button variant="outline" className="flex-1 rounded-xl font-body text-sm border-accent text-accent" onClick={() => setView("register")}>
                    Register <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-green-200 bg-green-50/80 text-green-600 text-sm font-body font-medium hover:bg-green-100 transition-colors">
                <MessageCircle className="w-4 h-4" /> Can't login? Contact WhatsApp
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Workshop;
