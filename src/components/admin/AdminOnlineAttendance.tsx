import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle, Clock, Monitor, Pencil, Save, RotateCcw } from "lucide-react";

const ATTENDANCE_DATES = [
  { value: "2026-03-14", label: "14 March 2026" },
  { value: "2026-03-15", label: "15 March 2026" },
];

const SLOT_OPTIONS = [
  { value: "12pm-3pm", label: "Slot 1 (12 PM - 3 PM)" },
  { value: "6pm-9pm", label: "Slot 2 (6 PM - 9 PM)" },
  { value: "all", label: "All Slots" },
];

const dateLabel = (date: string) =>
  ATTENDANCE_DATES.find((d) => d.value === date)?.label ||
  new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const AdminOnlineAttendance = () => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [attendanceEnabled, setAttendanceEnabled] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState("2026-03-14");
  const [newSlot, setNewSlot] = useState("6pm-9pm");
  const [newTiming, setNewTiming] = useState("");

  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("2026-03-14");
  const [editSlot, setEditSlot] = useState("6pm-9pm");
  const [editTiming, setEditTiming] = useState("");

  const [selectedDate, setSelectedDate] = useState("2026-03-14");
  const [selectedSlotFilter, setSelectedSlotFilter] = useState("all");

  useEffect(() => {
    fetchAll();

    const ch = supabase
      .channel("admin-online-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_online_attendance_prompts" }, fetchPrompts)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_attendance" }, fetchAttendance)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_users" }, fetchUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings", filter: "id=eq.online_attendance_enabled" }, fetchAttendanceSetting)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const fetchAll = () => {
    fetchPrompts();
    fetchAttendance();
    fetchUsers();
    fetchAttendanceSetting();
  };

  const fetchPrompts = async () => {
    const { data } = await supabase
      .from("workshop_online_attendance_prompts" as any)
      .select("*")
      .order("updated_at", { ascending: false });

    if (data) setPrompts(data as any[]);
  };

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from("workshop_attendance" as any)
      .select("user_id, session_date, status")
      .eq("status", "present");

    if (data) setAttendance(data as any[]);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("workshop_users" as any)
      .select("id, name, roll_number, slot, email, mobile")
      .eq("is_enabled", true)
      .order("roll_number", { ascending: true });

    if (data) setUsers(data as any[]);
  };

  const fetchAttendanceSetting = async () => {
    const { data } = await supabase
      .from("workshop_settings" as any)
      .select("value")
      .eq("id", "online_attendance_enabled")
      .maybeSingle();

    setAttendanceEnabled((data as any)?.value?.enabled !== false);
  };

  const getUsersForPrompt = (prompt: any) => {
    if (prompt.target_user_id) {
      return users.filter((u) => u.id === prompt.target_user_id);
    }

    if (prompt.slot === "all") return users;
    return users.filter((u) => u.slot === prompt.slot);
  };

  const getMarkedUserIds = (sessionDate: string) => {
    const ids = attendance
      .filter((a) => a.session_date === sessionDate && a.status === "present")
      .map((a) => a.user_id);

    return new Set(ids);
  };

  const createPrompt = async () => {
    if (!newDate) return;

    const { error } = await supabase.from("workshop_online_attendance_prompts" as any).insert({
      session_date: newDate,
      slot: newSlot,
      timing: newTiming || SLOT_OPTIONS.find((s) => s.value === newSlot)?.label || newSlot,
      is_active: false,
      target_user_id: null,
    } as any);

    if (error) {
      toast({ title: "Unable to create prompt", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Prompt created", description: "Activate it to show popup instantly." });
    setShowAdd(false);
    setNewTiming("");
  };

  const startEditingPrompt = (prompt: any) => {
    setEditingPromptId(prompt.id);
    setEditDate(prompt.session_date);
    setEditSlot(prompt.slot);
    setEditTiming(prompt.timing || "");
  };

  const savePromptEdit = async () => {
    if (!editingPromptId) return;

    const { error } = await supabase
      .from("workshop_online_attendance_prompts" as any)
      .update({
        session_date: editDate,
        slot: editSlot,
        timing: editTiming || SLOT_OPTIONS.find((s) => s.value === editSlot)?.label || editSlot,
      } as any)
      .eq("id", editingPromptId);

    if (error) {
      toast({ title: "Unable to update prompt", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Prompt updated" });
    setEditingPromptId(null);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("workshop_online_attendance_prompts" as any)
      .update({ is_active: !isActive } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Unable to update prompt", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: isActive ? "Prompt disabled" : "✅ Prompt enabled" });
  };

  const deletePrompt = async (id: string) => {
    const { error } = await supabase
      .from("workshop_online_attendance_prompts" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Unable to delete prompt", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Prompt deleted" });
  };

  const toggleAttendanceEnabled = async (enabled: boolean) => {
    const { error } = await supabase.from("workshop_settings" as any).upsert(
      {
        id: "online_attendance_enabled",
        value: { enabled },
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "id" }
    );

    if (error) {
      toast({ title: "Unable to update setting", description: error.message, variant: "destructive" });
      return;
    }

    setAttendanceEnabled(enabled);
    toast({ title: enabled ? "Online attendance enabled" : "Online attendance disabled" });
  };

  const repromptUser = async (prompt: any, userId: string, userSlot: string) => {
    const { error } = await supabase.from("workshop_online_attendance_prompts" as any).insert({
      session_date: prompt.session_date,
      slot: userSlot || prompt.slot,
      timing: prompt.timing || prompt.slot,
      is_active: true,
      target_user_id: userId,
    } as any);

    if (error) {
      toast({ title: "Unable to re-prompt", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Re-prompt sent", description: "User will see attendance popup instantly." });
  };

  const dateAttendance = attendance.filter((a) => a.session_date === selectedDate && a.status === "present");
  const attendedUserIds = new Set(dateAttendance.map((a: any) => a.user_id));

  const filteredUsers = selectedSlotFilter === "all" ? users : users.filter((u) => u.slot === selectedSlotFilter);
  const slot1Users = filteredUsers.filter((u) => u.slot === "12pm-3pm");
  const slot2Users = filteredUsers.filter((u) => u.slot === "6pm-9pm");

  const renderUserRow = (u: any, markedSet: Set<string>, allowReprompt = false, promptForReprompt?: any) => {
    const isPresent = markedSet.has(u.id);

    return (
      <div
        key={u.id}
        className={`flex items-center justify-between py-2 px-3 rounded-lg border text-sm ${
          isPresent ? "bg-primary/10 border-primary/30" : "bg-card border-border"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isPresent ? <CheckCircle className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
          <span className="font-body font-medium truncate">{u.name}</span>
          {u.roll_number && <span className="text-xs text-muted-foreground">#{u.roll_number}</span>}
          {u.slot && <Badge variant="outline" className="text-[9px]">{u.slot}</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isPresent ? "default" : "secondary"} className="text-[10px]">
            {isPresent ? "Present ✅" : "Not marked"}
          </Badge>

          {allowReprompt && !isPresent && promptForReprompt && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => repromptUser(promptForReprompt, u.id, u.slot)}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Re-prompt
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Online Attendance</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Enable Online Attendance</Label>
            <Switch checked={attendanceEnabled} onCheckedChange={toggleAttendanceEnabled} />
          </div>

          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Prompt
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-body">Date</Label>
                <Select value={newDate} onValueChange={setNewDate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ATTENDANCE_DATES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-body">Slot</Label>
                <Select value={newSlot} onValueChange={setNewSlot}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOT_OPTIONS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-body">Display Timing</Label>
                <Input
                  value={newTiming}
                  onChange={(e) => setNewTiming(e.target.value)}
                  placeholder="e.g. 6:00 PM - 9:00 PM"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={createPrompt}>Create</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-body font-semibold">Attendance Prompts</h3>
        {prompts.length === 0 && <p className="text-sm text-muted-foreground">No prompts created yet</p>}

        {prompts.map((p: any) => {
          const audience = getUsersForPrompt(p);
          const markedSet = getMarkedUserIds(p.session_date);
          const slot1Audience = audience.filter((u) => u.slot === "12pm-3pm");
          const slot2Audience = audience.filter((u) => u.slot === "6pm-9pm");
          const isEditing = editingPromptId === p.id;

          return (
            <Card key={p.id} className="border">
              <CardContent className="py-3 px-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-body font-semibold">{dateLabel(p.session_date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.timing || p.slot} · Slot: {p.slot}
                    </p>
                    {p.target_user_id && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Targeted re-prompt for one user</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px]">
                      {p.is_active ? "🟢 Active" : "Inactive"}
                    </Badge>
                    {!p.target_user_id && (
                      <Button variant="ghost" size="icon" onClick={() => startEditingPrompt(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                    <Button variant="ghost" size="icon" onClick={() => deletePrompt(p.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-lg border p-3 bg-muted/20">
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Select value={editDate} onValueChange={setEditDate}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ATTENDANCE_DATES.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Slot</Label>
                      <Select value={editSlot} onValueChange={setEditSlot}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SLOT_OPTIONS.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Timing</Label>
                      <Input value={editTiming} onChange={(e) => setEditTiming(e.target.value)} />
                    </div>

                    <div className="md:col-span-3 flex gap-2">
                      <Button size="sm" onClick={savePromptEdit}><Save className="w-4 h-4 mr-1" /> Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPromptId(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {!p.target_user_id && (
                  <div className="space-y-2">
                    {(p.slot === "all" || p.slot === "12pm-3pm") && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-primary">Slot 1 — 12:00 PM to 3:00 PM</h4>
                        {slot1Audience.length === 0 && <p className="text-xs text-muted-foreground">No users in this slot</p>}
                        {slot1Audience.map((u) => renderUserRow(u, markedSet, true, p))}
                      </div>
                    )}

                    {(p.slot === "all" || p.slot === "6pm-9pm") && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-primary">Slot 2 — 6:00 PM to 9:00 PM</h4>
                        {slot2Audience.length === 0 && <p className="text-xs text-muted-foreground">No users in this slot</p>}
                        {slot2Audience.map((u) => renderUserRow(u, markedSet, true, p))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-body font-semibold">Online Attendance Records</h3>

          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-52 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ATTENDANCE_DATES.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSlotFilter} onValueChange={setSelectedSlotFilter}>
            <SelectTrigger className="w-44 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Slots</SelectItem>
              <SelectItem value="12pm-3pm">Slot 1 (12-3)</SelectItem>
              <SelectItem value="6pm-9pm">Slot 2 (6-9)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(selectedSlotFilter === "all" || selectedSlotFilter === "12pm-3pm") && (
          <div className="space-y-2">
            <h4 className="text-xs font-body font-bold text-primary flex items-center gap-1">
              📌 Slot 1 — 12:00 PM – 3:00 PM
              <Badge variant="outline" className="text-[9px] ml-1">
                {slot1Users.filter((u) => attendedUserIds.has(u.id)).length}/{slot1Users.length}
              </Badge>
            </h4>
            <div className="grid gap-1.5">
              {slot1Users.map((u) => renderUserRow(u, attendedUserIds))}
              {slot1Users.length === 0 && <p className="text-xs text-muted-foreground">No users in this slot</p>}
            </div>
          </div>
        )}

        {(selectedSlotFilter === "all" || selectedSlotFilter === "6pm-9pm") && (
          <div className="space-y-2">
            <h4 className="text-xs font-body font-bold text-primary flex items-center gap-1">
              📌 Slot 2 — 6:00 PM – 9:00 PM
              <Badge variant="outline" className="text-[9px] ml-1">
                {slot2Users.filter((u) => attendedUserIds.has(u.id)).length}/{slot2Users.length}
              </Badge>
            </h4>
            <div className="grid gap-1.5">
              {slot2Users.map((u) => renderUserRow(u, attendedUserIds))}
              {slot2Users.length === 0 && <p className="text-xs text-muted-foreground">No users in this slot</p>}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Total: {dateAttendance.length} / {filteredUsers.length} users marked present for {dateLabel(selectedDate)}
        </p>
      </div>
    </div>
  );
};

export default AdminOnlineAttendance;
