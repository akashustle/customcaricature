import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Phone, Sparkles, Calendar, Clock, Mail, MessageCircle,
  ArrowRight, ArrowLeft, CheckCircle, Users, Award, Star, Palette,
  Globe, BookOpen, FileText, Download, Play, ChevronDown, User,
  Zap, Monitor, Languages, Target, UserCheck,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

type WorkshopData = {
  id: string;
  title: string;
  description: string;
  dates: string;
  duration: string;
  highlights: string[];
  price: string;
  contact_whatsapp: string;
  status: string;
  is_active: boolean;
  registration_enabled: boolean;
  brochure_image_url: string;
  brochure_pdf_url: string;
  instructor_name: string;
  instructor_title: string;
  instructor_bio: string;
  instructor_stats: { label: string; value: string }[];
  faq: { question: string; answer: string }[];
  what_you_learn: string[];
  who_is_for: string[];
  workshop_mode: string;
  workshop_language: string;
  skill_level: string;
  requirements: string;
  max_participants: number;
  preview_video_url: string;
};

const defaultWorkshop: WorkshopData = {
  id: "",
  title: "Caricature Masterclass Workshop",
  description: "Learn the art of caricature from professional artists.",
  dates: "Coming Soon",
  duration: "6 Hours",
  highlights: ["Live demonstrations", "Hands-on practice", "Personal feedback", "Certificate of completion"],
  price: "₹1,999",
  contact_whatsapp: "8433843725",
  status: "upcoming",
  is_active: true,
  registration_enabled: false,
  brochure_image_url: "",
  brochure_pdf_url: "",
  instructor_name: "Ritesh Gupta",
  instructor_title: "Founder & Lead Artist, Creative Caricature Club",
  instructor_bio: "With over 10 years of professional experience, Ritesh has trained thousands of artists and delivered live caricature entertainment at corporate events, weddings, and brand activations across India.",
  instructor_stats: [
    { label: "Professional Experience", value: "10+ Years" },
    { label: "Students Trained", value: "5000+" },
    { label: "Workshops Conducted", value: "100+" },
    { label: "Event Coverage", value: "Pan-India" },
  ],
  faq: [
    { question: "What materials do I need for the workshop?", answer: "Basic drawing supplies including pencils, erasers, and paper. A detailed supply list will be sent upon registration." },
    { question: "Will I receive a recording of the workshop?", answer: "Yes, all registered participants receive access to the workshop recording for a limited period." },
    { question: "Do I need prior drawing experience?", answer: "No prior caricature experience is required. Basic drawing skills are helpful but not mandatory." },
    { question: "Is there a certificate provided after completion?", answer: "Yes, all participants who complete the workshop receive a certificate of completion." },
  ],
  what_you_learn: [
    "Master the fundamentals of facial feature exaggeration and proportion",
    "Develop speed sketching techniques for live event environments",
    "Learn professional shading and linework for polished caricatures",
    "Understand client interaction and commercial workflow practices",
    "Create portfolio-ready caricature artwork in multiple styles",
  ],
  who_is_for: [
    "Aspiring artists looking to enter the professional caricature industry",
    "Illustrators wanting to add live event entertainment to their skillset",
    "Beginners with basic drawing experience ready to specialize",
    "Creative professionals seeking alternative income streams",
    "Anyone passionate about portrait art and character storytelling",
  ],
  workshop_mode: "Live Online",
  workshop_language: "English & Hindi",
  skill_level: "Beginner to Intermediate",
  requirements: "Drawing materials & stable internet",
  max_participants: 60,
  preview_video_url: "",
};

