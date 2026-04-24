/**
 * AdminProfileVerification — booking-account blue-tick inbox for the Main Admin.
 *
 * Sister component of `workshop/AdminWorkshopVerification` but operates on
 * `public.profiles`:
 *   • Lists every booking user with their verification state.
 *   • Approve / Reject / Reset with optional notes.
 *   • Each row shows the user-uploaded avatar (admin can sanity-check it).
 *   • Approve / reject is logged to `profile_verification_history` and the
 *     user is notified in-app.
 *
 * Updates are written directly via the typed Supabase client (no edge
 * function required) using a row-level update on `profiles`.
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
import { BadgeCheck, Clock, X, Search, History, ShieldCheck, ChevronDown, ChevronUp, RotateCcw, ImageOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ProfileRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  verification_status: string | null;
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
  pending:   { label: "Pending review", cls: "bg-amber-500/15 text-amber-800 border-amber-300", icon: Clock },
  rejected:  { label: "Rejected", cls: "bg-rose-500/15 text-rose-700 border-rose-300", icon: X },
  unverified:{ label: "Unverified", cls: "bg-slate-500/15 text-slate-700 border-slate-300", icon: ShieldCheck },
};

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const AdminProfileVerification = ({ adminName = "Admin" }: { adminName?: string }) => {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected" | "unverified">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [actionDialog, setActionDialog] = useState<{ user: ProfileRow; mode: "approve" | "reject" | "reset" } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email, mobile, avatar_url, is_verified, verification_status, verification_submitted_at, verification_notes, verified_at, verified_by, city, state")
      .order("verification_submitted_at", { ascending: false, nullsFirst: false });
    if (data) setUsers(data as any);
  };

  useEffect(() => {
    fetchUsers();
    const ch = supabase.channel("profile-verify-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchUsers)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadHistory = async (userId: string) => {
    const { data } = await (supabase
      .from("profile_verification_history" as any) as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setHistory(h => ({ ...h, [userId]: (data as any[]) || [] }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const status = u.verification_status || "unverified";
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      return (u.full_name || "").toLowerCase().includes(q)
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
    if (actionDialog.mode === "reject" && notes.trim().length < 4) {
      toast({ title: "Add a short reason", description: "Tell the user what to fix (4+ chars).", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { user, mode } = actionDialog;
      const previous = user.verification_status || "unverified";
      const newStatus = mode === "approve" ? "verified" : mode === "reject" ? "rejected" : "unverified";
      const update: Record<string, any> = {
        verification_status: newStatus,
        verification_notes: notes.trim() || null,
      };
      if (mode === "approve") {
        update.is_verified = true;
        update.verified_at = new Date().toISOString();
        update.verified_by = adminName;
      } else if (mode === "reject") {
        update.is_verified = false;
      } else {
        update.is_verified = false;
        update.verified_at = null;
        update.verified_by = null;
        update.verification_submitted_at = null;
      }

      const { error: upErr } = await supabase.from("profiles").update(update as any).eq("user_id", user.user_id);
      if (upErr) throw upErr;

      // Log history (best-effort)
      try {
        await (supabase.from("profile_verification_history" as any) as any).insert({
          user_id: user.user_id,
          action: mode,
          previous_status: previous,
          new_status: newStatus,
          performed_by: adminName,
          notes: notes.trim() || null,
        } as any);
      } catch {/* non-fatal */}

      // Notify user (best-effort, fans out to push via DB trigger)
      try {
        await supabase.from("notifications").insert({
          user_id: user.user_id,
          title: mode === "approve" ? "✅ You're verified!" : mode === "reject" ? "❌ Verification declined" : "🔄 Verification reset",
          message: mode === "approve"
            ? "Your blue-tick is live. Welcome to the verified club."
            : mode === "reject"
              ? `Please update your details and re-submit.${notes.trim() ? " Note: " + notes.trim() : ""}`
              : "Your verification status was reset. You may submit again.",
          type: "system",
          link: "/dashboard",
        } as any);
      } catch {/* non-fatal */}

      toast({ title: mode === "approve" ? "✅ Verified!" : mode === "reject" ? "Rejected" : "Reset" });
      setActionDialog(null);
      setNotes("");
      fetchUsers();
      if (expanded === user.user_id) loadHistory(user.user_id);
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
            className={`relative overflow-hidden rounded-2xl p-4 text-left border-2 transition shadow-sm bg-card ${filter === t.key ? "border-primary scale-[1.02]" : "border-border"}`}>
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 bg-gradient-to-br ${t.color}`} />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.label}</p>
            <p className="text-3xl font-extrabold mt-1 text-foreground">{t.n}</p>
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
          <div className="text-center py-10 text-sm text-muted-foreground">No users match the current filter.</div>
        )}
        {filtered.map(u => {
          const status = (u.verification_status || "unverified") as keyof typeof statusBadge;
          const meta = statusBadge[status] || statusBadge.unverified;
          const Icon = meta.icon;
          const isOpen = expanded === u.user_id;
          const isVerifiedFinal = u.is_verified || status === "verified";
          const hasAvatar = !!u.avatar_url;
          return (
            <motion.div key={u.user_id} layout
              className="rounded-2xl border-2 border-border bg-card shadow-sm overflow-hidden">
              <div className="p-3 flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-14 h-14 border-2 border-border">
                    <AvatarImage src={u.avatar_url || undefined} alt={u.full_name || "user"} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 font-bold text-foreground">
                      {(u.full_name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!hasAvatar && status === "pending" && (
                    <span title="No avatar uploaded" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-card flex items-center justify-center">
                      <ImageOff className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm truncate text-foreground">{u.full_name || "—"}</p>
                    {isVerifiedFinal && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" />}
                    <Badge variant="outline" className={`text-[10px] font-bold ${meta.cls}`}>
                      <Icon className="w-3 h-3 mr-1" />{meta.label}
                    </Badge>
                    {!hasAvatar && (
                      <Badge variant="outline" className="text-[10px] font-bold bg-rose-500/10 text-rose-700 border-rose-300">
                        No photo
                      </Badge>
                    )}
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
                      const next = isOpen ? null : u.user_id;
                      setExpanded(next);
                      if (next) loadHistory(u.user_id);
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
                      {(history[u.user_id] || []).length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No history yet.</p>
                      )}
                      {(history[u.user_id] || []).map(h => (
                        <div key={h.id} className="flex gap-3 items-start">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            h.action === "approve" ? "bg-emerald-500" :
                            h.action === "reject" ? "bg-rose-500" :
                            h.action === "submit" ? "bg-amber-500" : "bg-slate-500"
                          }`} />
                          <div className="flex-1">
                            <p className="text-xs font-semibold capitalize text-foreground">
                              {h.action} <span className="text-muted-foreground font-normal">— by {h.performed_by || "system"}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground">{formatTime(h.created_at)}</p>
                            {h.notes && <p className="text-xs mt-1 italic bg-background/60 rounded-lg px-2 py-1 border border-border text-foreground">"{h.notes}"</p>}
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
              {actionDialog?.mode === "approve" && <>✅ Approve {actionDialog.user.full_name || "user"}?</>}
              {actionDialog?.mode === "reject" && <>Reject {actionDialog.user.full_name || "user"}?</>}
              {actionDialog?.mode === "reset" && <>Reset verification for {actionDialog.user.full_name || "user"}?</>}
            </DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="flex items-center gap-3 mb-2 p-3 rounded-xl bg-muted/40 border border-border">
              <Avatar className="w-12 h-12 border-2 border-border">
                <AvatarImage src={actionDialog.user.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 font-bold text-foreground">
                  {(actionDialog.user.full_name || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate text-foreground">{actionDialog.user.full_name || "—"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{actionDialog.user.email || actionDialog.user.mobile}</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {actionDialog?.mode === "approve" && "The user will see a verified blue tick on their profile and get an in-app notification."}
              {actionDialog?.mode === "reject" && "The user will be notified. Add a short reason so they know what to fix."}
              {actionDialog?.mode === "reset" && "Clears the current status so the user can re-submit."}
            </p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={actionDialog?.mode === "reject" ? "Reason (visible to the user)…" : "Optional internal notes…"}
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

export default AdminProfileVerification;
