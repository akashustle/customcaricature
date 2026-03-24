import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2, ArrowLeft, MessageCircle, Paperclip, Smile, Pencil, Trash2, Check, XCircle, FileText, Bot, User, LogIn, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import EmojiPicker from "emoji-picker-react";

type ChatMessage = {
  id: string; sender_id: string; receiver_id: string | null; message: string;
  is_admin: boolean; read: boolean; created_at: string;
  file_url?: string | null; file_name?: string | null; edited_at?: string | null; deleted?: boolean;
};

const GUEST_MSG_LIMIT = 5;

const playDing = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch {}
};

const LiveChat = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevCount = useRef(0);

  // Guest state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestStarted, setGuestStarted] = useState(false);
  const [guestMsgCount, setGuestMsgCount] = useState(0);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  const isGuest = !user;
  const isGuestLimited = isGuest && guestMsgCount >= GUEST_MSG_LIMIT;

  // For logged-in users
  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase.from("chat_messages").select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("is_artist_chat", false).order("created_at", { ascending: true }).limit(200);
    if (data) {
      const msgs = data as any as ChatMessage[];
      if (msgs.length > prevCount.current && prevCount.current > 0) {
        const last = msgs[msgs.length - 1];
        if (last.is_admin) playDing();
      }
      prevCount.current = msgs.length;
      setMessages(msgs);
      const unreadIds = msgs.filter(m => m.is_admin && !m.read && m.receiver_id === user.id).map(m => m.id);
      if (unreadIds.length > 0) supabase.from("chat_messages").update({ read: true } as any).in("id", unreadIds).then(() => {});
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchMessages();
    const ch = supabase.channel(`live-chat-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => fetchMessages())
      .subscribe();
    const presenceCh = supabase.channel(`typing-${user.id}`);
    presenceCh.on("presence", { event: "sync" }, () => {
      const state = presenceCh.presenceState();
      setAdminTyping(Object.values(state).flat().some((p: any) => p.is_admin && p.typing));
    }).subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(presenceCh); };
  }, [user?.id]);

  // For guest AI chat sessions
  const fetchGuestMessages = async (sessionId: string) => {
    const { data } = await supabase.from("ai_chat_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
    if (data) {
      const mapped: ChatMessage[] = data.map((m: any) => ({
        id: m.id, sender_id: m.role === "user" ? "guest" : "admin",
        receiver_id: null, message: m.content, is_admin: m.role === "assistant",
        read: true, created_at: m.created_at, deleted: false,
      }));
      setMessages(mapped);
    }
  };

  useEffect(() => {
    if (!guestSessionId) return;
    const ch = supabase.channel(`guest-chat-${guestSessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_chat_messages", filter: `session_id=eq.${guestSessionId}` }, () => fetchGuestMessages(guestSessionId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [guestSessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const startGuestChat = async () => {
    if (!guestName.trim() || !guestEmail.trim()) return;
    try {
      // Get guest IP for tracking
      let guestIp: string | null = null;
      try { const r = await fetch("https://ipapi.co/json/"); if (r.ok) { const g = await r.json(); guestIp = g.ip || null; } } catch {}
      
      const { data, error } = await supabase.from("ai_chat_sessions").insert({
        guest_name: guestName.trim(), guest_email: guestEmail.trim(), status: "active", guest_ip: guestIp,
      } as any).select("id").single();
      
      if (error) {
        console.error("Chat session error:", error);
        toast({ title: "Could not start chat", description: "Please try again.", variant: "destructive" });
        return;
      }
      if (data) {
        setGuestSessionId(data.id);
        setGuestStarted(true);
        // Send welcome
        await supabase.from("ai_chat_messages").insert({ session_id: data.id, role: "assistant", content: `Hi ${guestName}! 👋 How can we help you today? (${GUEST_MSG_LIMIT} messages as guest, sign up for unlimited)`, sender_name: "CCC Team" } as any);
        fetchGuestMessages(data.id);
      }
    } catch (err: any) {
      console.error("Start chat error:", err);
      toast({ title: "Chat Error", description: err.message, variant: "destructive" });
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    if (user) {
      await supabase.from("chat_messages").insert({ sender_id: user.id, receiver_id: null, message: newMsg.trim(), is_admin: false, is_artist_chat: false } as any);
    } else if (guestSessionId) {
      await supabase.from("ai_chat_messages").insert({ session_id: guestSessionId, role: "user", content: newMsg.trim(), sender_name: guestName } as any);
      setGuestMsgCount(c => c + 1);
      fetchGuestMessages(guestSessionId);
    }
    setNewMsg(""); setSending(false); setShowEmoji(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || file.size > 10 * 1024 * 1024) return;
    setUploading(true);
    const path = `chat/${user.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("order-photos").upload(path, file);
    if (!upErr) {
      const { data: urlData } = supabase.storage.from("order-photos").getPublicUrl(path);
      await supabase.from("chat_messages").insert({ sender_id: user.id, receiver_id: null, message: `📎 ${file.name}`, is_admin: false, file_url: urlData.publicUrl || path, file_name: file.name, is_artist_chat: false } as any);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await supabase.from("chat_messages").update({ message: editText.trim(), edited_at: new Date().toISOString() } as any).eq("id", editingId);
    setEditingId(null); setEditText("");
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("chat_messages").update({ deleted: true, message: "This message was deleted" } as any).eq("id", id);
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // Guest gate - collect name & email
  if (isGuest && !guestStarted) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4 pb-24 bg-background">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm">
          <Card className="p-6 rounded-3xl border-border/40 shadow-xl bg-card">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center mb-3 shadow-lg">
                <MessageCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold">Live Chat</h2>
              <p className="text-sm text-muted-foreground font-sans mt-1">Chat with our team instantly</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-sans font-medium text-foreground">Your Name</label>
                <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Enter your name" className="h-11 rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm font-sans font-medium text-foreground">Email Address</label>
                <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="you@email.com" className="h-11 rounded-xl mt-1" />
              </div>
              <Button onClick={startGuestChat} disabled={!guestName.trim() || !guestEmail.trim()} className="w-full h-11 rounded-xl font-sans font-semibold gap-2">
                <MessageCircle className="w-4 h-4" /> Start Chat
              </Button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>
              <Button variant="outline" onClick={() => navigate("/login")} className="w-full h-10 rounded-xl font-sans gap-2">
                <LogIn className="w-4 h-4" /> Sign in for unlimited chat
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  const currentUserId = user?.id || "guest";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Live Chat</h1>
              <p className="text-[10px] text-muted-foreground font-sans flex items-center gap-1">
                {adminTyping ? <span className="text-primary animate-pulse">Admin is typing...</span> : <>Chat with our team • We reply fast</>}
              </p>
            </div>
          </div>
          {isGuest && <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-sans">{GUEST_MSG_LIMIT - guestMsgCount} msgs left</span>}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-48">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-display text-xl font-bold text-foreground mb-2">Welcome! 👋</p>
            <p className="text-sm text-muted-foreground font-sans max-w-sm mx-auto">Send us a message and our team will reply soon.</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map(msg => {
            const isMine = msg.sender_id === currentUserId || (!user && !msg.is_admin);
            const isDeleted = msg.deleted;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                <div className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-3 text-sm font-sans relative ${isMine ? "bg-primary text-primary-foreground rounded-br-sm shadow-md" : "bg-card border border-border rounded-bl-sm shadow-sm"} ${isDeleted ? "opacity-50 italic" : ""}`}>
                  {msg.is_admin && <p className="text-[10px] font-bold mb-1 opacity-70 flex items-center gap-1"><Bot className="w-3 h-3" /> CCC Team</p>}
                  {editingId === msg.id ? (
                    <div className="flex items-center gap-1">
                      <Input value={editText} onChange={e => setEditText(e.target.value)} className="h-7 text-xs bg-background text-foreground" autoFocus onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }} />
                      <button onClick={saveEdit} className="p-0.5"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="p-0.5"><XCircle className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      {msg.file_url && msg.file_name && isImage(msg.file_name) ? (
                        <img src={msg.file_url} alt={msg.file_name} className="max-w-full rounded-lg mb-1 max-h-56 object-cover" />
                      ) : msg.file_url && msg.file_name ? (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline text-xs"><FileText className="w-3 h-3" /> {msg.file_name}</a>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <p className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      {msg.edited_at && " · edited"}
                    </p>
                    {isMine && msg.read && <span className="text-[9px] text-primary-foreground/50">✓✓</span>}
                  </div>
                  {isMine && !isDeleted && editingId !== msg.id && user && (
                    <div className="absolute -top-3 right-0 hidden group-hover:flex gap-0.5 bg-card border border-border rounded-full px-1 py-0.5 shadow-sm">
                      <button onClick={() => { setEditingId(msg.id); setEditText(msg.message); }} className="p-0.5 hover:bg-muted rounded"><Pencil className="w-2.5 h-2.5 text-muted-foreground" /></button>
                      <button onClick={() => deleteMessage(msg.id)} className="p-0.5 hover:bg-muted rounded"><Trash2 className="w-2.5 h-2.5 text-destructive" /></button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="border-t border-border bg-card">
          <EmojiPicker onEmojiClick={(d: any) => setNewMsg(p => p + d.emoji)} width="100%" height={280} searchPlaceholder="Search emoji..." previewConfig={{ showPreview: false }} />
        </div>
      )}

      {/* Guest limit banner */}
      {isGuestLimited && (
        <div className="bg-primary/10 border-t border-primary/20 p-4 text-center">
          <p className="text-sm font-sans font-medium text-foreground mb-2">Guest message limit reached</p>
          <Button onClick={() => navigate("/register")} className="rounded-xl font-sans gap-2"><LogIn className="w-4 h-4" /> Sign up for unlimited chat</Button>
        </div>
      )}

      {/* Input */}
      {!isGuestLimited && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-3 z-50">
          <div className="container mx-auto max-w-2xl">
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
              {user && (
                <>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-9 w-9 p-0 shrink-0">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </Button>
                </>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowEmoji(!showEmoji)} className="h-9 w-9 p-0 shrink-0"><Smile className="w-4 h-4" /></Button>
              <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-full h-10 font-sans" disabled={sending} />
              <Button type="submit" size="icon" className="rounded-full shrink-0 h-10 w-10 shadow-md" disabled={sending || !newMsg.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChat;
