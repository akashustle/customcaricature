/**
 * AdminWorkshopVerification — surfaced inside the Workshop Admin Panel.
 *
 * - Lists every workshop student with their current verification state.
 * - One-click Approve / Reject (with optional notes) — calls the
 *   `workshop-update-profile` edge function which logs the change to
 *   `workshop_verification_history` and notifies the student in-app.
 * - Each row expands to a timeline of every action ever taken on that user
 *   (submit / approve / reject / reset, with admin name + notes + timestamp).
 */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { BadgeCheck, Clock, X, Search, History, ShieldCheck, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type WorkshopUser = {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verification_status: string;
  verification_submitted_at: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  city: string | null;
  state: string | null;
};

type HistoryEntry = {
  id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
};

const statusBadge: Record<string, { label: string; cls: string; icon: any }> = {
  verified:  { label: "Verified", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-300", icon: BadgeCheck },
  pending:   { label: "Pending review", cls: "bg-amber-500/15 text-amber-700 border-amber-300", icon: Clock },
  rejected:  { label: "Rejected", cls: "bg-rose-500/15 text-rose-700 border-rose-300", icon: X },
  unverified:{ label: "Unverified", cls: "bg-slate-500/15 text-slate-700 border-slate-300", icon: ShieldCheck },
};

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const AdminWorkshopVerification = ({ adminName = "Admin" }: { adminName?: string }) => {
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected" | "unverified">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [actionDialog, setActionDialog] = useState<{ user: WorkshopUser; mode: "approve" | "reject" | "reset" } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("workshop_users" as any)
      .select("id, name, email, mobile, avatar_url, is_verified, verification_status, verification_submitted_at, verification_notes, verified_at, verified_by, city, state")
      .order("verification_submitted_at", { ascending: false, nullsFirst: false });
    if (data) setUsers(data as any);
  };

  useEffect(() => {
    fetchUsers();
    const ch = supabase.channel("ws-verify-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_users" }, fetchUsers)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadHistory = async (userId: string) => {
    const { data } = await supabase
      .from("workshop_verification_history" as any)
      .select("*")
      .eq("workshop_user_id", userId)
      .order("created_at", { ascending: false });
    setHistory(h => ({ ...h, [userId]: (data as any[]) || [] }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (filter !== "all" && (u.verification_status || "unverified") !== filter) return false;
      if (!q) return true;
      return (u.name || "").toLowerCase().includes(q)
        || (u.email || "").toLowerCase().includes(q)
        || (u.mobile || "").includes(q);
    });
  }, [users, search, filter]);

  const counts = useMemo(() => ({
    pending: users.filter(u => u.verification_status === "pending").length,
    verified: users.filter(u => u.verification_status === "verified" || u.is_verified).length,
    rejected: users.filter(u => u.verification_status === "rejected").length,
    unverified: users.filter(u => !u.verification_status || u.verification_status === "unverified").length,
  }), [users]);

  const performAction = async () => {
    if (!actionDialog) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("workshop-update-profile", {
        body: {
          user_id: actionDialog.user.id,
          login_email: actionDialog.user.email || "",
          login_mobile: actionDialog.user.mobile || "",
          admin_action: actionDialog.mode,
          admin_name: adminName,
          notes: notes.trim() || null,
        },
      });
      if (error || !(data as any)?.success) throw new Error((data as any)?.error || error?.message || "Action failed");
      toast({ title: actionDialog.mode === "approve" ? "✅ Verified!" : actionDialog.mode === "reject" ? "Rejected" : "Reset" });
      setActionDialog(null);
      setNotes("");
      fetchUsers();
      if (expanded === actionDialog.user.id) loadHistory(actionDialog.user.id);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { key: "pending", label: "Awaiting review", n: counts.pending, color: "from-amber-400 to-orange-500" },
          { key: "verified", label: "Verified", n: counts.verified, color: "from-emerald-400 to-teal-500" },
          { key: "rejected", label: "Rejected", n: counts.rejected, color: "from-rose-400 to-pink-500" },
          { key: "unverified", label: "Unverified", n: counts.unverified, color: "from-slate-400 to-slate-600" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`relative overflow-hidden rounded-2xl p-4 text-left border-2 transition shadow-sm ${filter === t.key ? "border-primary scale-[1.02]" : "border-border"}`}>
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 bg-gradient-to-br ${t.color}`} />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.label}</p>
            <p className="text-3xl font-extrabold mt-1">{t.n}</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, email, mobile…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-full" />
        </div>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")} className="rounded-full">All</Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">No students match the current filter.</div>
        )}
        {filtered.map(u => {
          const status = (u.verification_status || "unverified") as keyof typeof statusBadge;
          const meta = statusBadge[status] || statusBadge.unverified;
          const Icon = meta.icon;
          const isOpen = expanded === u.id;
          const isVerifiedFinal = u.is_verified || status === "verified";
          return (
            <motion.div key={u.id} layout
              className="rounded-2xl border-2 border-border bg-card shadow-sm overflow-hidden">
              <div className="p-3 flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-border">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 font-bold">
                    {(u.name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm truncate">{u.name || "—"}</p>
                    {isVerifiedFinal && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" />}
                    <Badge variant="outline" className={`text-[10px] font-bold ${meta.cls}`}>
                      <Icon className="w-3 h-3 mr-1" />{meta.label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {u.email || u.mobile || "—"} • {u.city || "—"}{u.state ? `, ${u.state}` : ""}
                  </p>
                  {u.verification_submitted_at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Submitted {formatTime(u.verification_submitted_at)}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {status !== "verified" && (
                    <Button size="sm" className="h-7 rounded-full text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => { setActionDialog({ user: u, mode: "approve" }); setNotes(""); }}>
                      <BadgeCheck className="w-3 h-3 mr-1" /> Approve
                    </Button>
                  )}
                  {status === "pending" && (
                    <Button size="sm" variant="outline" className="h-7 rounded-full text-[11px] border-rose-300 text-rose-600"
                      onClick={() => { setActionDialog({ user: u, mode: "reject" }); setNotes(""); }}>
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  )}
                  {(status === "verified" || status === "rejected") && (
                    <Button size="sm" variant="ghost" className="h-7 rounded-full text-[11px]"
                      onClick={() => { setActionDialog({ user: u, mode: "reset" }); setNotes(""); }}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Reset
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 rounded-full text-[11px]"
                    onClick={() => {
                      const next = isOpen ? null : u.id;
                      setExpanded(next);
                      if (next) loadHistory(u.id);
                    }}>
                    <History className="w-3 h-3 mr-1" />
                    {isOpen ? <>Hide <ChevronUp className="w-3 h-3 ml-0.5" /></> : <>Timeline <ChevronDown className="w-3 h-3 ml-0.5" /></>}
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border bg-muted/30">
                    <div className="p-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Verification timeline
                      </p>
                      {(history[u.id] || []).length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No history yet.</p>
                      )}
                      {(history[u.id] || []).map(h => (
                        <div key={h.id} className="flex gap-3 items-start">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            h.action === "approve" ? "bg-emerald-500" :
                            h.action === "reject" ? "bg-rose-500" :
                            h.action === "submit" ? "bg-amber-500" : "bg-slate-500"
                          }`} />
                          <div className="flex-1">
                            <p className="text-xs font-semibold capitalize">
                              {h.action} <span className="text-muted-foreground font-normal">— by {h.performed_by || "system"}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground">{formatTime(h.created_at)}</p>
                            {h.notes && <p className="text-xs mt-1 italic bg-background/60 rounded-lg px-2 py-1 border border-border">"{h.notes}"</p>}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {h.previous_status || "—"} → {h.new_status || "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Action dialog */}
      <Dialog open={!!actionDialog} onOpenChange={open => { if (!open) { setActionDialog(null); setNotes(""); } }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.mode === "approve" && <>✅ Approve {actionDialog.user.name}?</>}
              {actionDialog?.mode === "reject" && <>Reject {actionDialog.user.name}?</>}
              {actionDialog?.mode === "reset" && <>Reset verification for {actionDialog.user.name}?</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {actionDialog?.mode === "approve" && "The student will see a verified blue tick on their profile and get an in-app notification."}
              {actionDialog?.mode === "reject" && "The student will be notified. Add a short reason so they know what to fix."}
              {actionDialog?.mode === "reset" && "Clears the current status so the student can re-submit."}
            </p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={actionDialog?.mode === "reject" ? "Reason (visible to the student)…" : "Optional internal notes…"}
              rows={3} className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={performAction} disabled={busy}
              className={
                actionDialog?.mode === "approve" ? "bg-emerald-500 hover:bg-emerald-600 text-white" :
                actionDialog?.mode === "reject" ? "bg-rose-500 hover:bg-rose-600 text-white" :
                ""
              }>
              {busy ? "Working…" : actionDialog?.mode === "approve" ? "Approve" : actionDialog?.mode === "reject" ? "Reject" : "Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWorkshopVerification;
