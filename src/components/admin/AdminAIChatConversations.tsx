import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, ArrowLeft, MessageCircle, Loader2, Eye, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Session = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_city: string | null;
  guest_ip: string | null;
  status: string;
  admin_joined: boolean;
  admin_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  sender_name: string | null;
  created_at: string;
};

const AdminAIChatConversations = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
    const ch = supabase
      .channel("admin-ai-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_chat_sessions" }, () => fetchSessions())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_chat_messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.session_id === selectedSession) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedSession]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("ai_chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false }) as any;
    if (data) setSessions(data);
    setLoading(false);
  };

  const fetchMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from("ai_chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }) as any;
    if (data) setMessages(data);
  };

  const openSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    // If admin hasn't joined yet, prompt for name
    if (!session?.admin_joined) {
      setPendingSessionId(sessionId);
      setShowNamePrompt(true);
      return;
    }
    setSelectedSession(sessionId);
    await fetchMessages(sessionId);
  };

  const confirmJoinChat = async () => {
    if (!adminName.trim() || !pendingSessionId) return;
    setShowNamePrompt(false);

    // Send "X joined the chat" system message
    await supabase.from("ai_chat_messages").insert({
      session_id: pendingSessionId,
      role: "assistant",
      content: `🟢 ${adminName.trim()} joined the chat`,
      sender_name: "System",
    } as any);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ai_chat_sessions").update({
      admin_joined: true,
      admin_user_id: user?.id,
    } as any).eq("id", pendingSessionId);

    setSelectedSession(pendingSessionId);
    await fetchMessages(pendingSessionId);
    setPendingSessionId(null);
    toast({ title: `Joined as ${adminName.trim()}` });
  };

  const sendAdminMessage = async () => {
    if (!adminReply.trim() || !selectedSession || sending) return;
    setSending(true);
    const senderName = adminName.trim() || "Admin";

    await supabase.from("ai_chat_messages").insert({
      session_id: selectedSession,
      role: "admin",
      content: adminReply.trim(),
      sender_name: senderName,
    } as any);

    setAdminReply("");
    setSending(false);
    toast({ title: "Message sent!" });
  };

  if (loading) return <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p>;

  const session = selectedSession ? sessions.find(s => s.id === selectedSession) : null;

  return (
    <div className="space-y-4">
      {/* Admin Name Prompt Dialog */}
      <Dialog open={showNamePrompt} onOpenChange={setShowNamePrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><LogIn className="w-5 h-5" /> Join Chat as Admin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter your name to join this conversation. A message will be shown to the user.</p>
            <Input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Your name (e.g. Akash)" className="h-10"
              onKeyDown={e => { if (e.key === "Enter") confirmJoinChat(); }} autoFocus />
            <Button onClick={confirmJoinChat} disabled={!adminName.trim()} className="w-full gap-2">
              <MessageCircle className="w-4 h-4" /> Join Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedSession && session ? (
        <>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedSession(null); setMessages([]); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h3 className="font-display text-lg font-bold">
                {session.guest_name || (session.user_id ? "Logged-in User" : "Guest")}
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                {session.guest_email && `${session.guest_email} · `}
                {session.guest_city && `${session.guest_city} · `}
                {new Date(session.created_at).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="ml-auto flex gap-1">
              {session.admin_joined && <Badge className="bg-primary/20 text-primary border-none text-[10px]">Admin Joined</Badge>}
              <Badge className={`border-none text-[10px] ${session.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                {session.status}
              </Badge>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div ref={scrollRef} className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                {messages.map(msg => {
                  const isSystem = msg.content?.includes("joined the chat");
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-[10px] bg-muted/50 text-muted-foreground px-3 py-1 rounded-full">{msg.content}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-sans ${
                        msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" :
                        msg.role === "admin" ? "bg-accent/30 border border-accent/20 rounded-bl-sm" :
                        "bg-card border border-border rounded-bl-sm"
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {msg.role === "assistant" && <Bot className="w-3 h-3 text-primary" />}
                          {msg.role === "admin" && <MessageCircle className="w-3 h-3 text-primary" />}
                          {msg.role === "user" && <User className="w-3 h-3" />}
                          <span className="text-[10px] font-medium opacity-70">
                            {msg.role === "user" ? (msg.sender_name || "User") :
                             msg.role === "admin" ? (msg.sender_name || "Admin") : "AI Bot"}
                          </span>
                          <span className="text-[9px] opacity-50 ml-auto">
                            {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="leading-relaxed prose prose-sm max-w-none prose-p:my-1">
                          {msg.role === "assistant" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : <span className="whitespace-pre-wrap">{msg.content}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm font-sans py-10">No messages in this conversation</p>
                )}
              </div>

              <div className="border-t border-border p-3">
                <form onSubmit={(e) => { e.preventDefault(); sendAdminMessage(); }} className="flex gap-2">
                  <Input value={adminReply} onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="Reply as admin..." className="flex-1 font-sans" disabled={sending} />
                  <Button type="submit" size="icon" disabled={sending || !adminReply.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> AI Chat Conversations ({sessions.length})
          </h2>
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-sans text-muted-foreground">No AI chat conversations yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => {
                const timeAgo = getTimeAgo(s.updated_at);
                return (
                  <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openSession(s.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-sans font-semibold text-sm truncate">
                              {s.guest_name || (s.user_id ? "Logged-in User" : "Guest")}
                            </p>
                            {s.admin_joined && <Badge className="bg-primary/20 text-primary border-none text-[10px]">Admin Joined</Badge>}
                            <Badge className={`border-none text-[10px] ${s.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                              {s.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-sans mt-0.5">
                            {s.guest_email && `${s.guest_email} · `}
                            {s.guest_city && `${s.guest_city} · `}
                            {timeAgo}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default AdminAIChatConversations;
