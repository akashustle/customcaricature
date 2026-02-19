import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, MessageCircle, User, X, LogIn, PhoneOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type LiveSession = {
  id: string;
  user_name: string;
  user_email: string | null;
  user_phone: string | null;
  service_type: string;
  status: string;
  admin_name: string | null;
  started_at: string;
  ended_at: string | null;
  caricature_type: string | null;
  face_count: number | null;
  estimated_price: number | null;
  event_date: string | null;
  event_state: string | null;
  event_city: string | null;
};

type LiveMessage = {
  id: string;
  session_id: string;
  sender_type: string;
  sender_name: string | null;
  message: string;
  created_at: string;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  flow: { label: "Bot Flow", className: "bg-blue-100 text-blue-800" },
  waiting: { label: "Waiting", className: "bg-amber-100 text-amber-800" },
  admin_joined: { label: "Admin Joined", className: "bg-green-100 text-green-800" },
  ended: { label: "Ended", className: "bg-muted text-muted-foreground" },
};

const AdminLiveChatLeads = ({ adminUserId }: { adminUserId: string }) => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingJoinId, setPendingJoinId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("live_chat_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    if (data) setSessions(data as any);
  };

  const fetchMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from("live_chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as any);
  };

  useEffect(() => {
    fetchSessions();
    const ch = supabase
      .channel("admin-live-chat-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_chat_sessions" }, () => fetchSessions())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat_messages" }, (payload) => {
        const msg = payload.new as any;
        if (selectedSession && msg.session_id === selectedSession) {
          setMessages(prev => [...prev, msg]);
        }
        fetchSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedSession]);

  useEffect(() => {
    if (selectedSession) fetchMessages(selectedSession);
  }, [selectedSession]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Fetch admin profile name
  useEffect(() => {
    const fetchAdmin = async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", adminUserId).maybeSingle();
      if (data?.full_name) setAdminName(data.full_name);
    };
    fetchAdmin();
  }, [adminUserId]);

  const handleJoinChat = async (sessionId: string) => {
    if (!adminName) {
      setPendingJoinId(sessionId);
      setShowNamePrompt(true);
      return;
    }
    await joinChat(sessionId);
  };

  const joinChat = async (sessionId: string) => {
    // Update session
    await supabase.from("live_chat_sessions").update({
      status: "admin_joined",
      admin_name: adminName,
      admin_user_id: adminUserId,
    } as any).eq("id", sessionId);

    // Send system message
    await supabase.from("live_chat_messages").insert({
      session_id: sessionId,
      sender_type: "admin",
      sender_name: adminName,
      message: `${adminName} has joined the chat.`,
    } as any);

    setSelectedSession(sessionId);
    toast({ title: "Joined Chat" });
  };

  const handleEndChat = async (sessionId: string) => {
    await supabase.from("live_chat_messages").insert({
      session_id: sessionId,
      sender_type: "admin",
      sender_name: adminName,
      message: "This chat has been closed by our team.\nIf you need help again, feel free to start a new chat.",
    } as any);

    await supabase.from("live_chat_sessions").update({
      status: "ended",
      ended_at: new Date().toISOString(),
    } as any).eq("id", sessionId);

    toast({ title: "Chat Ended" });
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedSession) return;
    setSending(true);
    await supabase.from("live_chat_messages").insert({
      session_id: selectedSession,
      sender_type: "admin",
      sender_name: adminName,
      message: newMsg.trim(),
    } as any);
    setNewMsg("");
    setSending(false);
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);
  const waitingCount = sessions.filter(s => s.status === "waiting" || s.status === "flow").length;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" /> Live Chat Leads
        {waitingCount > 0 && <Badge className="bg-destructive text-destructive-foreground">{waitingCount} waiting</Badge>}
      </h2>

      {/* Name prompt dialog */}
      {showNamePrompt && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-sans">Enter your name to join the chat:</p>
            <div className="flex gap-2">
              <Input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Your name..." className="text-sm font-sans" />
              <Button size="sm" onClick={() => {
                setShowNamePrompt(false);
                if (pendingJoinId) joinChat(pendingJoinId);
                setPendingJoinId(null);
              }} disabled={!adminName.trim()}>Join</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: 400 }}>
        {/* Sessions List */}
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 550 }}>
          {sessions.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans text-sm">No live chat sessions yet</p></CardContent></Card>
          ) : sessions.map(s => (
            <Card
              key={s.id}
              className={`cursor-pointer transition-colors ${selectedSession === s.id ? "border-primary bg-primary/5" : s.status === "waiting" ? "border-amber-400 bg-amber-50" : "hover:bg-muted/30"}`}
              onClick={() => setSelectedSession(s.id)}
            >
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-sans font-medium text-sm truncate">{s.user_name}</span>
                  </div>
                  <Badge className={`text-[9px] ${STATUS_BADGE[s.status]?.className || "bg-muted"}`}>
                    {STATUS_BADGE[s.status]?.label || s.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-sans">
                  <span>{s.service_type === "custom" ? "🎨 Custom" : "🎉 Event"}</span>
                  <span>·</span>
                  <span>{new Date(s.started_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {(s.status === "waiting" || s.status === "flow") && (
                  <Button size="sm" className="w-full mt-1 rounded-full font-sans text-xs btn-3d" onClick={(e) => { e.stopPropagation(); handleJoinChat(s.id); }}>
                    <LogIn className="w-3 h-3 mr-1" /> Join Chat
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2">
          {!selectedSession ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center p-8">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-sans">Select a chat session to view</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-sans">{selectedSessionData?.user_name}</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-sans">
                    {selectedSessionData?.user_email && `${selectedSessionData.user_email} · `}
                    {selectedSessionData?.user_phone && `+91${selectedSessionData.user_phone}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(selectedSessionData?.status === "waiting" || selectedSessionData?.status === "flow") && (
                    <Button size="sm" className="rounded-full text-xs font-sans" onClick={() => handleJoinChat(selectedSession)}>
                      <LogIn className="w-3 h-3 mr-1" /> Join
                    </Button>
                  )}
                  {selectedSessionData?.status === "admin_joined" && (
                    <Button size="sm" variant="destructive" className="rounded-full text-xs font-sans" onClick={() => handleEndChat(selectedSession)}>
                      <PhoneOff className="w-3 h-3 mr-1" /> End Chat
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 380 }}>
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "admin" ? "justify-end" : msg.sender_type === "user" ? "justify-start" : "justify-center"}`}>
                      {msg.sender_type === "system" ? (
                        <div className="bg-muted/50 rounded-full px-3 py-1 text-[10px] text-muted-foreground font-sans">
                          {msg.message}
                        </div>
                      ) : (
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs font-sans ${
                          msg.sender_type === "admin"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}>
                          {msg.sender_name && <p className="text-[9px] font-bold mb-0.5 opacity-70">{msg.sender_name}</p>}
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-[9px] mt-0.5 ${msg.sender_type === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {selectedSessionData?.status === "admin_joined" && (
                  <div className="flex items-center gap-2 p-3 border-t border-border">
                    <Input
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      placeholder="Type a reply..."
                      className="text-xs h-8 font-sans"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    />
                    <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim() || sending} className="h-8 w-8 p-0">
                      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    </Button>
                  </div>
                )}
                {selectedSessionData?.status === "ended" && (
                  <div className="p-3 border-t border-border text-center text-xs text-muted-foreground font-sans">
                    Chat ended
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLiveChatLeads;