const Workshop = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"details" | "login" | "register">("details");
  const [loginType, setLoginType] = useState<"mobile" | "email">("mobile");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [workshop, setWorkshop] = useState<WorkshopData>(defaultWorkshop);
  const [slots, setSlots] = useState<string[]>(["12pm-3pm", "6pm-9pm"]);
  const [whatsappNumber, setWhatsappNumber] = useState("8433843725");
  const [regStep, setRegStep] = useState(0);
  const [regForm, setRegForm] = useState({
    name: "", email: "", mobile: "", instagram_id: "", age: "",
    occupation: "", artist_background: "no", why_suitable: "", slot: "",
    password: "",
  });
  const [loginPassword, setLoginPassword] = useState("");
  const [submittingReg, setSubmittingReg] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (stored) { navigate("/workshop/dashboard"); return; }
    fetchActiveWorkshop();
  }, []);

  const fetchActiveWorkshop = async () => {
    // Get active workshop from workshops table
    const { data: wsData } = await supabase.from("workshops").select("*").eq("is_active", true).limit(1);
    if (wsData && (wsData as any[]).length > 0) {
      const w = (wsData as any[])[0];
      setWorkshop({
        ...defaultWorkshop,
        id: w.id,
        title: w.title || defaultWorkshop.title,
        description: w.description || defaultWorkshop.description,
        dates: w.dates || defaultWorkshop.dates,
        duration: w.duration || defaultWorkshop.duration,
        highlights: w.highlights?.length ? w.highlights : defaultWorkshop.highlights,
        price: w.price || defaultWorkshop.price,
        contact_whatsapp: w.contact_whatsapp || defaultWorkshop.contact_whatsapp,
        status: w.status || "upcoming",
        is_active: w.is_active,
        registration_enabled: w.registration_enabled ?? false,
        brochure_image_url: w.brochure_image_url || "",
        brochure_pdf_url: w.brochure_pdf_url || "",
        instructor_name: w.instructor_name || defaultWorkshop.instructor_name,
        instructor_title: w.instructor_title || defaultWorkshop.instructor_title,
        instructor_bio: w.instructor_bio || defaultWorkshop.instructor_bio,
        instructor_stats: (w.instructor_stats?.length ? w.instructor_stats : defaultWorkshop.instructor_stats) as any,
        faq: (w.faq?.length ? w.faq : defaultWorkshop.faq) as any,
        what_you_learn: w.what_you_learn?.length ? w.what_you_learn : defaultWorkshop.what_you_learn,
        who_is_for: w.who_is_for?.length ? w.who_is_for : defaultWorkshop.who_is_for,
        workshop_mode: w.workshop_mode || defaultWorkshop.workshop_mode,
        workshop_language: w.workshop_language || defaultWorkshop.workshop_language,
        skill_level: w.skill_level || defaultWorkshop.skill_level,
        requirements: w.requirements || defaultWorkshop.requirements,
        max_participants: w.max_participants || defaultWorkshop.max_participants,
        preview_video_url: w.preview_video_url || "",
      });
      setWhatsappNumber(w.contact_whatsapp || "8433843725");
    }
    // Also check workshop_settings for slots
    const { data: settingsData } = await supabase.from("workshop_settings" as any).select("*");
    if (settingsData) {
      (settingsData as any[]).forEach((s: any) => {
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
      // Verify password if user has one set
      if (users[0].password && users[0].password !== loginPassword) {
        toast({ title: "Incorrect Password", description: "Please enter the correct password.", variant: "destructive" }); setLoading(false); return;
      }
      localStorage.setItem("workshop_user", JSON.stringify(users[0]));
      toast({ title: `Welcome, ${users[0].name}! 🎨` });
      navigate("/workshop/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!regForm.name || !regForm.email || !regForm.mobile || !regForm.slot || !regForm.password) {
      toast({ title: "Please fill all required fields (including password)", variant: "destructive" }); return;
    }
    setSubmittingReg(true);
    try {
      // Check if already registered in workshop
      const { data: existing } = await supabase.from("workshop_users" as any).select("id").or(`email.eq.${regForm.email.trim().toLowerCase()},mobile.eq.${regForm.mobile.trim()}`);
      if (existing && (existing as any[]).length > 0) {
        toast({ title: "Already Registered", description: "Please login.", variant: "destructive" });
        setView("login");
        setSubmittingReg(false);
        return;
      }

      // Check if user exists in main CCC platform (profiles table)
      const { data: cccProfile } = await supabase.from("profiles").select("user_id, full_name, email, mobile").or(`email.eq.${regForm.email.trim().toLowerCase()},mobile.eq.${regForm.mobile.trim()}`).limit(1);
      if (cccProfile && (cccProfile as any[]).length > 0) {
        toast({
          title: "🎨 You're already a CCC member!",
          description: "Login to your CCC account and register for the workshop from your Dashboard → Workshop tab.",
          duration: 8000,
        });
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
        password: regForm.password,
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
  const isRegistrationOpen = workshop.registration_enabled;

  const detailItems = [
    { icon: Calendar, label: "Date", value: workshop.dates, sub: isRegistrationOpen ? "Registration closes 24 hours prior" : "Registration will begin soon" },
    { icon: Clock, label: "Duration", value: workshop.duration, sub: "Includes breaks and Q&A" },
    { icon: Monitor, label: "Mode", value: workshop.workshop_mode, sub: "Interactive video session" },
    { icon: Languages, label: "Language", value: workshop.workshop_language, sub: "Questions accepted in both" },
    { icon: Target, label: "Skill Level", value: workshop.skill_level, sub: "No prior caricature experience required" },
    { icon: BookOpen, label: "Requirements", value: workshop.requirements, sub: "Detailed supply list sent upon registration" },
    { icon: Users, label: "Group Size", value: `Limited to ${workshop.max_participants} participants`, sub: "Ensures personalized attention" },
  ];

  // Registration View
  if (view === "register") {
    const regSteps = [
      <div key="step0" className="space-y-4">
        <h3 className="font-body font-bold text-foreground">Personal Information</h3>
        <div><Label>Full Name *</Label><Input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} placeholder="Your full name" /></div>
        <div><Label>Email *</Label><Input type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder="your@email.com" /></div>
        <div><Label>Mobile Number *</Label><Input value={regForm.mobile} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setRegForm({...regForm, mobile: d}); }} placeholder="10-digit number" maxLength={10} /></div>
        <div><Label>Password *</Label><Input type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} placeholder="Create a password for login" /></div>
        <div><Label>Instagram ID</Label><Input value={regForm.instagram_id} onChange={e => setRegForm({...regForm, instagram_id: e.target.value})} placeholder="@yourid" /></div>
      </div>,
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
        <div><Label>Why is this workshop suitable for you?</Label><Textarea value={regForm.why_suitable} onChange={e => setRegForm({...regForm, why_suitable: e.target.value})} placeholder="Tell us why..." rows={3} /></div>
      </div>,
      <div key="step2" className="space-y-4">
        <h3 className="font-body font-bold text-foreground">Select Your Slot *</h3>
        <RadioGroup value={regForm.slot} onValueChange={v => setRegForm({...regForm, slot: v})} className="space-y-3">
          {slots.map(slot => (
            <div key={slot} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${regForm.slot === slot ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <RadioGroupItem value={slot} id={`slot-${slot}`} />
              <Label htmlFor={`slot-${slot}`} className="cursor-pointer flex items-center gap-2 font-body"><Clock className="w-4 h-4 text-primary" />{SLOT_LABELS[slot] || slot}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>,
    ];

    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24 md:pb-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="font-calligraphy text-2xl font-bold text-foreground">Workshop Registration</h2>
                <p className="text-sm text-muted-foreground font-body">Step {regStep + 1} of {regSteps.length}</p>
                <div className="flex gap-1 mt-3 justify-center">
                  {regSteps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i <= regStep ? "w-8 bg-primary" : "w-4 bg-border"}`} />
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={regStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {regSteps[regStep]}
                </motion.div>
              </AnimatePresence>
              <div className="flex gap-3">
                {regStep > 0 && <Button variant="outline" onClick={() => setRegStep(regStep - 1)} className="flex-1 rounded-full"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>}
                <Button variant="outline" onClick={() => setView("details")} className="rounded-full">Cancel</Button>
                {regStep < regSteps.length - 1 ? (
                  <Button onClick={() => {
                {regStep === 0 && (!regForm.name || !regForm.email || !regForm.mobile || !regForm.password)} { toast({ title: "Fill required fields (including password)", variant: "destructive" }); return; }
                    setRegStep(regStep + 1);
                  }} className="flex-1 rounded-full">Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
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
  if (view === "login") {
    const whatsappLink = `https://wa.me/91${whatsappNumber}?text=${encodeURIComponent("Hi, I'm unable to login to the Creative Caricature Club Workshop. Can you help me?")}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24 md:pb-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
          <Card>
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-3">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-border shadow-lg">
                  <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
                </motion.div>
                <h1 className="font-calligraphy text-3xl font-bold text-foreground">Workshop Login</h1>
                <p className="text-muted-foreground text-sm font-body flex items-center justify-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Creative Caricature Club</p>
              </div>
              <div className="flex bg-muted rounded-xl p-1">
                <button onClick={() => setLoginType("mobile")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-body font-medium transition-all ${loginType === "mobile" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}><Phone className="w-4 h-4" /> Mobile</button>
                <button onClick={() => setLoginType("email")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-body font-medium transition-all ${loginType === "email" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}><Mail className="w-4 h-4" /> Email</button>
              </div>
              <div className="space-y-4">
                {loginType === "mobile" ? (
                  <div className="space-y-2">
                    <Label className="font-body text-sm">Mobile Number</Label>
                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={mobile} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setMobile(d); }} placeholder="Enter registered mobile" className="pl-10 h-12 rounded-xl" maxLength={10} onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="font-body text-sm">Email Address</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter registered email" className="pl-10 h-12 rounded-xl" onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
                  </div>
                )}
                <Button onClick={handleLogin} disabled={loading} className="w-full h-12 rounded-xl text-base font-body font-semibold">
                  {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> : "Login to Workshop"}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl font-body text-sm" onClick={() => setView("details")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                  {isRegistrationOpen && <Button variant="outline" className="flex-1 rounded-xl font-body text-sm border-primary text-primary" onClick={() => setView("register")}>Register <ArrowRight className="w-4 h-4 ml-1" /></Button>}
                </div>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl border border-green-200 bg-green-50/80 text-green-600 text-sm font-body font-medium hover:bg-green-100 transition-colors"><MessageCircle className="w-4 h-4" /> Can't login? Contact WhatsApp</a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Details View (Main Workshop Page)
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEOHead title={`${workshop.title} - Creative Caricature Club`} description={workshop.description} />
      
      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-28 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div key={i} className="absolute w-72 h-72 rounded-full bg-primary/5 blur-3xl"
              style={{ left: `${20 + i * 15}%`, top: `${10 + (i % 3) * 30}%` }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }} />
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 text-center max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-body font-semibold mb-6">
            <Sparkles className="w-4 h-4" /> {workshop.status === "live" ? "Live Workshop" : "Upcoming Workshop"}
          </div>
          <h1 className="font-calligraphy text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
            {workshop.status === "live" ? "Master Live Caricature Art" : workshop.title}
          </h1>
          <p className="font-body text-muted-foreground text-lg mb-8 leading-relaxed max-w-2xl mx-auto">{workshop.description || "Learn professional techniques from India's leading caricature artists. Perfect for aspiring artists and creative professionals."}</p>
          
          {isRegistrationOpen ? (
            <div className="space-y-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" onClick={() => setView("register")} className="rounded-full font-body text-base px-8 h-14 text-lg shadow-lg shadow-primary/20">
                  Register for {workshop.price} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              <p className="text-xs text-muted-foreground font-body">Instant confirmation • Secure payment</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
                  <div className="text-left">
                    <p className="font-body font-bold text-foreground">{workshop.dates}</p>
                    <p className="text-xs text-muted-foreground">Registration will begin soon</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setView("login")} className="w-full rounded-full font-body">
                  <User className="w-4 h-4 mr-2" /> Already Registered? Login
                </Button>
              </div>
            </div>
          )}

          {workshop.preview_video_url && (
            <motion.div whileHover={{ scale: 1.02 }} className="mt-6">
              <a href={workshop.preview_video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary font-body font-semibold text-sm hover:underline">
                <Play className="w-4 h-4" /> Watch Workshop Preview
              </a>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Instructor Section */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-2">Meet Your Instructor</p>
            <p className="text-muted-foreground font-body">Learn from one of India's most accomplished caricature artists</p>
          </motion.div>
          <Card className="overflow-hidden">
            <CardContent className="p-8 md:p-10">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-border shadow-lg flex-shrink-0">
                  <img src="/logo.png" alt={workshop.instructor_name} className="w-full h-full object-cover" />
                </motion.div>
                <div className="text-center md:text-left">
                  <h3 className="font-calligraphy text-2xl font-bold text-foreground">{workshop.instructor_name}</h3>
                  <p className="text-primary font-body text-sm font-semibold">{workshop.instructor_title}</p>
                  <p className="text-muted-foreground font-body text-sm mt-3 leading-relaxed">{workshop.instructor_bio}</p>
                </div>
              </div>
              {workshop.instructor_stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border">
                  {workshop.instructor_stats.map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                      <p className="font-calligraphy text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground font-body">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Brand trust */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 text-center">
            <Card><CardContent className="p-6">
              <p className="text-sm font-body font-semibold text-primary mb-2">Backed by Creative Caricature Club</p>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">India's premier caricature artist collective, trusted by government institutions and entertainment platforms. With a network of professional artists and a track record of over 1000 successful events.</p>
            </CardContent></Card>
          </motion.div>
        </div>
      </section>

      {/* Brochure */}
      {(workshop.brochure_image_url || workshop.brochure_pdf_url) && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    {workshop.brochure_image_url && (
                      <div className="w-full md:w-48 h-64 rounded-xl overflow-hidden border border-border shadow-md flex-shrink-0">
                        <img src={workshop.brochure_image_url} alt="Workshop Brochure" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-calligraphy text-xl font-bold text-foreground mb-2">Workshop Brochure 2026</h3>
                      <p className="text-sm text-muted-foreground font-body mb-4">Explore the full details — curriculum, schedule, pricing, and everything you need to know.</p>
                      <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        {workshop.brochure_image_url && (
                          <Button variant="outline" onClick={() => window.open(workshop.brochure_image_url, "_blank")} className="rounded-full font-body">
                            <FileText className="w-4 h-4 mr-2" /> View Brochure
                          </Button>
                        )}
                        {workshop.brochure_pdf_url && (
                          <a href={workshop.brochure_pdf_url} download>
                            <Button className="rounded-full font-body"><Download className="w-4 h-4 mr-2" /> Download PDF</Button>
                          </a>
                        )}
                      </div>
                      {workshop.brochure_pdf_url && <p className="text-xs text-muted-foreground mt-2 font-body">PDF • 6MB</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      {/* Workshop Details */}
      <section className="py-16 md:py-20 bg-card/50 border-y border-border/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground mb-2">Workshop Details</h2>
            <p className="text-muted-foreground font-body">Everything you need to know before you register</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detailItems.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-body">{item.label}</p>
                      <p className="font-body font-bold text-foreground">{item.value}</p>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">{item.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What You'll Learn */}
      {workshop.what_you_learn.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground mb-2">What You'll Learn</h2>
              <p className="text-muted-foreground font-body">From fundamental concepts to professional execution</p>
            </motion.div>
            <div className="space-y-3">
              {workshop.what_you_learn.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <Card><CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <p className="font-body text-sm text-foreground">{item}</p>
                  </CardContent></Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Who This Workshop Is For */}
      {workshop.who_is_for.length > 0 && (
        <section className="py-16 md:py-20 bg-card/50 border-y border-border/50">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground mb-2">Who This Workshop Is For</h2>
              <p className="text-muted-foreground font-body">Designed for artists ready to develop professional skills</p>
            </motion.div>
            <div className="space-y-3">
              {workshop.who_is_for.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <Card><CardContent className="p-4 flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />
                    <p className="font-body text-sm text-foreground">{item}</p>
                  </CardContent></Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Highlights */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-calligraphy text-3xl font-bold text-center mb-8 text-foreground">What You'll Get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workshop.highlights.map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card><CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {[Palette, Award, Users, CheckCircle][i % 4] && (() => { const Icon = [Palette, Award, Users, CheckCircle][i % 4]; return <Icon className="w-5 h-5 text-primary" />; })()}
                  </div>
                  <p className="font-body font-medium text-foreground">{h}</p>
                </CardContent></Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {workshop.faq.length > 0 && (
        <section className="py-16 md:py-20 bg-card/50 border-y border-border/50">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground mb-2">Frequently Asked Questions</h2>
              <p className="text-muted-foreground font-body">Everything you need to know about the workshop</p>
            </motion.div>
            <Accordion type="single" collapsible className="space-y-2">
              {workshop.faq.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4 bg-card">
                  <AccordionTrigger className="font-body text-sm font-semibold text-foreground py-4">{item.question}</AccordionTrigger>
                  <AccordionContent className="font-body text-sm text-muted-foreground pb-4">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-calligraphy text-3xl font-bold text-foreground mb-6">Transform Your Passion Into Professional Artistry</h2>
            <div className="space-y-3">
              {isRegistrationOpen ? (
                <Button size="lg" className="w-full rounded-full font-body text-base h-14" onClick={() => setView("register")}>
                  Register Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-card border border-border rounded-xl p-4 text-left">
                    <p className="text-sm font-body font-bold text-foreground">Registration opening soon!</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">Stay tuned for the upcoming workshop dates.</p>
                  </div>
                </div>
              )}
              <Button size="lg" variant="outline" className="w-full rounded-full font-body text-base h-14" onClick={() => setView("login")}>
                <User className="w-5 h-5 mr-2" /> Already Registered? Login
              </Button>
              <a href={`https://wa.me/91${whatsappNumber}?text=${encodeURIComponent("Hi! I'd like to know more about the CCC Workshop.")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-full border border-green-200 bg-green-50/80 text-green-600 text-sm font-body font-medium hover:bg-green-100 transition-colors">
                <MessageCircle className="w-4 h-4" /> Contact on WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Workshop;
