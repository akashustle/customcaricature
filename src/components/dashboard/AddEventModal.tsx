import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, X, Sparkles, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_TYPES } from "@/lib/event-data";
import { INDIA_LOCATIONS } from "@/lib/india-locations";
import SelectWithOther from "@/components/ui/select-with-other";
import MonthYearDatePicker from "@/components/ui/month-year-date-picker";

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  profile: any;
}

const TIME_SLOTS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const hh = String(h).padStart(2, "0");
  return `${hh}:${m}`;
});

const MAX_HOURS = 4;

const addHours = (start: string, hours: number) => {
  if (!start) return "";
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
};

const AddEventModal = ({ open, onClose, profile }: AddEventModalProps) => {
  const navigate = useNavigate();
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [hours, setHours] = useState<number>(2);
  const [state, setState] = useState(profile?.state || "");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState(profile?.city || "");
  const [venueName, setVenueName] = useState("");
  const [fullAddress, setFullAddress] = useState(profile?.address || "");
  const [pincode, setPincode] = useState(profile?.pincode || "");
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [checkingOverlap, setCheckingOverlap] = useState(false);
  const [pastTimeError, setPastTimeError] = useState<string | null>(null);
  const [hasHardConflict, setHasHardConflict] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setState((s) => s || profile.state || "");
      setCity((c) => c || profile.city || "");
      setFullAddress((a) => a || profile.address || "");
      setPincode((p) => p || profile.pincode || "");
    }
  }, [open, profile]);

  const states = Object.keys(INDIA_LOCATIONS).sort();
  const districts = state && INDIA_LOCATIONS[state] ? Object.keys(INDIA_LOCATIONS[state]).sort() : [];
  const cities = state && district && INDIA_LOCATIONS[state]?.[district] ? INDIA_LOCATIONS[state][district] : [];

  const endTime = addHours(startTime, hours);

  // Past-time + overlap validation whenever date/start/hours change
  useEffect(() => {
    if (!eventDate || !startTime) {
      setOverlapWarning(null);
      setPastTimeError(null);
      setHasHardConflict(false);
      return;
    }

    // 1. Past-time block (only relevant if event is today)
    const now = new Date();
    const isToday =
      eventDate.getFullYear() === now.getFullYear() &&
      eventDate.getMonth() === now.getMonth() &&
      eventDate.getDate() === now.getDate();
    const [sh, sm] = startTime.split(":").map(Number);
    const startDateTime = new Date(eventDate);
    startDateTime.setHours(sh, sm, 0, 0);
    if (isToday && startDateTime.getTime() <= now.getTime()) {
      setPastTimeError("⛔ That start time is already in the past. Pick a future time slot today, or move to a later date.");
      setHasHardConflict(true);
      setOverlapWarning(null);
      return;
    }
    setPastTimeError(null);

    // 2. Overlap check
    let cancelled = false;
    setCheckingOverlap(true);
    const dateStr = format(eventDate, "yyyy-MM-dd");
    const newStartMin = sh * 60 + sm;
    const newEndMin = newStartMin + hours * 60;
    (async () => {
      const { data } = await supabase
        .from("event_bookings")
        .select("id, event_date, event_start_time, event_end_time, venue_name, status")
        .eq("event_date", dateStr)
        .neq("status", "cancelled");
      if (cancelled) return;
      const conflicts = (data || []).filter((row: any) => {
        const [rsh, rsm] = String(row.event_start_time || "00:00").slice(0, 5).split(":").map(Number);
        const [reh, rem] = String(row.event_end_time || "00:00").slice(0, 5).split(":").map(Number);
        const rs = rsh * 60 + rsm;
        const re = reh * 60 + rem;
        return newStartMin < re && newEndMin > rs;
      });
      // Hard block when 3+ events already overlap (global capacity)
      if (conflicts.length >= 3) {
        setOverlapWarning(`⛔ This slot is fully booked — 3 events already running between ${startTime} and ${addHours(startTime, hours)}. Please pick another time.`);
        setHasHardConflict(true);
      } else if (conflicts.length > 0) {
        const venues = conflicts.map((c: any) => c.venue_name || "Another event").slice(0, 2).join(", ");
        setOverlapWarning(`⚠️ Heads up — ${conflicts.length} event(s) already booked in this slot (${venues}). You can still proceed but artist availability may be limited.`);
        setHasHardConflict(false);
      } else {
        setOverlapWarning(null);
        setHasHardConflict(false);
      }
      setCheckingOverlap(false);
    })();
    return () => { cancelled = true; };
  }, [eventDate, startTime, hours]);

  const handleSave = () => {
    if (!eventType) return toast({ title: "Pick an event type", variant: "destructive" });
    if (!eventDate) return toast({ title: "Pick a date", variant: "destructive" });
    if (!startTime) return toast({ title: "Pick a start time", variant: "destructive" });
    if (pastTimeError) return toast({ title: "Invalid start time", description: pastTimeError, variant: "destructive" });
    if (hasHardConflict) return toast({ title: "Slot unavailable", description: overlapWarning || "This time slot is fully booked.", variant: "destructive" });
    if (!state || !city || !venueName || !fullAddress || !pincode) {
      return toast({ title: "Please fill all venue details", variant: "destructive" });
    }

    const params = new URLSearchParams({
      eventType,
      eventDate: format(eventDate, "yyyy-MM-dd"),
      startTime,
      endTime,
      state,
      district: district || "",
      city,
      venueName,
      fullAddress,
      pincode,
      clientName: profile?.full_name || "",
      clientMobile: profile?.mobile || "",
      clientEmail: profile?.email || "",
      clientInstagram: profile?.instagram_id || "",
    });

    onClose();
    navigate(`/book-event?${params.toString()}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-foreground/45 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            className="fixed inset-x-2 bottom-2 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[81] w-auto md:w-[560px] max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl"
          >
            <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold leading-none">Add an Event</h3>
                  <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
                    Wow your guests with live caricature artists ✨
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Event type with Other-manual fallback */}
              <div>
                <Label className="text-xs font-sans text-muted-foreground">Event type *</Label>
                <SelectWithOther
                  value={eventType}
                  onChange={setEventType}
                  options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  placeholder="Choose your event"
                  otherPlaceholder="Type event type"
                  className="mt-1"
                />
              </div>

              {/* Date + Start time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-sans text-muted-foreground">Event date *</Label>
                  <div className="mt-1">
                    <MonthYearDatePicker
                      value={eventDate}
                      onChange={setEventDate}
                      placeholder="Pick a date"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-sans text-muted-foreground">Start time *</Label>
                  <div className="relative mt-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm font-sans text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="" disabled>Select</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-sans text-muted-foreground">
                  Duration (max {MAX_HOURS} hours) *
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
                {startTime && (
                  <p className="mt-1.5 text-[11px] font-sans text-muted-foreground">
                    Ends around <span className="font-semibold text-foreground">{endTime}</span>
                  </p>
                )}
              </div>

              {pastTimeError && (
                <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[11px] font-sans text-destructive leading-relaxed font-semibold">{pastTimeError}</p>
                </div>
              )}
              {overlapWarning && (
                <div className={`rounded-2xl border p-3 flex items-start gap-2 ${hasHardConflict ? "bg-destructive/10 border-destructive/30" : "bg-amber-500/10 border-amber-500/30"}`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${hasHardConflict ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`} />
                  <p className={`text-[11px] font-sans leading-relaxed ${hasHardConflict ? "text-destructive font-semibold" : "text-amber-700 dark:text-amber-300"}`}>{overlapWarning}</p>
                </div>
              )}
              {checkingOverlap && eventDate && startTime && !overlapWarning && !pastTimeError && (
                <p className="text-[10px] text-muted-foreground font-sans -mt-2">Checking availability…</p>
              )}

              {/* State / District / City — all with Other fallback */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-sans text-muted-foreground">State *</Label>
                  <SelectWithOther
                    value={state}
                    onChange={(v) => {
                      setState(v);
                      setDistrict("");
                      setCity("");
                    }}
                    options={states}
                    placeholder="Select"
                    otherPlaceholder="State name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-sans text-muted-foreground">District</Label>
                  <SelectWithOther
                    value={district}
                    onChange={(v) => {
                      setDistrict(v);
                      setCity("");
                    }}
                    options={districts}
                    placeholder="Select"
                    otherPlaceholder="District name"
                    disabled={!state}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-sans text-muted-foreground">City *</Label>
                  <SelectWithOther
                    value={city}
                    onChange={setCity}
                    options={cities}
                    placeholder="Select"
                    otherPlaceholder="City name"
                    disabled={!state}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-sans text-muted-foreground">Venue name *</Label>
                <Input
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. The Grand Hotel"
                  className="rounded-xl mt-1 h-11"
                />
              </div>

              <div>
                <Label className="text-xs font-sans text-muted-foreground">
                  Full address of event *
                </Label>
                <Input
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Street, area, landmark"
                  className="rounded-xl mt-1 h-11"
                  autoComplete="street-address"
                />
              </div>

              <div>
                <Label className="text-xs font-sans text-muted-foreground">Pincode *</Label>
                <Input
                  value={pincode}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "");
                    if (d.length <= 6) setPincode(d);
                  }}
                  placeholder="6-digit pincode"
                  className="rounded-xl mt-1 h-11"
                  maxLength={6}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </div>

              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] font-sans text-foreground/70">
                  Your client details are auto-filled from your profile. After saving, we'll take you
                  to checkout to confirm pricing &amp; pay the advance.
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={hasHardConflict || !!pastTimeError}
                className="w-full h-12 rounded-2xl font-sans font-semibold text-base disabled:opacity-50"
              >
                {hasHardConflict || pastTimeError ? "Fix the highlighted issue above" : "Save & Continue to Booking →"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddEventModal;
