import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, ShieldCheck, User as UserIcon, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

type Submission = {
  id: string; user_id: string | null; name: string; email: string; mobile: string | null;
  subject: string | null; message: string; is_read: boolean; created_at: string;
  unread?: number;
};
type Reply = { id: string; submission_id: string; sender_id: string | null; is_admin: boolean; body: string; created_at: string; read_at: string | null; };

const AdminContactReplies = ({ adminUserId }: { adminUserId: string }) => {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSubs = async () => {
    const { data } = await supabase.from("contact_submissions" as any)
      .select("*").order("created_at", { ascending: false }).limit(100);
    const list = (data as any[] as Submission[]) || [];
    // unread counts
    const ids = list.map(s => s.id);
    if (ids.length) {
      const { data: rep } = await supabase.from("contact_replies" as any)
        .select("submission_id,is_admin,read_at").in("submission_id", ids);
      const counts: Record<string, number> = {};
      (rep as any[] || []).forEach(r => {
        if (!r.is_admin && !r.read_at) counts[r.submission_id] = (counts[r.submission_id] || 0) + 1;
      });
      list.forEach(s => { s.unread = counts[s.id] || 0; });
    }
    setSubs(list);
    if (!activeId && list.length) setActiveId(list[0].id);
  };

  useEffect(() => {
    loadSubs();
    const ch = supabase.channel("admin-contact-subs")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_submissions" }, () => loadSubs())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_replies" }, () => loadSubs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!activeId) { setReplies([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("contact_replies" as any)
        .select("*").eq("submission_id", activeId).order("created_at", { ascending: true });
      if (cancelled) return;
      setReplies((data as any[]) || []);
      supabase.rpc("mark_contact_replies_read" as any, { _submission_id: activeId } as any);
      supabase.from("contact_submissions" as any).update({ is_read: true } as any).eq("id", activeId);
    })();
    const ch = supabase.channel(`admin-thread-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_replies", filter: `submission_id=eq.${activeId}` },
        (p) => setReplies(prev => prev.some(r => r.id === (p.new as any).id) ? prev : [...prev, p.new as any]))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [replies.length]);

  const send = async () => {
    if (!body.trim() || !activeId) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    const optimistic: Reply = { id: `tmp-${Date.now()}`, submission_id: activeId, sender_id: adminUserId, is_admin: true, body: text, created_at: new Date().toISOString(), read_at: null };
    setReplies(prev => [...prev, optimistic]);
    const { error } = await supabase.from("contact_replies" as any).insert({
      submission_id: activeId, sender_id: adminUserId, is_admin: true, body: text,
    } as any);
    if (error) {
      setReplies(prev => prev.filter(r => r.id !== optimistic.id));
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
    }
    setSending(false);
  };

  const active = subs.find(s => s.id === activeId);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[280px_1fr] min-h-[520px]">
          {/* Sidebar */}
          <div className="border-r bg-muted/30 max-h-[600px] overflow-y-auto">
            <div className="p-3 flex items-center gap-2 border-b sticky top-0 bg-muted/40 backdrop-blur">
              <Inbox className="w-4 h-4" /> <p className="text-sm font-semibold">Contact threads</p>
              <Badge className="ml-auto text-[10px]">{subs.length}</Badge>
            </div>
            {subs.length === 0 && <p className="text-xs text-muted-foreground p-4">No contact submissions yet.</p>}
            {subs.map(s => (
              <button key={s.id} onClick={() => setActiveId(s.id)}
                className={`w-full text-left p-3 border-b hover:bg-background/50 transition-colors ${activeId === s.id ? "bg-background" : ""}`}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate flex-1">{s.name}</p>
                  {!!s.unread && <Badge className="bg-red-500 text-white text-[10px]">{s.unread}</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{s.subject || s.message}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{new Date(s.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </button>
            ))}
          </div>

          {/* Thread */}
          <div className="flex flex-col">
            {active ? (
              <>
                <div className="p-3 border-b">
                  <p className="text-sm font-bold">{active.name} <span className="text-muted-foreground font-normal">· {active.email}</span></p>
                  <p className="text-xs text-muted-foreground">{active.subject || "No subject"} · {active.mobile || "no mobile"}</p>
                </div>
                <div className="p-3 bg-muted/20 text-sm border-b">{active.message}</div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[360px]">
                  <AnimatePresence>
                    {replies.map(r => (
                      <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${r.is_admin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          r.is_admin ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-muted text-foreground"
                        }`}>
                          <div className="flex items-center gap-1 mb-0.5 text-[10px] opacity-80">
                            {r.is_admin ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                            <span>{r.is_admin ? "You (admin)" : active.name}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{r.body}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="p-3 border-t flex gap-2">
                  <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Reply…"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    className="min-h-[44px] max-h-32 resize-none rounded-xl" />
                  <Button onClick={send} disabled={sending || !body.trim()}><Send className="w-4 h-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <MessageCircle className="w-5 h-5 mr-2" /> Select a thread
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminContactReplies;
