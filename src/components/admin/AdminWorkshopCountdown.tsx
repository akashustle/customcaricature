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
import { Bell, Play, Trash2 } from "lucide-react";

const getLocalDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const [startNow, setStartNow] = useState(true);

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

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const createPrompt = async () => {
    const seconds = Math.max(1, Number(newSeconds || "0"));
    if (!seconds || !newDate) {
      toast({ title: "Date and seconds are required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("workshop_countdown_prompts" as any).insert({
      session_date: newDate,
      slot: newSlot,
      details: newDetails,
      seconds,
      is_active: startNow,
      started_at: new Date().toISOString(),
    } as any);

    if (error) {
      toast({ title: "Failed to create countdown", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Countdown created" });
    setNewSeconds("10");
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("workshop_countdown_prompts" as any)
      .update({ is_active: !isActive, started_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Failed to update countdown", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: !isActive ? "Countdown started" : "Countdown paused" });
  };

  const removePrompt = async (id: string) => {
    const { error } = await supabase.from("workshop_countdown_prompts" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete countdown", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Countdown deleted" });
  };

  const grouped = useMemo(() => {
    return {
      slot1: items.filter((i) => i.slot === "12pm-3pm"),
      slot2: items.filter((i) => i.slot === "6pm-9pm"),
      all: items.filter((i) => i.slot === "all"),
    };
  }, [items]);

  const renderGroup = (title: string, list: any[]) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {list.length === 0 && <p className="text-xs text-muted-foreground">No countdowns</p>}
      {list.map((item) => (
        <Card key={item.id}>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{new Date(item.session_date + "T00:00:00").toLocaleDateString("en-IN")} · {item.seconds}s</p>
              <p className="text-xs text-muted-foreground">{item.details || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={item.is_active ? "default" : "secondary"}>{item.is_active ? "Active" : "Paused"}</Badge>
              <Button size="icon" variant="ghost" onClick={() => toggleActive(item.id, item.is_active)}>
                <Play className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => removePrompt(item.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Workshop Countdown</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Countdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div>
              <Label>Slot</Label>
              <Select value={newSlot} onValueChange={setNewSlot}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12pm-3pm">{SLOT_LABELS["12pm-3pm"]}</SelectItem>
                  <SelectItem value="6pm-9pm">{SLOT_LABELS["6pm-9pm"]}</SelectItem>
                  <SelectItem value="all">{SLOT_LABELS.all}</SelectItem>
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

          <Button onClick={createPrompt} className="w-full">Create Countdown</Button>
        </CardContent>
      </Card>

      {renderGroup("Slot 1", grouped.slot1)}
      {renderGroup("Slot 2", grouped.slot2)}
      {renderGroup("All Slots", grouped.all)}
    </div>
  );
};

export default AdminWorkshopCountdown;
