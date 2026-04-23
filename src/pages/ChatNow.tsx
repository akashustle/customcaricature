import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarIcon,
  Clock,
  MapPin,
  Send,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { EVENT_TYPES } from "@/lib/event-data";
import { INDIA_LOCATIONS } from "@/lib/india-locations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import SiteShell from "@/components/SiteShell";

const WHATSAPP_NUMBER = "918369594271";

const TIME_SLOTS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const addHours = (start: string, hours: number) => {
  if (!start) return "";
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
};

const ChatNow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [hours, setHours] = useState<number>(2);
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  // Pre-fill from profile if logged in
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, mobile, state, city, pincode")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setName((n) => n || data.full_name || "");
          setWhatsapp((w) => w || data.mobile || "");
          setState((s) => s || data.state || "");
          setCity((c) => c || data.city || "");
          setPincode((p) => p || data.pincode || "");
        }
      });
  }, [user]);

  const states = Object.keys(INDIA_LOCATIONS).sort();
  const districts = state ? Object.keys(INDIA_LOCATIONS[state] || {}).sort() : [];
  const cities = state && district ? INDIA_LOCATIONS[state]?.[district] || [] : [];
  const endTime = addHours(startTime, hours);

  const handleSend = () => {
    if (!name.trim()) return toast({ title: "Please enter your name", variant: "destructive" });
    if (whatsapp.length < 10)
      return toast({ title: "Please enter a valid WhatsApp number", variant: "destructive" });

    const eventLabel =
      EVENT_TYPES.find((t) => t.value === eventType)?.label || eventType || "—";
    const dateStr = eventDate ? format(eventDate, "EEEE, do MMMM yyyy") : "Not decided yet";
    const timeStr = startTime ? `${startTime} – ${endTime} (${hours} hr)` : "Not decided yet";
    const location = [city, district, state].filter(Boolean).join(", ") || "Not specified";

    const message =
      `Hey! 👋 I came from your booking portal and I wanted to know more about live caricature for my event.\n\n` +
      `Below are my details:\n` +
      `• Name: ${name}\n` +
      `• WhatsApp: +91 ${whatsapp}\n` +
      `• Event type: ${eventLabel}\n` +
      `• Date: ${dateStr}\n` +
      `• Time: ${timeStr}\n` +
      `• Location: ${location}\n` +
      `• Pincode: ${pincode || "—"}\n\n` +
      `Please share pricing & next steps. Thank you!`;

    // Best-effort: log enquiry so admin sees it too
    supabase
      .from("enquiries")
      .insert({
        name,
        mobile: whatsapp,
        enquiry_type: "live_caricature",
        event_type: eventType || null,
        event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : null,
        state: state || null,
        district: district || null,
        city: city || null,
        source: "chat_now_whatsapp",
        user_id: user?.id || null,
      } as any)
      .then(() => undefined);

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast({ title: "✅ Opening WhatsApp..." });
  };

  return (
    <SiteShell>
      <SEOHead
        title="Chat Now — Get an Instant Quote on WhatsApp | Creative Caricature Club"
        description="Tell us about your event and get a live caricature quote on WhatsApp in minutes."
      />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-sans text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden"
        >
          {/* Hero */}
          <div className="bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 sm:p-8 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                  Chat with us on WhatsApp
                </h1>
                <p className="text-sm text-muted-foreground font-sans mt-1">
                  Share a few details — we'll send a custom quote instantly ✨
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-5 sm:p-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-sans text-muted-foreground">Your name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="rounded-xl mt-1 h-11"
                />
              </div>
              <div>
                <Label className="text-xs font-sans text-muted-foreground">
                  WhatsApp number * (10 digits)
                </Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "");
                    if (d.length <= 10) setWhatsapp(d);
                  }}
                  placeholder="10-digit WhatsApp number"
                  maxLength={10}
                  className="rounded-xl mt-1 h-11"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-sans text-muted-foreground">Event type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="rounded-xl mt-1 h-11">
                  <SelectValue placeholder="Choose your event" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-sans text-muted-foreground">Event date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1 h-11 rounded-xl justify-start font-normal",
                        !eventDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs font-sans text-muted-foreground">Start time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="rounded-xl mt-1 h-11">
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-sans text-muted-foreground">
                Duration (max 4 hours)
              </Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[1, 2, 3, 4].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={`h-11 rounded-xl border text-sm font-sans font-semibold transition-all ${
                      hours === h
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {h} hr
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-sans text-muted-foreground">State</Label>
                <Select
                  value={state}
                  onValueChange={(v) => {
                    setState(v);
                    setDistrict("");
                    setCity("");
                  }}
                >
                  <SelectTrigger className="rounded-xl mt-1 h-11">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {states.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-sans text-muted-foreground">District</Label>
                <Select
                  value={district}
                  onValueChange={(v) => {
                    setDistrict(v);
                    setCity("");
                  }}
                  disabled={!state}
                >
                  <SelectTrigger className="rounded-xl mt-1 h-11">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-sans text-muted-foreground">City</Label>
                {cities.length > 0 ? (
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="rounded-xl mt-1 h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city"
                    className="rounded-xl mt-1 h-11"
                  />
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs font-sans text-muted-foreground">Pincode</Label>
              <Input
                value={pincode}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  if (d.length <= 6) setPincode(d);
                }}
                maxLength={6}
                placeholder="6-digit pincode"
                className="rounded-xl mt-1 h-11"
              />
            </div>

            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] font-sans text-foreground/70">
                Tap the button below — WhatsApp will open with your details pre-filled. Just hit send!
              </p>
            </div>

            <Button
              onClick={handleSend}
              className="w-full h-12 rounded-2xl font-sans font-semibold text-base bg-[#25D366] hover:bg-[#1da851] text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Message on WhatsApp
            </Button>
          </div>
        </motion.div>
      </div>
    </SiteShell>
  );
};

export default ChatNow;
