/**
 * EditRequestsInbox — admin inbox for "Request to edit my profile" submissions.
 *
 * Used by both:
 *   • Main Admin panel  → scope="profile"  (table: profile_edit_requests)
 *   • Workshop Admin    → scope="workshop" (table: workshop_edit_requests)
 *
 * Approving a request bumps `edits_remaining` on the matching profile/
 * workshop_users row by `edits_granted` (default 1). Rejecting just
 * marks the request rejected with the admin's response. The user is
 * notified in-app via the `notifications` table (which fans out to web
 * push). The user's submitted avatar is shown next to every request so
 * the admin can sanity-check it before granting edits.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Inbox, Search, CheckCircle2, XCircle, Clock, Loader2,
  Shield, MessageSquare, Plus, Minus,
} from "lucide-react";

type Scope = "profile" | "workshop";

type Request = {
  id: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | string;
  edits_granted: number;
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_id?: string;
  workshop_user_id?: string;
  // Joined display fields populated client-side
  user_name?: string | null;
  user_email?: string | null;
  user_mobile?: string | null;
  user_avatar?: string | null;
  user_is_verified?: boolean;
  user_edits_remaining?: number;
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const EditRequestsInbox = ({
  scope,
  adminName = "Admin",
}: {
  scope: Scope;
  adminName?: string;
}) => {
  const [rows, setRows] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [active, setActive] = useState<Request | null>(null);
  const [response, setResponse] = useState("");
  const [grantCount, setGrantCount] = useState(1);
  const [busy, setBusy] = useState(false);

  const reqTable = scope === "profile" ? "profile_edit_requests" : "workshop_edit_requests";
  const userTable = scope === "profile" ? "profiles" : "workshop_users";
  const userIdCol = scope === "profile" ? "user_id" : "workshop_user_id";
  const userPk = scope === "profile" ? "user_id" : "id";

  const load = async () => {
    setLoading(true);
    const { data: reqs } = await (supabase.from(reqTable as any) as any)
      .select("*")
      .order("created_at", { ascending: false });

    const list: Request[] = (reqs as any[]) || [];
    if (list.length) {
      const ids = Array.from(new Set(list.map(r => r[userIdCol]).filter(Boolean)));
      if (ids.length) {
        const userQuery: any =
          scope === "profile"
            ? supabase.from("profiles").select("user_id, full_name, email, mobile, avatar_url, is_verified, edits_remaining").in("user_id", ids as string[])
            : supabase.from("workshop_users" as any).select("id, name, email, mobile, avatar_url, is_verified, edits_remaining").in("id", ids as string[]);
        const { data: users } = await userQuery;
        const map = new Map<string, any>();
        (users as any[] || []).forEach((u: any) => map.set(u[userPk], u));
        list.forEach(r => {
          const u = map.get(r[userIdCol]);
          if (u) {
            r.user_name = scope === "profile" ? u.full_name : u.name;
            r.user_email = u.email;
            r.user_mobile = u.mobile;
            r.user_avatar = u.avatar_url;
            r.user_is_verified = u.is_verified;
            r.user_edits_remaining = u.edits_remaining ?? 0;
          }
        });
      }
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`edit-req-${scope}`)
      .on("postgres_changes", { event: "*", schema: "public", table: reqTable }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const counts = useMemo(() => ({
    pending: rows.filter(r => r.status === "pending").length,
    approved: rows.filter(r => r.status === "approved").length,
    rejected: rows.filter(r => r.status === "rejected").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (r.user_name || "").toLowerCase().includes(q)
        || (r.user_email || "").toLowerCase().includes(q)
        || (r.user_mobile || "").includes(q)
        || (r.reason || "").toLowerCase().includes(q);
    });
  }, [rows, search, filter]);

  const closeDialog = () => { setActive(null); setResponse(""); setGrantCount(1); };

  const decide = async (mode: "approve" | "reject") => {
    if (!active) return;
    if (mode === "reject" && response.trim().length < 5) {
      toast({ title: "Add a short reason", description: "Tell the user why you're rejecting (5+ chars).", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      // 1. Update the request row
      const { error: rErr } = await (supabase.from(reqTable as any) as any)
        .update({
          status: mode === "approve" ? "approved" : "rejected",
          admin_response: response.trim() || null,
          edits_granted: mode === "approve" ? grantCount : 0,
          reviewed_by: adminName,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", active.id);
      if (rErr) throw rErr;

      // 2. If approved, bump edits_remaining on the user row
      if (mode === "approve") {
        const targetId = (active as any)[userIdCol];
        const newEdits = (active.user_edits_remaining ?? 0) + grantCount;
        const { error: uErr } = await (supabase.from(userTable as any) as any)
          .update({ edits_remaining: newEdits, edit_lock_reason: null } as any)
          .eq(userPk, targetId);
        if (uErr) throw uErr;
      }

      // 3. Notify the user in-app (best-effort).
      // For workshop scope the request stores workshop_users.id which is NOT
      // the auth.users.id, so we look up the linked auth_user_id first.
      try {
        let notifyAuthId: string | null = null;
        if (scope === "profile") {
          notifyAuthId = (active as any).user_id;
        } else {
          const { data: wu } = await (supabase.from("workshop_users" as any) as any)
            .select("auth_user_id").eq("id", (active as any).workshop_user_id).maybeSingle();
          notifyAuthId = (wu as any)?.auth_user_id || null;
        }
        if (notifyAuthId) {
          await (supabase.from("notifications") as any).insert({
            user_id: notifyAuthId,
            title: mode === "approve" ? "✏️ Edit access granted" : "❌ Edit request rejected",
            message: mode === "approve"
              ? `You have been granted ${grantCount} profile edit${grantCount > 1 ? "s" : ""}.${response.trim() ? " Note: " + response.trim() : ""}`
              : `Your edit request was declined. ${response.trim()}`,
            type: "system",
            link: scope === "profile" ? "/dashboard" : "/workshop-dashboard",
          });
        }
      } catch {/* non-fatal */}

      toast({ title: mode === "approve" ? `✅ Granted ${grantCount} edit${grantCount > 1 ? "s" : ""}` : "Request rejected" });
      closeDialog();
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: "pending",  label: "Pending",  n: counts.pending,  color: "from-amber-400 to-orange-500",  Icon: Clock },
          { key: "approved", label: "Approved", n: counts.approved, color: "from-emerald-400 to-teal-500",  Icon: CheckCircle2 },
          { key: "rejected", label: "Rejected", n: counts.rejected, color: "from-rose-400 to-pink-500",     Icon: XCircle },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key as any)}
            className={`relative overflow-hidden rounded-2xl p-4 text-left border-2 transition shadow-sm bg-card ${filter === t.key ? "border-primary scale-[1.02]" : "border-border"}`}>
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 bg-gradient-to-br ${t.color}`} />
            <div className="flex items-center gap-2">
              <t.Icon className="w-4 h-4 text-foreground/70" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t.label}</p>
            </div>
            <p className="text-3xl font-extrabold mt-1 text-foreground">{t.n}</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, mobile or reason…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-full" />
        </div>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")} className="rounded-full">All</Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading edit requests…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card/40 py-10 text-center">
            <Inbox className="w-10 h-10 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter} edit requests right now.</p>
          </div>
        )}
        {filtered.map(r => {
          const statusCls =
            r.status === "approved" ? "bg-emerald-500/15 text-emerald-700 border-emerald-300" :
            r.status === "rejected" ? "bg-rose-500/15 text-rose-700 border-rose-300" :
            "bg-amber-500/15 text-amber-800 border-amber-300";
          return (
            <motion.div key={r.id} layout
              className="rounded-2xl border-2 border-border bg-card shadow-sm overflow-hidden">
              <div className="p-3 flex items-start gap-3">
                <Avatar className="w-12 h-12 border-2 border-border flex-shrink-0">
                  <AvatarImage src={r.user_avatar || undefined} alt={r.user_name || "user"} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 font-bold text-foreground">
                    {(r.user_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm truncate text-foreground">{r.user_name || "Unknown user"}</p>
                    {r.user_is_verified && <Shield className="w-3.5 h-3.5 text-blue-500" />}
                    <Badge variant="outline" className={`text-[10px] font-bold ${statusCls}`}>
                      {r.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Edits left: <span className="font-bold text-foreground">{r.user_edits_remaining ?? 0}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {r.user_email || r.user_mobile || "—"} • requested {fmt(r.created_at)}
                  </p>
                  <div className="mt-2 rounded-xl bg-muted/40 border border-border px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Reason
                    </p>
                    <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">{r.reason}</p>
                  </div>
                  {r.admin_response && (
                    <p className="text-[11px] mt-1.5 italic text-foreground/80">
                      Admin: "{r.admin_response}" {r.reviewed_by ? `— ${r.reviewed_by}` : ""}
                    </p>
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Button size="sm" className="h-7 rounded-full text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => { setActive(r); setResponse(""); setGrantCount(1); }}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Review
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Decision dialog */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !busy && closeDialog()}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-card text-foreground rounded-3xl border border-border shadow-2xl p-6 relative"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-12 h-12 border-2 border-border">
                  <AvatarImage src={active.user_avatar || undefined} alt={active.user_name || "user"} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 font-bold">
                    {(active.user_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{active.user_name || "Unknown user"}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{active.user_email || active.user_mobile}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Currently has <span className="font-bold text-foreground">{active.user_edits_remaining ?? 0}</span> edit{(active.user_edits_remaining ?? 0) === 1 ? "" : "s"} left
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/50 border border-border px-3 py-2 mb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">User's reason</p>
                <p className="text-sm whitespace-pre-wrap">{active.reason}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold mb-1.5">How many edits to grant?</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8 w-8 rounded-full p-0"
                      onClick={() => setGrantCount(Math.max(1, grantCount - 1))} disabled={busy || grantCount <= 1}>
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-bold text-2xl w-10 text-center">{grantCount}</span>
                    <Button size="sm" variant="outline" className="h-8 w-8 rounded-full p-0"
                      onClick={() => setGrantCount(Math.min(20, grantCount + 1))} disabled={busy || grantCount >= 20}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <p className="text-[11px] text-muted-foreground ml-2">
                      Each edit lets the user change their profile once.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-1.5">Note to user (optional for approve, required for reject)</p>
                  <Textarea
                    rows={3}
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="e.g. Update your phone number only — keep avatar as is."
                    className="rounded-xl"
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <Button variant="ghost" onClick={closeDialog} disabled={busy} className="rounded-full">Cancel</Button>
                <Button
                  variant="outline"
                  onClick={() => decide("reject")}
                  disabled={busy}
                  className="rounded-full border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                  Reject
                </Button>
                <Button
                  onClick={() => decide("approve")}
                  disabled={busy}
                  className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                  Approve & grant {grantCount}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EditRequestsInbox;
