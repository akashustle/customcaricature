import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ShieldCheck, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

type Reply = {
  id: string;
  submission_id: string;
  sender_id: string | null;
  is_admin: boolean;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Submission = {
  id: string;
  subject: string | null;
  message: string;
  created_at: string;
};

const SupportThread = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch submissions for current user
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("contact_submissions" as any)
        .select("id,subject,message,created_at")
        .order("created_at", { ascending: false }).limit(20);
      if (cancelled) return;
      const list = (data as any[] as Submission[]) || [];
      setSubmissions(list);
      if (!activeId && list.length) setActiveId(list[0].id);
    };
    load();
    const ch = supabase.channel(`support-subs-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_submissions" }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  // Load + subscribe to replies for active thread
  useEffect(() => {
    if (!activeId) { setReplies([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("contact_replies" as any)
        .select("*").eq("submission_id", activeId).order("created_at", { ascending: true });
      if (cancelled) return;
      setReplies((data as any[]) || []);
      supabase.rpc("mark_contact_replies_read" as any, { _submission_id: activeId } as any);
    })();
    const ch = supabase.channel(`support-thread-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_replies", filter: `submission_id=eq.${activeId}` },
        (p) => {
          setReplies(prev => prev.some(r => r.id === (p.new as any).id) ? prev : [...prev, p.new as any]);
          if ((p.new as any).is_admin) supabase.rpc("mark_contact_replies_read" as any, { _submission_id: activeId } as any);
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [replies.length]);

  const send = async () => {
    if (!body.trim() || !activeId || !user) return;
    setSending(true);
    const optimistic: Reply = {
      id: `tmp-${Date.now()}`, submission_id: activeId, sender_id: user.id,
      is_admin: false, body: body.trim(), created_at: new Date().toISOString(), read_at: null
    };
    setReplies(prev => [...prev, optimistic]);
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("contact_replies" as any).insert({
      submission_id: activeId, sender_id: user.id, is_admin: false, body: text,
    } as any);
    if (error) {
      setReplies(prev => prev.filter(r => r.id !== optimistic.id));
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
    }
    setSending(false);
  };

  if (!user) return null;
  if (!submissions.length) return null;

  const active = submissions.find(s => s.id === activeId);

  return (
    <Card className="shadow-3d border-glow overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-5 h-5 text-accent" />
          <h3 className="font-bold text-lg">Your conversations</h3>
        </div>
        {submissions.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {submissions.map(s => (
              <button key={s.id} onClick={() => setActiveId(s.id)}
                className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${activeId === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                {s.subject || s.message.slice(0, 24)}
              </button>
            ))}
          </div>
        )}
        {active && (
          <div className="rounded-xl bg-muted/40 p-3 mb-3 text-xs">
            <p className="font-semibold">{active.subject || "Your message"}</p>
            <p className="text-muted-foreground line-clamp-2">{active.message}</p>
          </div>
        )}
        <div ref={scrollRef} className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
          <AnimatePresence>
            {replies.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${r.is_admin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  r.is_admin ? "bg-muted text-foreground" : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                }`}>
                  <div className="flex items-center gap-1 mb-0.5 text-[10px] opacity-80">
                    {r.is_admin ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    <span>{r.is_admin ? "Support" : "You"}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{r.body}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {!replies.length && (
            <p className="text-center text-xs text-muted-foreground py-6">No replies yet — we'll respond soon.</p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Type a message…"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="min-h-[44px] max-h-32 resize-none rounded-xl" />
          <Button onClick={send} disabled={sending || !body.trim()} className="rounded-xl">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupportThread;
