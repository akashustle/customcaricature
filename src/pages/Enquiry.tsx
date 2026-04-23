import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, User, Palette, Calendar, MessageCircle, CheckCircle2, Instagram, IndianRupee, ExternalLink } from "lucide-react";
import LocationDropdowns from "@/components/LocationDropdowns";
import InternationalLocationDropdowns from "@/components/InternationalLocationDropdowns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addYears } from "date-fns";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import PricingReveal from "@/components/PricingReveal";
import UrgencyTimer from "@/components/UrgencyTimer";

type Step = "info" | "type" | "caricature_select" | "caricature_details" | "event_details" | "event_submitted" | "help";

const COMMON_EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday Party" },
  { value: "corporate", label: "Corporate Event" },
  { value: "baby_shower", label: "Baby Shower" },
  { value: "anniversary", label: "Anniversary" },
  { value: "other", label: "Other (type manually)" },
];

// Helper: render text with clickable links
const RichText = ({ text }: { text: string }) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <span>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
            {part.length > 40 ? part.slice(0, 40) + "..." : part}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

const Enquiry = () => {
  const { settings: siteSettings } = useSiteSettings();
  const [step, setStep] = useState<Step>("info");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [enquiryId, setEnquiryId] = useState("");
  const [dupBlocked, setDupBlocked] = useState(false);

  // Form data
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [eventType, setEventType] = useState("");
  const [customEventType, setCustomEventType] = useState("");
  const [enquiryType, setEnquiryType] = useState<"custom_caricature" | "event_booking" | "">("");
  const [caricatureType, setCaricatureType] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);

  // Settings from admin
  const [descriptions, setDescriptions] = useState<any>({});
  const [eventDetails, setEventDetails] = useState<any>({});
  const [contactInfo, setContactInfo] = useState<any>({ whatsapp: "", instagram: "" });
  const [maxEvents, setMaxEvents] = useState(2);
  const [bookedDates, setBookedDates] = useState<Record<string, number>>({});
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Pricing from DB
  const [pricing, setPricing] = useState<any[]>([]);

  // Event pricing
  const [eventPricingRules, setEventPricingRules] = useState<any[]>([]);
  const [resolvedPrice, setResolvedPrice] = useState<{ price: number; source: string; currency: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchPricing();
    fetchBookedDates();
    fetchBlockedDates();
    fetchEventPricingRules();

    // Realtime
    const ch = supabase.channel("enquiry-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiry_settings" }, fetchSettings)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiry_event_pricing" }, fetchEventPricingRules)
      .on("postgres_changes", { event: "*", schema: "public", table: "caricature_types" }, fetchPricing)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => { resolveEventPrice(); }, [state, district, city, eventPricingRules]);

  const fetchSettings = async () => {
    const { data } = await supabase.from("enquiry_settings" as any).select("*");
    if (data) {
      const settings: any = {};
      (data as any[]).forEach((s: any) => { settings[s.id] = s.value; });
      if (settings.caricature_descriptions) setDescriptions(settings.caricature_descriptions);
      if (settings.event_region_details) setEventDetails(settings.event_region_details);
      if (settings.contact_info) setContactInfo(settings.contact_info);
      if (settings.event_max_per_date) setMaxEvents(settings.event_max_per_date.max_events || 2);
    }
  };

  const fetchPricing = async () => {
    const { data } = await supabase.from("caricature_types").select("*").eq("is_active", true).order("sort_order");
    if (data) setPricing(data);
  };

  const fetchBookedDates = async () => {
    const { data } = await supabase.from("event_bookings").select("event_date").in("status", ["upcoming", "confirmed"]);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((b: any) => { counts[b.event_date] = (counts[b.event_date] || 0) + 1; });
      setBookedDates(counts);
    }
  };

  const fetchBlockedDates = async () => {
    const { data } = await supabase.from("event_blocked_dates" as any).select("blocked_date");
    if (data) setBlockedDates((data as any[]).map((d: any) => d.blocked_date));
  };

  const fetchEventPricingRules = async () => {
    const { data } = await supabase.from("enquiry_event_pricing" as any).select("*").eq("is_active", true).order("priority", { ascending: false });
    if (data) setEventPricingRules(data as any[]);
  };

  const resolveEventPrice = () => {
    if (!state && !district && !city) { setResolvedPrice(null); return; }
    const activeRules = eventPricingRules.filter((r: any) => r.is_active);
    if (city) {
      const m = activeRules.find((r: any) => r.city && r.city.toLowerCase() === city.toLowerCase());
      if (m) { setResolvedPrice({ price: m.price, source: "City", currency: m.currency }); return; }
    }
    if (district) {
      const m = activeRules.find((r: any) => r.district && r.district.toLowerCase() === district.toLowerCase() && !r.city);
      if (m) { setResolvedPrice({ price: m.price, source: "District", currency: m.currency }); return; }
    }
    if (state) {
      const m = activeRules.find((r: any) => r.state && r.state.toLowerCase() === state.toLowerCase() && !r.district && !r.city);
      if (m) { setResolvedPrice({ price: m.price, source: "State", currency: m.currency }); return; }
    }
    const d = activeRules.find((r: any) => !r.state && !r.district && !r.city);
    if (d) { setResolvedPrice({ price: d.price, source: "Default", currency: d.currency }); return; }
    setResolvedPrice(null);
  };

  // Determine event region for post-submission details
  const getEventRegion = (): string => {
    if (country !== "India") return "international";
    const mumbaiDistricts = ["mumbai city", "mumbai suburban", "thane", "palghar"];
    const mumbaiCities = ["mumbai", "navi mumbai", "panvel"];
    if (district && mumbaiDistricts.includes(district.toLowerCase())) return "maharashtra";
    if (city && mumbaiCities.includes(city.toLowerCase())) return "maharashtra";
    if (state && state.toLowerCase() === "maharashtra" && district && ["mumbai city", "mumbai suburban", "thane", "palghar", "raigad"].includes(district.toLowerCase())) return "maharashtra";
    return "pan_india";
  };

  const stepProgress: Record<Step, number> = {
    info: 15, type: 30, caricature_select: 50, caricature_details: 75, event_details: 60, event_submitted: 100, help: 100,
  };

  const handleSubmitInfo = async () => {
    if (!name.trim() || !mobile.trim()) {
      toast({ title: "Please enter your name and WhatsApp number", variant: "destructive" });
      return;
    }
    if (mobile.length < 10) {
      toast({ title: "Please enter a valid WhatsApp number", variant: "destructive" });
      return;
    }

    // Check duplicate for non-logged-in users
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    if (!userId) {
      const fingerprint = `${mobile.trim()}_${navigator.userAgent.slice(0, 50)}`;
      const { data: existing } = await supabase.from("guest_enquiry_tracking" as any)
        .select("id, enquiry_count, fingerprint")
        .or(`fingerprint.eq.${fingerprint},mobile.eq.${mobile.trim()}`)
        .limit(1)
        .maybeSingle();

      if (existing && (existing as any).enquiry_count >= 1) {
        setDupBlocked(true);
        return;
      }
    }
    setStep("type");
  };

  const submitEnquiry = async () => {
    setSubmitting(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      const finalEventType = eventType === "other" ? customEventType : eventType;

      // Track guest enquiry
      if (!userId) {
        const fingerprint = `${mobile.trim()}_${navigator.userAgent.slice(0, 50)}`;
        const { data: existing } = await supabase.from("guest_enquiry_tracking" as any)
          .select("id, enquiry_count")
          .or(`fingerprint.eq.${fingerprint},mobile.eq.${mobile.trim()}`)
          .limit(1)
          .maybeSingle();

        if (existing) {
          await supabase.from("guest_enquiry_tracking" as any)
            .update({ enquiry_count: ((existing as any).enquiry_count || 0) + 1, last_enquiry_at: new Date().toISOString() } as any)
            .eq("id", (existing as any).id);
        } else {
          await supabase.from("guest_enquiry_tracking" as any).insert({
            fingerprint, mobile: mobile.trim(), enquiry_count: 1,
          } as any);
        }
      }

      const { data, error } = await supabase.from("enquiries" as any).insert({
        name: name.trim(), mobile: mobile.trim(), email: email.trim() || null,
        instagram_id: instagramId.trim() || null, enquiry_type: enquiryType,
        caricature_type: caricatureType || null, event_type: finalEventType || null,
        country, state: state || null, district: district || null, city: city || null,
        event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : null, user_id: userId,
        estimated_price: resolvedPrice?.price || null, pricing_source: resolvedPrice?.source || null,
      } as any).select("enquiry_number").single();
      if (error) throw error;
      setEnquiryId((data as any)?.enquiry_number || "");
      setSubmitted(true);
      if (enquiryType === "event_booking") {
        setStep("event_submitted");
      } else {
        setStep("help");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (date > addYears(today, 2)) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    if (blockedDates.includes(dateStr)) return true;
    if ((bookedDates[dateStr] || 0) >= maxEvents) return true;
    return false;
  };

  const getDateSlots = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return maxEvents - (bookedDates[dateStr] || 0);
  };

  // Track link click
  const trackLinkClick = async () => {
    if (!enquiryId) return;
    await supabase.from("enquiries" as any).update({
      link_clicked: true, link_clicked_at: new Date().toISOString()
    } as any).eq("enquiry_number", enquiryId);
  };

  // Get caricature details for the selected type
  const getCaricatureDetails = () => descriptions[caricatureType] || {};
  const getPricingForType = () => pricing.find((p: any) => p.slug === caricatureType);

  // SUBMITTED: Caricature details page
  if (submitted && enquiryType === "custom_caricature") {
    const details = getCaricatureDetails();
    const priceData = getPricingForType();
    return (
      <>
        <SEOHead title="Enquiry Submitted | Creative Caricature Club™" description="Your enquiry has been submitted." />
        <div className="min-h-screen bg-background flex items-center justify-center p-4 pb-20 md:pb-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card/90 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-center">Enquiry Submitted!</h2>
              <p className="text-center text-sm text-muted-foreground font-sans">ID: <span className="font-bold text-foreground">{enquiryId}</span></p>

              {/* Pricing with reveal animation */}
              {priceData && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20">
                  <PricingReveal
                    finalPrice={priceData.price}
                    revealed={true}
                    label={`${caricatureType} Caricature${priceData.per_face ? " (per face)" : ""}`}
                  />
                  {details.delivery_days && (
                    <p className="text-xs text-muted-foreground font-sans mt-2 text-center">📦 Delivery: ~{details.delivery_days} days</p>
                  )}
                </div>
              )}

              {/* Urgency Timer */}
              <UrgencyTimer
                durationMinutes={5}
                message="🔥 Grab your special price before it expires!"
              />

              <div className="text-center p-3 rounded-xl bg-green-50 border border-green-200">
                <p className="text-xs font-sans font-semibold text-green-700">🎊 Best offer for you! Your guests will love the caricature experience!</p>
              </div>

              {/* Admin-editable details text */}
              {details.full_details && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm font-sans text-foreground whitespace-pre-line leading-relaxed">
                    <RichText text={details.full_details} />
                  </p>
                </div>
              )}

              {/* Order link button */}
              {details.order_link && (
                <Button
                  className="w-full rounded-full font-sans h-12 text-base"
                  onClick={() => { trackLinkClick(); window.open(details.order_link, "_blank"); }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" /> Proceed to Order
                </Button>
              )}

              {/* Contact buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <p className="text-xs text-muted-foreground font-sans text-center">Need help? Connect with us:</p>
                <Button onClick={() => {
                  const priceData = getPricingForType();
                  const priceLine = priceData ? `💰 Price: ₹${priceData.price.toLocaleString("en-IN")}${priceData.per_face ? "/face" : ""}` : "";
                  const msg = `Hi Creative Caricature Club! 🎨\n\nI just submitted a custom caricature enquiry and need help.\n\n📋 *Enquiry Details:*\n🔖 Enquiry ID: ${enquiryId}\n👤 Name: ${name}\n📱 Mobile: ${mobile}${email ? `\n📧 Email: ${email}` : ""}${instagramId ? `\n📸 Instagram: ${instagramId}` : ""}\n\n🎨 *Caricature Details:*\n🖼️ Type: ${caricatureType}\n${priceLine ? `${priceLine}\n` : ""}\nI'd like to know more about the process, timeline, and how to proceed. Please help! 🙏`;
                  window.open(`https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
                }} className="w-full font-sans bg-green-600 hover:bg-green-700">
                  <MessageCircle className="w-4 h-4 mr-2" /> Chat on WhatsApp
                </Button>
                <Button variant="outline" onClick={() => window.open(contactInfo.instagram, "_blank")} className="w-full font-sans">
                  <Instagram className="w-4 h-4 mr-2" /> Instagram
                </Button>
                <Button variant="ghost" onClick={() => window.location.href = "/"} className="font-sans">Back to Home</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // SUBMITTED: Event details page
  if (submitted && enquiryType === "event_booking") {
    const region = getEventRegion();
    const regionDetails = eventDetails[region] || {};
    return (
      <>
        <SEOHead title="Event Enquiry Submitted | Creative Caricature Club™" description="Your event enquiry has been submitted." />
        <div className="min-h-screen bg-background flex items-center justify-center p-4 pb-20 md:pb-4">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card/90 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-center">Event Enquiry Submitted!</h2>
              <p className="text-center text-sm text-muted-foreground font-sans">ID: <span className="font-bold text-foreground">{enquiryId}</span></p>

              {/* Pricing with reveal */}
              {resolvedPrice && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20">
                  <PricingReveal
                    finalPrice={resolvedPrice.price}
                    currency={resolvedPrice.currency === "INR" ? "₹" : resolvedPrice.currency}
                    revealed={true}
                    label="Event Booking Price"
                  />
                  <p className="text-[10px] text-muted-foreground font-sans mt-2 text-center">
                    Based on {resolvedPrice.source.toLowerCase()} pricing · Final price may vary
                  </p>
                </div>
              )}

              {/* Urgency Timer */}
              <UrgencyTimer
                durationMinutes={3}
                message="🔥 Grab your event date! Best price expires in"
              />

              <div className="text-center p-3 rounded-xl bg-green-50 border border-green-200">
                <p className="text-xs font-sans font-semibold text-green-700">🎉 Make your event memorable with live funny caricatures! Your guests will have a blast!</p>
              </div>

              {/* Region-specific details from admin */}
              {regionDetails.details && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="font-sans font-semibold text-sm mb-2">{regionDetails.title || (region === "maharashtra" ? "Maharashtra Region" : region === "pan_india" ? "Pan India" : "International")}</p>
                  <p className="text-sm font-sans text-foreground whitespace-pre-line leading-relaxed">
                    <RichText text={regionDetails.details} />
                  </p>
                </div>
              )}

              {/* Pricing text from admin */}
              {regionDetails.pricing_text && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm font-sans text-foreground whitespace-pre-line leading-relaxed">
                    <RichText text={regionDetails.pricing_text} />
                  </p>
                </div>
              )}

              {/* Order link */}
              {regionDetails.order_link && (
                <Button
                  className="w-full rounded-full font-sans h-12 text-base"
                  onClick={() => { trackLinkClick(); window.open(regionDetails.order_link, "_blank"); }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" /> Book Now
                </Button>
              )}

              {/* Contact */}
              <div className="flex flex-col gap-2 pt-2">
                <p className="text-xs text-muted-foreground font-sans text-center">Need help? Connect with us:</p>
                <Button onClick={() => {
                  const finalEvent = eventType === "other" ? customEventType : COMMON_EVENT_TYPES.find(t => t.value === eventType)?.label || eventType;
                  const locationParts = [city, district, state, country].filter(Boolean).join(", ");
                  const dateStr = eventDate ? format(eventDate, "dd MMM yyyy") : "Not decided yet";
                  const currSymbol = resolvedPrice?.currency === "INR" ? "₹" : (resolvedPrice?.currency || "₹");
                  const advanceAmt = resolvedPrice ? Math.round(resolvedPrice.price * 0.5) : null;
                  const pricingBlock = resolvedPrice ? `\n💰 *Pricing Breakdown:*\n📊 Estimated Total: ${currSymbol}${resolvedPrice.price.toLocaleString("en-IN")}\n💳 Advance Amount (50%): ${currSymbol}${advanceAmt?.toLocaleString("en-IN")}\n📏 Pricing Basis: ${resolvedPrice.source} rate` : "";
                  const regionLabel = country !== "India" ? "International" : (getEventRegion() === "maharashtra" ? "Maharashtra Region" : "Pan India");
                  const msg = `Hi Creative Caricature Club! 🎨\n\nI just submitted an event enquiry and would love to proceed.\n\n📋 *My Enquiry Details:*\n🔖 Enquiry ID: ${enquiryId}\n👤 Name: ${name}\n📱 Mobile: ${mobile}${email ? `\n📧 Email: ${email}` : ""}${instagramId ? `\n📸 Instagram: ${instagramId}` : ""}\n\n🎉 *Event Information:*\n🎊 Event Type: ${finalEvent}\n📍 Location: ${locationParts}\n🌍 Region: ${regionLabel}\n📅 Event Date: ${dateStr}${pricingBlock}\n\nI'd like to know more about:\n✅ Artist availability for my date\n✅ Exact pricing & packages\n✅ How to confirm the booking\n\nPlease help me finalize! 🙏`;
                  window.open(`https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
                }} className="w-full font-sans bg-green-600 hover:bg-green-700">
                  <MessageCircle className="w-4 h-4 mr-2" /> Chat on WhatsApp
                </Button>
                <Button variant="outline" onClick={() => window.open(contactInfo.instagram, "_blank")} className="w-full font-sans">
                  <Instagram className="w-4 h-4 mr-2" /> Instagram
                </Button>
                <Button variant="ghost" onClick={() => window.location.href = "/"} className="font-sans">Back to Home</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Enquiry | Book Caricature Artist or Order Custom Caricature" description="Submit an enquiry for custom caricatures, live event caricature artists for weddings & corporate events, or get a custom quote. Creative Caricature Club™ — India's #1 caricature studio in Mumbai." canonical="/enquiry" />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 pb-20 md:pb-4">
        <Card className="w-full max-w-lg shadow-2xl border-border bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <img src="/logo.png" alt="CCC" className="w-14 h-14 rounded-2xl border-2 border-primary/20 shadow-sm mx-auto mb-2" />
            <CardTitle className="font-calligraphy text-2xl text-foreground">Creative Caricature Club™</CardTitle>
            <p className="text-sm text-muted-foreground font-body">Tell us what you're looking for</p>
            <Progress value={stepProgress[step]} className="mt-3 h-2" />
          </CardHeader>

          <CardContent className="space-y-5 pt-2">
            {/* Duplicate enquiry blocked message */}
            {dupBlocked && (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3 animate-in fade-in">
                <div className="text-4xl">🔒</div>
                <h3 className="font-display text-lg font-bold text-amber-800">You've Already Submitted an Enquiry</h3>
                <p className="text-sm text-amber-700 font-sans">
                  We already have your enquiry on file. Our team will get back to you soon!
                </p>
                <p className="text-xs text-amber-600 font-sans">
                  Want to submit unlimited enquiries? Register or login to your account.
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button onClick={() => window.location.href = "/register"} className="rounded-full font-sans" size="sm">
                    Register Now
                  </Button>
                  <Button onClick={() => window.location.href = "/login"} variant="outline" className="rounded-full font-sans" size="sm">
                    Login
                  </Button>
                </div>
              </div>
            )}
            {/* Pricing Psychology Banner - shows on first step */}
            {step === "info" && !dupBlocked && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Pricing Range Display at Top */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20">
                  <PricingReveal
                    finalPrice={45000}
                    revealed={false}
                    showRange={true}
                    rangeMin={40000}
                    rangeMax={90000}
                    label="🎨 Event Booking Starts From"
                    urgencyMessage="Fill details to unlock your special price!"
                  />
                </div>

                {/* Urgency message */}
                <div className="text-center p-3 rounded-xl bg-accent/5 border border-accent/10">
                  <p className="text-xs font-sans text-foreground font-semibold">📅 Dates are filling up fast!</p>
                  <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Block your event date & make your celebration unforgettable with live caricatures! 🎉</p>
                </div>

                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Your Information
                </h3>
                <div>
                  <Label className="font-sans">Name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="mt-1" />
                </div>
                <div>
                  <Label className="font-sans">WhatsApp Number *</Label>
                  <Input value={mobile} onChange={e => { const v = e.target.value.replace(/\D/g, ""); if (v.length <= 10) setMobile(v); }} placeholder="10-digit WhatsApp number" className="mt-1" maxLength={10} />
                </div>
                <div>
                  <Label className="font-sans">Email Address <span className="text-muted-foreground">(optional)</span></Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="mt-1" />
                </div>
                <div>
                  <Label className="font-sans">Instagram ID <span className="text-muted-foreground">(optional)</span></Label>
                  <Input value={instagramId} onChange={e => setInstagramId(e.target.value)} placeholder="@your_instagram" className="mt-1" />
                </div>
                <Button onClick={handleSubmitInfo} className="w-full rounded-full font-sans h-12 text-base">
                  Know Your Special Price <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Enquiry Type */}
            {step === "type" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-display text-lg font-semibold">What are you looking for?</h3>
                <div className="grid gap-3">
                  {siteSettings.custom_caricature_visible?.enabled !== false ? (
                    <button
                      onClick={() => { setEnquiryType("custom_caricature"); setStep("caricature_select"); }}
                      className="p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all text-left group hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Palette className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-sans font-semibold text-foreground">Custom Caricature from Photo</p>
                          <p className="text-xs text-muted-foreground font-sans">Personalized artwork from your photos</p>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/50 text-left opacity-80">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Palette className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-sans font-semibold text-amber-800">Custom Caricature — Temporarily Paused</p>
                          <p className="text-xs text-amber-600 font-sans">🔥 Due to overwhelming demand, custom caricature orders are currently paused. We'll be back soon!</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => { setEnquiryType("event_booking"); setStep("event_details"); }}
                    className="p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all text-left group hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-sans font-semibold text-foreground">Event Booking</p>
                        <p className="text-xs text-muted-foreground font-sans">Live caricature artist at your event</p>
                      </div>
                    </div>
                  </button>
                </div>
                <Button variant="ghost" onClick={() => setStep("info")} className="font-sans">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
            )}

            {/* Step 3: Caricature Type Selection - NO pricing shown */}
            {step === "caricature_select" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-display text-lg font-semibold">Select Caricature Type</h3>
                <div className="grid gap-3">
                  {pricing.map((p: any) => {
                    const desc = descriptions[p.slug] || {};
                    return (
                      <button
                        key={p.slug}
                        onClick={() => { setCaricatureType(p.slug); setStep("caricature_details"); }}
                        className="p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all text-left group hover:bg-primary/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Palette className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-sans font-semibold text-foreground">{desc.title || p.name}</p>
                            {desc.description && <p className="text-xs text-muted-foreground font-sans mt-0.5">{desc.description}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Button variant="ghost" onClick={() => setStep("type")} className="font-sans">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
            )}

            {/* Step 3b: Caricature Details - shows pricing + admin details + submit */}
            {step === "caricature_details" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {(() => {
                  const details = getCaricatureDetails();
                  const priceData = getPricingForType();
                  return (
                    <>
                      <h3 className="font-display text-lg font-semibold capitalize">{caricatureType} Caricature</h3>

                      {/* Pricing Card */}
                      {priceData && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20 text-center">
                          <p className="font-display text-3xl font-bold money">
                            ₹{priceData.price.toLocaleString("en-IN")}
                            {priceData.per_face && <span className="text-sm font-sans font-normal text-muted-foreground">/face</span>}
                          </p>
                          {details.delivery_days && (
                            <p className="text-xs text-muted-foreground font-sans mt-1">📦 Delivery: ~{details.delivery_days} days</p>
                          )}
                        </div>
                      )}

                      {/* Admin-editable details */}
                      {details.full_details && (
                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                          <p className="text-sm font-sans text-foreground whitespace-pre-line leading-relaxed">
                            <RichText text={details.full_details} />
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setStep("caricature_select")} className="font-sans">
                          <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <Button onClick={submitEnquiry} disabled={submitting} className="flex-1 rounded-full font-sans h-12 text-base">
                          {submitting ? "Submitting..." : "Submit Enquiry"}
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Step 4: Event Details */}
            {step === "event_details" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Event Details
                </h3>

                {/* Show range pricing at top before any data entered */}
                {!state && !city && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20">
                    <PricingReveal
                      finalPrice={50000}
                      revealed={false}
                      showRange={true}
                      rangeMin={40000}
                      rangeMax={90000}
                      label="🎨 Live Event Caricature"
                      urgencyMessage="Select location to see your exclusive price!"
                    />
                  </div>
                )}

                <div className="text-center p-2 rounded-lg bg-accent/5">
                  <p className="text-[10px] font-sans text-muted-foreground">😄 Make a smile on your guests with funny caricatures!</p>
                </div>

                {/* Event Type Dropdown */}
                <div>
                  <Label className="font-sans">Event Type *</Label>
                  <Select value={eventType} onValueChange={v => { setEventType(v); if (v !== "other") setCustomEventType(""); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select event type" /></SelectTrigger>
                    <SelectContent>
                      {COMMON_EVENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {eventType === "other" && (
                    <Input
                      value={customEventType}
                      onChange={e => setCustomEventType(e.target.value)}
                      placeholder="Enter your event type"
                      className="mt-2 font-sans"
                    />
                  )}
                </div>

                <LocationDropdowns
                  state={state} district={district} city={city}
                  onStateChange={v => { setState(v); setDistrict(""); setCity(""); }}
                  onDistrictChange={v => { setDistrict(v); setCity(""); }}
                  onCityChange={v => setCity(v)}
                />

                {/* Event Date */}
                <div>
                  <Label className="font-sans">Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !eventDate && "text-muted-foreground")}>
                        {eventDate ? format(eventDate, "PPP") : "Select event date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single" selected={eventDate} onSelect={setEventDate}
                        disabled={isDateDisabled}
                        className={cn("p-3 pointer-events-auto")}
                        modifiers={{
                          limited: (date) => getDateSlots(date) === 1 && !isDateDisabled(date),
                        }}
                        modifiersClassNames={{ limited: "bg-amber-100 text-amber-800 font-bold" }}
                      />
                      <div className="px-3 pb-3 text-[10px] text-muted-foreground font-sans">
                        <p>🟢 Available · 🟡 1 slot left · 🔴 Fully booked/blocked</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {eventDate && (
                    <p className="text-xs text-primary font-sans mt-1">
                      {getDateSlots(eventDate)} slot{getDateSlots(eventDate) !== 1 ? "s" : ""} available on {format(eventDate, "dd MMM yyyy")}
                    </p>
                  )}
                </div>

                {/* Fluctuating price range before submission */}
                {!resolvedPrice && (state || city) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20">
                    <PricingReveal
                      finalPrice={40000}
                      revealed={false}
                      showRange={true}
                      rangeMin={40000}
                      rangeMax={80000}
                      label="Estimated Event Price"
                    />
                  </div>
                )}

                {/* Resolved price with fluctuation */}
                {resolvedPrice && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/20">
                    <PricingReveal
                      finalPrice={resolvedPrice.price}
                      revealed={!!state && !!city}
                      showRange={!state || !city}
                      rangeMin={40000}
                      rangeMax={80000}
                      label="Estimated Event Booking Price"
                    />
                    <p className="text-[10px] text-muted-foreground font-sans mt-1 text-center">
                      Based on {resolvedPrice.source.toLowerCase()} pricing · Final price may vary
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep("type")} className="font-sans">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={submitEnquiry}
                    disabled={!state || !city || !(eventType && (eventType !== "other" || customEventType)) || submitting}
                    className="flex-1 rounded-full font-sans h-12 text-base"
                  >
                    {submitting ? "Submitting..." : "Submit Enquiry"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Enquiry;
