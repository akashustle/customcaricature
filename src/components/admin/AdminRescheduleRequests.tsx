import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";

type Req = {
  id: string;
  event_id: string;
  user_id: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  event?: any;
  profile?: any;
};

const AdminRescheduleRequests = () => {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchAll = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("event_reschedule_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });

    const list = (rows || []) as any as Req[];

    if (list.length) {
      const eventIds = [...new Set(list.map(r => r.event_id))];
      const userIds = [...new Set(list.map(r => r.user_id))];
      const [{ data: events }, { data: profiles }] = await Promise.all([
        supabase.from("event_bookings").select("id, event_type, event_date, event_start_time, event_end_time, venue_name, city").in("id", eventIds),
        supabase.from("profiles").select("user_id, full_name, mobile, email").in("user_id", userIds),
      ]);
      const eMap = new Map((events || []).map((e: any) => [e.id, e]));
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      list.forEach(r => { r.event = eMap.get(r.event_id); r.profile = pMap.get(r.user_id); });
    }
    setReqs(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("admin-reschedule-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_reschedule_requests" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const decide = async (req: Req, status: "approved" | "rejected") => {
    setActingId(req.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const update: any = { status, admin_notes: notes[req.id] || null, reviewed_by: user?.id || null, reviewed_at: new Date().toISOString() };
      const { error: uErr } = await supabase.from("event_reschedule_requests" as any).update(update).eq("id", req.id);
      if (uErr) throw uErr;

      // If approved, also push the change to event_bookings
      if (status === "approved") {
        const { error: eErr } = await supabase.from("event_bookings").update({
          event_date: req.requested_date,
          event_start_time: req.requested_start_time,
          event_end_time: req.requested_end_time,
        } as any).eq("id", req.event_id);
        if (eErr) throw eErr;
      }
      toast({ title: status === "approved" ? "Reschedule approved ✅" : "Request rejected" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Event Reschedule Requests</h2>
            <p className="text-xs text-muted-foreground font-sans">Review and approve customer requests to change event date/time.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchAll} className="rounded-full">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : reqs.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-2xl">
          <CalendarDays className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-sans text-muted-foreground">No reschedule requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-sans font-semibold text-sm">{r.profile?.full_name || "Customer"} <span className="text-muted-foreground font-normal">({r.profile?.mobile})</span></p>
                  <p className="text-[11px] text-muted-foreground font-sans">Event: {r.event?.event_type} · {r.event?.venue_name}, {r.event?.city}</p>
                </div>
                <Badge className={`text-[10px] border-none ${r.status === "pending" ? "bg-amber-100 text-amber-800" : r.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                  {r.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                <div className="rounded-xl bg-muted/40 p-2.5">
                  <p className="text-muted-foreground">Current</p>
                  <p className="font-semibold">{r.event && new Date(r.event.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  <p className="text-muted-foreground">{r.event?.event_start_time} – {r.event?.event_end_time}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-2.5 border border-primary/20">
                  <p className="text-primary">Requested</p>
                  <p className="font-semibold">{new Date(r.requested_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  <p className="text-foreground/70">{r.requested_start_time} – {r.requested_end_time}</p>
                </div>
              </div>

              {r.reason && (
                <p className="text-xs font-sans bg-muted/30 rounded-xl p-2.5"><span className="text-muted-foreground">Reason:</span> {r.reason}</p>
              )}

              {r.status === "pending" && (
                <>
                  <Textarea
                    value={notes[r.id] || ""}
                    onChange={(e) => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Optional admin note (visible to customer in audit log)…"
                    className="rounded-xl text-sm min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(r, "approved")} disabled={actingId === r.id}
                      className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve & Update Event
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide(r, "rejected")} disabled={actingId === r.id}
                      className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10">
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                    </Button>
                  </div>
                </>
              )}

              {r.status !== "pending" && r.admin_notes && (
                <p className="text-[11px] font-sans text-muted-foreground italic">Admin note: {r.admin_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRescheduleRequests;
