import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { playPaymentSuccessSound } from "@/lib/sounds";
import { initRazorpay, createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Phone, Sparkles, Calendar, Clock, Mail, MessageCircle,
  ArrowRight, ArrowLeft, CheckCircle, Users, Award, Star, Palette,
  Globe, BookOpen, FileText, Download, Play, ChevronDown, User,
  Zap, Monitor, Languages, Target, UserCheck,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import PageBuilderRenderer from "@/components/PageBuilderRenderer";
import AuthShell from "@/components/auth/AuthShell";
import CountrySearchSelect from "@/components/CountrySearchSelect";
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
  instructor_title: "Founder & Lead Artist, Creative Caricature Club™",
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
  const [view, setView] = useState<"details" | "login" | "register" | "reg-success">("details");
  const [loginType, setLoginType] = useState<"mobile" | "email">("mobile");
  const [loginMethod, setLoginMethod] = useState<"password" | "secret_code">("password");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [workshop, setWorkshop] = useState<WorkshopData>(defaultWorkshop);
  const [slots, setSlots] = useState<string[]>(["12pm-3pm", "6pm-9pm"]);
  const [whatsappNumber, setWhatsappNumber] = useState("8433843725");
  const [regStep, setRegStep] = useState(0);
  const [regForm, setRegForm] = useState({
    name: "", email: "", mobile: "", instagram_id: "", age: "",
    occupation: "", artist_background: "no", skill_level: "", artist_background_type: "",
    why_suitable: "", slot: "", password: "",
    country: "India", state: "", city: "", district: "",
    termsAccepted: false, noticeRead: false,
  });
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [payingNow, setPayingNow] = useState(false);
  const [allowInternational, setAllowInternational] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSecretCode, setLoginSecretCode] = useState("");
  const [submittingReg, setSubmittingReg] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<"upcoming" | "march-14-15">("upcoming");
  const [allWorkshops, setAllWorkshops] = useState<any[]>([]);
  const [secretCodeLoginEnabled, setSecretCodeLoginEnabled] = useState(false);

  // Progressive login state ----------------------------------------------------
  // Step 0: select identifier type → Step 1: enter identifier → Step 2: backend
  // tells us if the user is "registered" (show password) or "draft" (show
  // "Resume registration" CTA) or "new" (show "Register" CTA).
  const [loginPhase, setLoginPhase] = useState<"identifier" | "password" | "draft_resume" | "not_found">("identifier");
  const [draftRecord, setDraftRecord] = useState<any>(null);
  const [checkingIdentifier, setCheckingIdentifier] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_user");
    if (stored) { navigate("/workshop/dashboard"); return; }
    fetchActiveWorkshop();
    fetchSecretCodeSetting();
    fetchInternationalSetting();

    // Realtime: instantly reflect admin changes (registration toggle, status, active workshop, content).
    const ch = supabase
      .channel("public-workshop-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshops" }, () => {
        fetchActiveWorkshop();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings" }, () => {
        fetchActiveWorkshop();
        fetchSecretCodeSetting();
        fetchInternationalSetting();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings" }, () => {
        fetchInternationalSetting();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Draft persistence ──────────────────────────────────────────────────────
  // Save the in-progress registration form so the user can resume on re-login.
  // Idempotent: upserts by email/mobile so refreshing the form keeps a single row.
  const saveDraft = async (stepIndex: number, extraOverride?: Partial<typeof regForm>) => {
    const data = { ...regForm, ...(extraOverride || {}) };
    const email = (data.email || "").trim().toLowerCase();
    const mobile = (data.mobile || "").trim();
    if (!email && !mobile) return; // nothing to key on
    try {
      // Strip the password from the persisted payload — we'll re-collect it later.
      const { password: _pw, ...safePayload } = data as any;
      const payload: any = {
        name: data.name || null,
        email: email || null,
        mobile: mobile || null,
        current_step: stepIndex,
        form_payload: safePayload,
        payment_status: "pending",
        source: "workshop_signup",
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (draftId) {
        await supabase.from("workshop_registration_drafts" as any).update(payload).eq("id", draftId);
      } else {
        // Try to find existing draft for this contact
        const orFilter: string[] = [];
        if (email) orFilter.push(`email.eq.${email}`);
        if (mobile) orFilter.push(`mobile.eq.${mobile}`);
        const { data: existing } = await supabase.from("workshop_registration_drafts" as any)
          .select("id")
          .or(orFilter.join(","))
          .limit(1)
          .maybeSingle();
        if (existing && (existing as any).id) {
          setDraftId((existing as any).id);
          await supabase.from("workshop_registration_drafts" as any).update(payload).eq("id", (existing as any).id);
        } else {
          const { data: inserted } = await supabase.from("workshop_registration_drafts" as any)
            .insert({ ...payload, created_at: new Date().toISOString() })
            .select("id")
            .single();
          if (inserted) setDraftId((inserted as any).id);
        }
      }
    } catch (err) {
      // Drafts are best-effort — never block the user
      console.warn("Draft save failed (non-fatal):", err);
    }
  };

  const clearDraft = async () => {
    if (!draftId) return;
    try { await supabase.from("workshop_registration_drafts" as any).delete().eq("id", draftId); } catch {}
    setDraftId(null);
  };

  const fetchInternationalSetting = async () => {
    // Check both workshop_settings and admin_site_settings for the toggle
    const { data } = await supabase.from("workshop_settings" as any).select("*").eq("id", "allow_international_registration");
    if (data && (data as any[]).length > 0) {
      setAllowInternational((data as any[])[0].value?.enabled === true);
      return;
    }
    // Fallback: check admin_site_settings (where main admin stores this setting)
    const { data: adminData } = await supabase.from("admin_site_settings").select("*").eq("id", "allow_international_registration");
    if (adminData && adminData.length > 0) {
      setAllowInternational((adminData[0].value as any)?.enabled === true);
    }
  };

  const fetchSecretCodeSetting = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*").eq("id", "secret_code_login");
    if (data && (data as any[]).length > 0) {
      setSecretCodeLoginEnabled((data as any[])[0].value?.enabled === true);
    }
  };

  const fetchActiveWorkshop = async () => {
    // Fetch all workshops for batch selector
    const { data: allWs } = await supabase.from("workshops").select("*").order("created_at", { ascending: false });
    if (allWs) setAllWorkshops(allWs as any[]);

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

  // Determine if password is required based on batch
  const isPasswordRequired = selectedBatch === "upcoming";

  // ── Progressive login ──────────────────────────────────────────────────────
  // Step 1: user types email or mobile → we look them up in workshop_users
  // (paid/registered) and workshop_registration_drafts (incomplete) and route:
  //   • registered  → reveal password / secret code box
  //   • draft       → "Resume registration" CTA that loads form + jumps to step
  //   • not_found   → nudge them to "Register" CTA
  const checkIdentifier = async () => {
    const identifier = (loginType === "mobile" ? mobile.trim() : email.trim().toLowerCase());
    if (loginType === "mobile" ? identifier.length < 10 : !identifier.includes("@")) {
      toast({ title: `Enter a valid ${loginType}`, variant: "destructive" });
      return;
    }
    setCheckingIdentifier(true);
    try {
      // 1. Is this a registered (paid) workshop user? Use the existing RPC
      //    with credential_type "none" to safely probe without exposing the row.
      const { data: existingUsers } = await supabase.rpc("workshop_login" as any, {
        p_identifier: identifier,
        p_identifier_type: loginType,
        p_credential: "",
        p_credential_type: "none",
      });
      if ((existingUsers as any[])?.length) {
        setLoginPhase("password");
        return;
      }
      // 2. Is there an in-progress draft for this contact?
      const orFilter = loginType === "email"
        ? `email.eq.${identifier}`
        : `mobile.eq.${identifier}`;
      const { data: draft } = await supabase.from("workshop_registration_drafts" as any)
        .select("*")
        .or(orFilter)
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (draft) {
        setDraftRecord(draft);
        setDraftId((draft as any).id);
        setLoginPhase("draft_resume");
        return;
      }
      // 3. No record at all
      setLoginPhase("not_found");
    } catch (err: any) {
      toast({ title: "Lookup failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckingIdentifier(false);
    }
  };

  const resumeFromDraft = () => {
    if (!draftRecord) return;
    const payload = (draftRecord.form_payload as any) || {};
    setRegForm({
      ...regForm,
      ...payload,
      // Password is never persisted, force user to set it again at the final step.
      password: "",
      termsAccepted: !!payload.termsAccepted,
      noticeRead: !!payload.noticeRead,
    });
    // Jump to whichever step they last reached (clamped to 0..3)
    const step = Math.min(Math.max(Number(draftRecord.current_step ?? 0), 0), 3);
    setRegStep(step);
    setView("register");
    toast({
      title: "Welcome back! ✨",
      description: `Resuming from step ${step + 1} — your earlier answers have been restored.`,
    });
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const identifierType = loginType === "mobile" ? "mobile" : "email";
      const identifier = identifierType === "mobile" ? mobile.trim() : email.trim().toLowerCase();

      if (identifierType === "mobile") {
        if (!identifier || identifier.length < 10) { toast({ title: "Enter valid mobile", variant: "destructive" }); setLoading(false); return; }
      } else {
        if (!identifier || !identifier.includes("@")) { toast({ title: "Enter valid email", variant: "destructive" }); setLoading(false); return; }
      }

      let credentialType: "password" | "secret_code" | "none" = "none";
      let credential = "";
      if (loginMethod === "secret_code") {
        if (!loginSecretCode.trim()) { toast({ title: "Enter secret code", variant: "destructive" }); setLoading(false); return; }
        credentialType = "secret_code";
        credential = loginSecretCode.trim();
      } else if (isPasswordRequired) {
        credentialType = "password";
        credential = loginPassword || "";
      }

      // Verify credentials server-side via SECURITY DEFINER RPC.
      // Returns the workshop user row only when credentials match (no password field).
      const { data, error } = await supabase.rpc("workshop_login" as any, {
        p_identifier: identifier,
        p_identifier_type: identifierType,
        p_credential: credential,
        p_credential_type: credentialType,
      });
      if (error) throw error;
      const users = (data as any[]) || [];
      if (users.length === 0) {
        const msg = loginMethod === "secret_code" ? "Invalid Secret Code" : isPasswordRequired ? "Incorrect credentials" : "Not Registered";
        toast({ title: msg, description: "Please check your details or register first.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!users[0].is_enabled) { toast({ title: "Account Disabled", variant: "destructive" }); setLoading(false); return; }

      localStorage.setItem("workshop_user", JSON.stringify(users[0]));
      toast({ title: `Welcome, ${users[0].name}! 🎨` });
      navigate("/workshop/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // ── Pay-to-register ────────────────────────────────────────────────────────
  // The user only becomes a real workshop_user AFTER the payment succeeds.
  // Until then their progress lives in workshop_registration_drafts.
  // The button on the final step is "Pay & Register" — it opens Razorpay,
  // and the inserted workshop_users row is only created inside the payment
  // success handler.
  const handlePayAndRegister = async () => {
    if (!regForm.name || !regForm.email || !regForm.mobile || !regForm.slot || !regForm.password) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    if (!regForm.termsAccepted || !regForm.noticeRead) {
      toast({ title: "Please accept Terms & Conditions and the Notice", variant: "destructive" }); return;
    }
    if (regForm.country === "India" && (!regForm.state || !regForm.city)) {
      toast({ title: "Please select your State and City", variant: "destructive" }); return;
    }
    if (regForm.country !== "India" && !regForm.city) {
      toast({ title: "Please enter your City", variant: "destructive" }); return;
    }

    setSubmittingReg(true);
    try {
      // Block if a paid workshop user already exists with this email/mobile
      const { data: alreadyExists } = await supabase.rpc("workshop_user_exists" as any, {
        p_email: regForm.email.trim().toLowerCase(),
        p_mobile: regForm.mobile.trim(),
      });
      if (alreadyExists === true) {
        toast({ title: "Already Registered", description: "Please login instead.", variant: "destructive" });
        setView("login");
        setSubmittingReg(false);
        return;
      }

      // Make sure the latest snapshot is saved as a draft before opening Razorpay
      // — if the user closes the modal we can resume them later.
      await saveDraft(99);

      // Extract price number (e.g., "₹1,999" -> 1999)
      const priceNum = parseInt(workshop.price.replace(/[^0-9]/g, "")) || 1999;

      // Use a stable order id derived from the draft so verify-razorpay can match.
      const tempOrderRef = draftId || `wsdraft_${Date.now()}`;

      const rzpData = await createRazorpayOrder(supabase, {
        amount: priceNum,
        order_id: tempOrderRef,
        customer_name: regForm.name,
        customer_email: regForm.email,
        customer_mobile: regForm.mobile,
      });

      const options = {
        key: rzpData.razorpay_key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Creative Caricature Club™",
        description: `Workshop Registration - ${workshop.title}`,
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            // 1. Verify payment server-side
            await verifyRazorpayPayment(supabase, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: tempOrderRef,
            });

            // 2. NOW create the workshop_users row — payment is locked in.
            const { data: insertedData, error } = await supabase.from("workshop_users" as any).insert({
              name: regForm.name.trim(),
              email: regForm.email.trim().toLowerCase(),
              mobile: regForm.mobile.trim(),
              instagram_id: regForm.instagram_id.trim() || null,
              age: regForm.age ? parseInt(regForm.age) : null,
              occupation: regForm.occupation.trim() || null,
              artist_background: regForm.artist_background,
              skill_level: regForm.skill_level || null,
              artist_background_type: regForm.artist_background_type || null,
              why_join: regForm.why_suitable.trim() || null,
              slot: regForm.slot,
              student_type: "registered_online",
              workshop_date: "2026-03-14",
              password: regForm.password,
              country: regForm.country || "India",
              state: regForm.state || null,
              city: regForm.city || null,
              district: regForm.district || null,
              terms_accepted: regForm.termsAccepted,
              payment_status: "paid",
              payment_amount: priceNum,
              registration_step: 99,
            } as any).select("id").single();
            if (error) throw error;
            if (insertedData) setRegisteredUserId((insertedData as any).id);

            // 3. Cleanup the draft — registration is fully complete.
            await clearDraft();

            playPaymentSuccessSound();
            toast({
              title: "Payment Successful! 🎉",
              description: "Your seat is confirmed. You can now login.",
            });
            setView("reg-success");
          } catch (err: any) {
            toast({
              title: "Payment verification failed",
              description: err?.message || "Contact support if amount was deducted.",
              variant: "destructive",
            });
          }
        },
        prefill: { name: regForm.name, email: regForm.email, contact: regForm.mobile },
        theme: { color: "#b08d57" },
        modal: {
          ondismiss: () => {
            setSubmittingReg(false);
            toast({ title: "Payment cancelled", description: "Your progress was saved — login with your email or mobile to resume." });
          },
        },
      };
      await initRazorpay(options);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingReg(false);
    }
  };

  // Kept for backward-compat (registered_online users who still owe payment).
  const handleWorkshopPayment = async () => {
    if (!registeredUserId) return;
    setPayingNow(true);
    try {
      const priceNum = parseInt(workshop.price.replace(/[^0-9]/g, "")) || 1999;
      const rzpData = await createRazorpayOrder(supabase, {
        amount: priceNum, order_id: registeredUserId, customer_name: regForm.name, customer_email: regForm.email, customer_mobile: regForm.mobile,
      });
      const options = {
        key: rzpData.razorpay_key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Creative Caricature Club™",
        description: `Workshop Registration - ${workshop.title}`,
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment(supabase, {
              razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_id: registeredUserId,
            });
            await supabase.from("workshop_users" as any).update({
              payment_status: "paid",
              payment_amount: priceNum,
            } as any).eq("id", registeredUserId);
            playPaymentSuccessSound();
            toast({ title: "Payment Successful! 🎉", description: "Your seat is confirmed. You can now login." });
            setView("login");
            setEmail(regForm.email);
            setRegStep(0);
          } catch {
            toast({ title: "Payment verification failed", description: "Contact support if amount was deducted.", variant: "destructive" });
          }
        },
        prefill: { name: regForm.name, email: regForm.email, contact: regForm.mobile },
        theme: { color: "#b08d57" },
        modal: { ondismiss: () => setPayingNow(false) },
      };
      await initRazorpay(options);
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    } finally { setPayingNow(false); }
  };

  const SLOT_LABELS: Record<string, string> = { "12pm-3pm": "12 PM – 3 PM", "6pm-9pm": "6 PM – 9 PM" };
  const isRegistrationOpen = workshop.registration_enabled;

  const OCCUPATION_OPTIONS = ["Student", "Working Professional", "Freelance Artist", "Teacher/Educator", "Homemaker", "Business Owner", "Other"];
  const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Professional"];
  const BACKGROUND_TYPES = ["Self-taught", "Art Student", "Professional Artist", "Hobbyist", "No Art Background"];

  const detailItems = [
    { icon: Calendar, label: "Date", value: workshop.dates, sub: isRegistrationOpen ? "Registration closes 24 hours prior" : "Registration will begin soon" },
    { icon: Clock, label: "Duration", value: workshop.duration, sub: "Includes breaks and Q&A" },
    { icon: Monitor, label: "Mode", value: workshop.workshop_mode, sub: "Interactive video session" },
    { icon: Languages, label: "Language", value: workshop.workshop_language, sub: "Questions accepted in both" },
    { icon: Target, label: "Skill Level", value: workshop.skill_level, sub: "No prior caricature experience required" },
    { icon: BookOpen, label: "Requirements", value: workshop.requirements, sub: "Detailed supply list sent upon registration" },
    { icon: Users, label: "Group Size", value: `Limited to ${workshop.max_participants} participants`, sub: "Ensures personalized attention" },
  ];

  // Registration Success View with Payment Option
  if (view === "reg-success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-24 md:pb-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <Card>
            <CardContent className="p-8 space-y-6 text-center">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <CheckCircle className="w-16 h-16 mx-auto text-primary" />
              </motion.div>
              <div>
                <h2 className="font-calligraphy text-2xl font-bold text-foreground">Registration Complete! 🎉</h2>
                <p className="text-sm text-muted-foreground font-body mt-2">Welcome, {regForm.name}! Your spot is reserved.</p>
              </div>

              <div className="space-y-3">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-left">
                  <p className="text-sm font-bold text-foreground font-body">💳 Pay Now & Confirm Your Seat</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Pay {workshop.price} securely via Razorpay to lock your spot immediately.</p>
                </div>
                <Button onClick={handleWorkshopPayment} disabled={payingNow} className="w-full h-12 rounded-xl font-body font-semibold text-base">
                  {payingNow ? "Processing..." : `Pay ${workshop.price} Now`}
                </Button>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs text-muted-foreground font-body">Or pay later after admin approval</p>
                <Button variant="outline" onClick={() => { setView("login"); setEmail(regForm.email); setRegStep(0); }} className="w-full rounded-xl font-body">
                  <ArrowRight className="w-4 h-4 mr-2" /> Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Registration View
  if (view === "register") {
    const statesData = (() => { try { const { getStates } = require("@/lib/india-locations"); return getStates(); } catch { return []; } })();
    const districtsData = (() => { try { if (!regForm.state) return []; const { getDistricts } = require("@/lib/india-locations"); return getDistricts(regForm.state); } catch { return []; } })();
    const citiesData = (() => { try { if (!regForm.district) return []; const { getCities } = require("@/lib/india-locations"); return getCities(regForm.state, regForm.district); } catch { return []; } })();

    const regSteps = [
      // Step 1: Personal Info
      <div key="step0" className="space-y-4">
        <h3 className="font-body font-bold text-foreground">Personal Information</h3>
        <div><Label>Full Name *</Label><Input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} placeholder="Your full name" /></div>
        <div><Label>Email *</Label><Input type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder="your@email.com" /></div>
        <div><Label>WhatsApp Number *</Label><Input value={regForm.mobile} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setRegForm({...regForm, mobile: d}); }} placeholder="10-digit WhatsApp number" maxLength={10} /></div>
        <div><Label>Instagram ID</Label><Input value={regForm.instagram_id} onChange={e => setRegForm({...regForm, instagram_id: e.target.value})} placeholder="@yourid" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Age *</Label>
            <Select value={regForm.age} onValueChange={v => setRegForm({...regForm, age: v})}>
              <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Select age" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {Array.from({ length: 89 - 12 + 1 }, (_, i) => 12 + i).map(a => (
                  <SelectItem key={a} value={String(a)}>{a} years</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Occupation *</Label>
            <Select value={regForm.occupation} onValueChange={v => setRegForm({...regForm, occupation: v})}>
              <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {OCCUPATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>,

      // Step 2: Background & Motivation
      <div key="step1" className="space-y-4">
        <h3 className="font-body font-bold text-foreground">Your Background & Motivation</h3>
        <div>
          <Label>Skill Level *</Label>
          <Select value={regForm.skill_level} onValueChange={v => setRegForm({...regForm, skill_level: v})}>
            <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Select your skill level" /></SelectTrigger>
            <SelectContent>
              {SKILL_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Artist Background Type *</Label>
          <Select value={regForm.artist_background_type} onValueChange={v => setRegForm({...regForm, artist_background_type: v, artist_background: v === "No Art Background" ? "no" : "yes"})}>
            <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Select your background" /></SelectTrigger>
            <SelectContent>
              {BACKGROUND_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>What inspires you to join this workshop? *</Label>
          <Textarea value={regForm.why_suitable} onChange={e => setRegForm({...regForm, why_suitable: e.target.value})} placeholder="Share your creative journey and what you hope to achieve from this workshop..." rows={3} className="mt-1" />
        </div>
      </div>,

      // Step 3: Location
      <div key="step2" className="space-y-4">
        <h3 className="font-body font-bold text-foreground">Your Location</h3>
        <div>
          <Label>Country *</Label>
          <div className="mt-1">
            <CountrySearchSelect
              value={regForm.country || "India"}
              onChange={(v) => setRegForm({ ...regForm, country: v, state: "", district: "", city: "" })}
              placeholder="Select country (default India)"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">🌍 Default India · Search across 196 countries</p>
        </div>
        {regForm.country === "India" ? (
          <>
            <div>
              <Label>State *</Label>
              {regOtherState ? (
                <div className="space-y-1.5 mt-1">
                  <Input value={regForm.state} onChange={e => setRegForm({...regForm, state: e.target.value})} placeholder="Type your state" />
                  <button type="button" onClick={() => { setRegOtherState(false); setRegForm({...regForm, state: "", district: "", city: ""}); }} className="text-[11px] text-primary hover:underline">← Back to list</button>
                </div>
              ) : (
                <Select value={regForm.state} onValueChange={v => { if (v === "__other__") { setRegOtherState(true); setRegForm({...regForm, state: "", district: "", city: ""}); } else { setRegForm({...regForm, state: v, district: "", city: ""}); } }}>
                  <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-64">{statesData.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}<SelectItem value="__other__">Other (type manually)</SelectItem></SelectContent>
                </Select>
              )}
            </div>
            {regForm.state && (
              <div>
                <Label>District</Label>
                {regOtherDistrict || regOtherState ? (
                  <div className="space-y-1.5 mt-1">
                    <Input value={regForm.district} onChange={e => setRegForm({...regForm, district: e.target.value})} placeholder="Type your district" />
                    {!regOtherState && <button type="button" onClick={() => { setRegOtherDistrict(false); setRegForm({...regForm, district: "", city: ""}); }} className="text-[11px] text-primary hover:underline">← Back to list</button>}
                  </div>
                ) : (
                  <Select value={regForm.district} onValueChange={v => { if (v === "__other__") { setRegOtherDistrict(true); setRegForm({...regForm, district: "", city: ""}); } else { setRegForm({...regForm, district: v, city: ""}); } }}>
                    <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent className="max-h-64">{districtsData.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}<SelectItem value="__other__">Other (type manually)</SelectItem></SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div>
              <Label>City *</Label>
              {regOtherCity || regOtherDistrict || regOtherState || citiesData.length === 0 ? (
                <div className="space-y-1.5 mt-1">
                  <Input value={regForm.city} onChange={e => setRegForm({...regForm, city: e.target.value})} placeholder="Type your city" />
                  {!regOtherDistrict && !regOtherState && citiesData.length > 0 && (
                    <button type="button" onClick={() => { setRegOtherCity(false); setRegForm({...regForm, city: ""}); }} className="text-[11px] text-primary hover:underline">← Back to list</button>
                  )}
                </div>
              ) : (
                <Select value={regForm.city} onValueChange={v => { if (v === "__other__") { setRegOtherCity(true); setRegForm({...regForm, city: ""}); } else { setRegForm({...regForm, city: v}); } }}>
                  <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent className="max-h-64">{citiesData.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}<SelectItem value="__other__">Other (type manually)</SelectItem></SelectContent>
                </Select>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              🌍 You're registering from <span className="font-bold text-primary">{regForm.country}</span>. Just enter your city — state is optional.
            </div>
            <div><Label>State / Region (optional)</Label><Input value={regForm.state} onChange={e => setRegForm({...regForm, state: e.target.value})} placeholder="Your state or region" /></div>
            <div><Label>City *</Label><Input value={regForm.city} onChange={e => setRegForm({...regForm, city: e.target.value})} placeholder="Your city" /></div>
          </>
        )}
      </div>,

      // Step 4: Slot, Password & Terms
      <div key="step3" className="space-y-4">
        <h3 className="font-body font-bold text-foreground">Final Step</h3>
        <div>
          <Label>Select Your Slot *</Label>
          <Select value={regForm.slot} onValueChange={v => setRegForm({...regForm, slot: v})}>
            <SelectTrigger className="h-12 rounded-xl mt-1"><SelectValue placeholder="Choose a slot" /></SelectTrigger>
            <SelectContent>
              {slots.map(slot => (
                <SelectItem key={slot} value={slot}>{SLOT_LABELS[slot] || slot}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Set Password *</Label>
          <Input type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} placeholder="Create a secure password" className="mt-1" />
          <p className="text-[11px] text-muted-foreground mt-1">Your secret code will be available in your dashboard after registration.</p>
        </div>
        <div className="space-y-3 border-t border-border pt-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={regForm.termsAccepted} onChange={e => setRegForm({...regForm, termsAccepted: e.target.checked})} className="mt-1 w-4 h-4 accent-primary" />
            <span className="text-sm text-foreground">I accept the <a href="/workshop-policy" target="_blank" className="text-primary underline font-medium">Workshop Terms & Conditions</a> *</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={regForm.noticeRead} onChange={e => setRegForm({...regForm, noticeRead: e.target.checked})} className="mt-1 w-4 h-4 accent-primary" />
            <span className="text-sm text-foreground">I have read the workshop notice and understand the schedule, rules, and expectations *</span>
          </label>
        </div>
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
                  <Button onClick={async () => {
                    if (regStep === 0 && (!regForm.name || !regForm.email || !regForm.mobile || !regForm.age)) { toast({ title: "Fill all required fields", variant: "destructive" }); return; }
                    if (regStep === 1 && (!regForm.skill_level || !regForm.artist_background_type || !regForm.why_suitable)) { toast({ title: "Fill all background fields", variant: "destructive" }); return; }
                    if (regStep === 2) {
                      if (regForm.country === "India" && (!regForm.state || !regForm.city)) { toast({ title: "Please select your State and City", variant: "destructive" }); return; }
                      if (regForm.country !== "India" && !regForm.city) { toast({ title: "Please enter your City", variant: "destructive" }); return; }
                    }
                    // Persist progress before advancing — lets the user resume later.
                    await saveDraft(regStep + 1);
                    setRegStep(regStep + 1);
                  }} className="flex-1 rounded-full">Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
                ) : (
                  <Button onClick={handlePayAndRegister} disabled={submittingReg || !regForm.slot || !regForm.password || !regForm.termsAccepted || !regForm.noticeRead} className="flex-1 rounded-full">
                    {submittingReg ? "Processing..." : `Pay ${workshop.price} & Register`} <CheckCircle className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (view === "login") {
    const whatsappLink = `https://wa.me/91${whatsappNumber}?text=${encodeURIComponent("Hi, I'm unable to login to the Creative Caricature Club™ Workshop. Can you help me?")}`;
    return (
      <div className="pb-24 md:pb-0">
        <AuthShell
          title="Workshop Login"
          subtitle="Sign in to access your batch, materials and progress."
          badge="Workshop"
          heroTitle="Creative Caricature Club™ Workshop"
          heroSubtitle="Hands-on caricature training — live sessions, recordings & lifetime feedback."
          accent="amber"
        >
          <div className="space-y-5">
            {/* Batch Selector */}
            <div className="space-y-2">
              <Label className="font-body text-xs text-muted-foreground">Select Batch</Label>
              <Select value={selectedBatch} onValueChange={(v: any) => setSelectedBatch(v)}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">📅 Upcoming Batch</SelectItem>
                  <SelectItem value="march-14-15">📅 14th & 15th March</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Identifier-type selector */}
            <div className="space-y-2">
              <Label className="font-body text-xs text-muted-foreground">Login With</Label>
              <Select
                value={loginMethod === "secret_code" ? "secret_code" : `${loginType}_password`}
                onValueChange={(v) => {
                  setLoginPhase("identifier");
                  if (v === "secret_code") { setLoginMethod("secret_code"); }
                  else if (v === "mobile_password") { setLoginType("mobile"); setLoginMethod("password"); }
                  else { setLoginType("email"); setLoginMethod("password"); }
                }}
              >
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select login method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_password">📱 Mobile Number</SelectItem>
                  <SelectItem value="email_password">📧 Email Address</SelectItem>
                  {secretCodeLoginEnabled && <SelectItem value="secret_code">🔑 Secret Code</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {/* Step 1 — Identifier */}
              <div className="space-y-2">
                <Label className="font-body text-sm">{loginType === "mobile" ? "Mobile Number" : "Email Address"}</Label>
                {loginType === "mobile" ? (
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={mobile} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setMobile(d); setLoginPhase("identifier"); }} placeholder="Enter your mobile" className="pl-10 h-12 rounded-xl" maxLength={10} onKeyDown={e => e.key === "Enter" && checkIdentifier()} /></div>
                ) : (
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setLoginPhase("identifier"); }} placeholder="Enter your email" className="pl-10 h-12 rounded-xl" onKeyDown={e => e.key === "Enter" && checkIdentifier()} /></div>
                )}
              </div>

              {loginPhase === "identifier" && (
                <Button onClick={checkIdentifier} disabled={checkingIdentifier} className="w-full h-12 rounded-xl text-base font-body font-semibold">
                  {checkingIdentifier ? "Checking…" : <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              )}

              {loginPhase === "password" && (
                <>
                  {loginMethod === "secret_code" ? (
                    <div className="space-y-2">
                      <Label className="font-body text-sm">Secret Code</Label>
                      <Input type="password" value={loginSecretCode} onChange={(e) => setLoginSecretCode(e.target.value)} placeholder="Enter your 4-digit code" className="h-12 rounded-xl text-center tracking-[0.5em] text-lg" maxLength={4} onKeyDown={e => e.key === "Enter" && handleLogin()} autoFocus />
                      <p className="text-[11px] text-muted-foreground text-center">Secret code provided by admin</p>
                    </div>
                  ) : isPasswordRequired ? (
                    <div className="space-y-2">
                      <Label className="font-body text-sm">Password</Label>
                      <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter your password" className="h-12 rounded-xl" onKeyDown={e => e.key === "Enter" && handleLogin()} autoFocus />
                    </div>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground bg-accent/10 rounded-xl p-2.5 font-body">
                      ✨ No password required for this batch — tap Login to continue.
                    </p>
                  )}
                  <Button onClick={handleLogin} disabled={loading} className="w-full h-12 rounded-xl text-base font-body font-semibold">
                    {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" /> : "Login to Workshop"}
                  </Button>
                </>
              )}

              {loginPhase === "draft_resume" && (
                <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-body font-bold text-foreground">👋 Welcome back, {(draftRecord?.name as string) || "there"}!</p>
                  <p className="text-xs text-muted-foreground font-body">
                    We saved your progress at step {Math.min((draftRecord?.current_step ?? 0) + 1, 4)} of 4. Pick up where you left off and complete payment to confirm your seat.
                  </p>
                  <Button onClick={resumeFromDraft} className="w-full h-12 rounded-xl text-base font-body font-semibold">
                    Resume Registration <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {loginPhase === "not_found" && (
                <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <p className="text-sm font-body font-bold text-amber-900">No registration found</p>
                  <p className="text-xs text-amber-800 font-body">We couldn't find an account for this {loginType}. Register to reserve your seat — it only takes a couple of minutes.</p>
                  <Button onClick={() => { setRegForm({ ...regForm, [loginType]: loginType === "mobile" ? mobile : email } as any); setView("register"); setRegStep(0); }} className="w-full h-12 rounded-xl text-base font-body font-semibold">
                    Register Now <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl font-body text-sm" onClick={() => { setLoginPhase("identifier"); setView("details"); }}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                {isRegistrationOpen && loginPhase === "identifier" && <Button variant="outline" className="flex-1 rounded-xl font-body text-sm border-primary text-primary" onClick={() => setView("register")}>Register <ArrowRight className="w-4 h-4 ml-1" /></Button>}
              </div>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-muted-foreground text-sm font-body font-medium hover:bg-secondary transition-colors"><MessageCircle className="w-4 h-4" /> Can't login? Contact WhatsApp</a>
            </div>
          </div>
        </AuthShell>
      </div>
    );
  }

  // Details View (Main Workshop Page)
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEOHead title={`${workshop.title} - Creative Caricature Club™`} description={workshop.description} canonical="/workshop" />
      
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
                  <img src="/logo.png" alt={workshop.instructor_name} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
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
              <p className="text-sm font-body font-semibold text-primary mb-2">Backed by Creative Caricature Club™</p>
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
                        <img src={workshop.brochure_image_url} alt="Workshop Brochure" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
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

      {/* Admin-built dynamic blocks (editable from Admin → Workshop Page Builder) */}
      <PageBuilderRenderer page="workshop-builder" className="py-6" />

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
