import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, Trash2, Wand2, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "How many orders this week?",
  "Turn on maintenance mode",
  "Send broadcast: New caricature drops Friday 6pm — link /shop",
  "Revenue summary last 30 days",
  "List 5 latest enquiries",
];

const STORAGE_KEY = "admin_ai_assistant_history_v1";

const AdminAIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))); } catch {}
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-assistant", {
        body: { messages: next.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) {
        // Try to read the function response body for the real error message
        let detail = error.message || String(error);
        try {
          const ctx = (error as any).context;
          if (ctx?.body) {
            const txt = typeof ctx.body === "string" ? ctx.body : await new Response(ctx.body).text();
            const parsed = JSON.parse(txt);
            if (parsed?.error) detail = parsed.error;
          }
        } catch {}
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data?.reply || "(no reply)" }]);
    } catch (e: any) {
      const msg = e.message || String(e);
      toast({ title: "AI error", description: msg, variant: "destructive" });
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => { setMessages([]); localStorage.removeItem(STORAGE_KEY); };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative h-8 px-2.5 rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-primary/15 to-accent/15 hover:from-primary/25 hover:to-accent/25 text-primary border border-primary/20 transition-all"
          title="Admin AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px] font-semibold font-sans">Ask AI</span>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
          <SheetTitle className="flex items-center gap-2 font-sans">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground">
              <Wand2 className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-bold">Admin AI Assistant</div>
              <div className="text-[10px] font-normal text-muted-foreground">Toggles · Pricing · Reports · Broadcasts</div>
            </div>
            {messages.length > 0 && (
              <button onClick={clear} className="text-muted-foreground hover:text-destructive p-1 rounded" title="Clear chat">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground font-sans">Try one of these:</div>
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full text-left text-xs p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors border border-border/30 font-sans"
                >
                  {s}
                </button>
              ))}
              <p className="text-[10px] text-muted-foreground mt-4 font-sans leading-relaxed">
                💡 You can chain commands: "Turn on maintenance mode AND send broadcast 'Back at 5pm' to all users."
                Destructive actions will ask for confirmation first.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-accent to-primary text-primary-foreground"}`}>
                {m.role === "user" ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-sans leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"}`}>
                {m.role === "assistant"
                  ? <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-strong:text-foreground prose-headings:text-foreground"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  : <span className="whitespace-pre-wrap">{m.content}</span>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-primary-foreground" /></div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-2 rounded-2xl">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 p-3 bg-card/50">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="e.g. 'Change couple caricature to ₹9999 and notify users'"
              rows={2}
              className="resize-none text-sm font-sans"
              disabled={busy}
            />
            <Button onClick={() => send()} disabled={busy || !input.trim()} size="icon" className="rounded-full shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center font-sans">Powered by Lovable AI · Auto-confirms destructive ops</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdminAIAssistant;
