import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Bell, Play, Trash2, Clock, Timer, Zap } from "lucide-react";

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const SLOT_LABELS: Record<string, string> = {
  "12pm-3pm": "Slot 1 (12 PM - 3 PM)",
  "6pm-9pm": "Slot 2 (6 PM - 9 PM)",
  all: "All Slots",
};

const AdminWorkshopCountdown = () => {
  const [items, setItems] = useState<any[]>([]);
  const [newDate, setNewDate] = useState(getLocalDate());
  const [newSlot, setNewSlot] = useState("12pm-3pm");
  const [newSeconds, setNewSeconds] = useState("10");
  const [newDetails, setNewDetails] = useState("Live countdown");
  const [newType, setNewType] = useState("session_start");
  const [startNow, setStartNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");

  const fetchItems = async () => {
    const { data } = await supabase
      .from("workshop_countdown_prompts" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data as any[]);
  };

  useEffect(() => {
    fetchItems();
    const ch = supabase
      .channel("admin-workshop-countdown")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_countdown_prompts" }, fetchItems)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const createPrompt = async () => {
    const seconds = Math.max(1, Number(newSeconds || "0"));
    if (!seconds || !newDate) {
      toast({ title: "Date and seconds are required", variant: "destructive" });
      return;
    }

    const payload: any = {
      session_date: newDate,
      slot: newSlot,
      details: newDetails,
      seconds,
      countdown_type: newType,
      is_active: startNow,
      started_at: new Date().toISOString(),
    };

    if (scheduledAt && !startNow) {
      payload.scheduled_at = new Date(scheduledAt).toISOString();
      payload.is_active = true; // Will be active but user overlay checks scheduled_at
    }

    const { error } = await supabase.from("workshop_countdown_prompts" as any).insert(payload as any);

    if (error) {
      toast({ title: "Failed to create countdown", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: scheduledAt && !startNow ? "Countdown scheduled! ⏰" : "Countdown created! 🔔" });
    setNewSeconds("10");
    setScheduledAt("");
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("workshop_countdown_prompts" as any)
      .update({ is_active: !isActive, started_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: !isActive ? "Countdown started ▶️" : "Countdown paused ⏸" });
  };

  const removePrompt = async (id: string) => {
    const { error } = await supabase.from("workshop_countdown_prompts" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Countdown deleted" });
  };

  const grouped = useMemo(() => ({
    slot1: items.filter(i => i.slot === "12pm-3pm"),
    slot2: items.filter(i => i.slot === "6pm-9pm"),
    all: items.filter(i => i.slot === "all"),
  }), [items]);

  const renderItem = (item: any) => (
    <Card key={item.id} className="border overflow-hidden">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold">{new Date(item.session_date + "T00:00:00").toLocaleDateString("en-IN")} · {item.seconds}s</p>
              <Badge variant={item.countdown_type === "session_end" ? "destructive" : "default"} className="text-[9px]">
                {item.countdown_type === "session_end" ? "🔔 Session End" : "⏱️ Session Start"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{item.details || "—"} · {SLOT_LABELS[item.slot] || item.slot}</p>
            {item.scheduled_at && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                📅 Scheduled: {new Date(item.scheduled_at).toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={item.is_active ? "default" : "secondary"} className="text-[10px]">
              {item.is_active ? "🟢 Active" : "Paused"}
            </Badge>
            <Button size="icon" variant="ghost" onClick={() => toggleActive(item.id, item.is_active)}>
              <Play className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => removePrompt(item.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderGroup = (title: string, icon: any, list: any[]) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold">{title} ({list.length})</h3>
      </div>
      {list.length === 0 && <p className="text-xs text-muted-foreground pl-6">No countdowns</p>}
      {list.map(renderItem)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Timer className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Workshop Countdown</h2>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Create Countdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Select value={newDate} onValueChange={setNewDate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-03-14">14 March 2026</SelectItem>
                  <SelectItem value="2026-03-15">15 March 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Slot (whom to show)</Label>
              <Select value={newSlot} onValueChange={setNewSlot}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12pm-3pm">{SLOT_LABELS["12pm-3pm"]}</SelectItem>
                  <SelectItem value="6pm-9pm">{SLOT_LABELS["6pm-9pm"]}</SelectItem>
                  <SelectItem value="all">{SLOT_LABELS.all}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Countdown Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="session_start">⏱️ Session Start</SelectItem>
                  <SelectItem value="session_end">🔔 Session End</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Seconds</Label>
              <Input type="number" min={1} value={newSeconds} onChange={(e) => setNewSeconds(e.target.value)} />
            </div>
            <div>
              <Label>Details</Label>
              <Input value={newDetails} onChange={(e) => setNewDetails(e.target.value)} placeholder="Countdown details" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Start immediately</Label>
            <Switch checked={startNow} onCheckedChange={setStartNow} />
          </div>

          {!startNow && (
            <div>
              <Label>Schedule for (auto-start at this time)</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          )}

          <Button onClick={createPrompt} className="w-full">
            {startNow ? "🚀 Create & Start Now" : scheduledAt ? "📅 Schedule Countdown" : "Create Countdown"}
          </Button>
        </CardContent>
      </Card>

      {renderGroup("Slot 1 — 12 PM to 3 PM", <Clock className="w-4 h-4 text-primary" />, grouped.slot1)}
      {renderGroup("Slot 2 — 6 PM to 9 PM", <Clock className="w-4 h-4 text-primary" />, grouped.slot2)}
      {renderGroup("All Slots", <Bell className="w-4 h-4 text-primary" />, grouped.all)}
    </div>
  );
};

export default AdminWorkshopCountdown;
