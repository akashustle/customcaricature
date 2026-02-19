import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, X, Loader2, Paperclip, Image, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_admin: boolean;
  read: boolean;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
};

// Simple notification sound using Web Audio API
const playDing = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
};

const ChatWidget = ({ userId, userName }: { userId: string; userName: string }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [adminTyping, setAdminTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMsgCount = useRef(0);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) {
      const msgs = data as any as Message[];
      // Play sound for new messages from admin
      if (msgs.length > prevMsgCount.current && prevMsgCount.current > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.is_admin) playDing();
      }
      prevMsgCount.current = msgs.length;
      setMessages(msgs);
      const unreadCount = msgs.filter(m => m.receiver_id === userId && !m.read).length;
      setUnread(unreadCount);
    }
  };

  useEffect(() => {
    fetchMessages();
    const ch = supabase
      .channel(`chat-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => fetchMessages())
      .subscribe();

    // Typing indicator via presence
    const presenceCh = supabase.channel(`typing-${userId}`);
    presenceCh
      .on("presence", { event: "sync" }, () => {
        const state = presenceCh.presenceState();
        const adminPresent = Object.values(state).flat().some((p: any) => p.is_admin && p.typing);
        setAdminTyping(adminPresent);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(presenceCh);
    };
  }, [userId]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      const unreadIds = messages.filter(m => m.receiver_id === userId && !m.read).map(m => m.id);
      if (unreadIds.length > 0) {
        supabase.from("chat_messages").update({ read: true } as any).in("id", unreadIds).then(() => fetchMessages());
      }
    }
  }, [open, messages]);

  // User typing indicator
  const typingChannelRef = useRef<any>(null);
  useEffect(() => {
    typingChannelRef.current = supabase.channel(`typing-user-${userId}`);
    typingChannelRef.current.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await typingChannelRef.current.track({ user_id: userId, typing: false, is_admin: false });
      }
    });
    return () => { if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current); };
  }, [userId]);

  const handleTyping = () => {
    if (typingChannelRef.current) {
      typingChannelRef.current.track({ user_id: userId, typing: true, is_admin: false });
      setTimeout(() => {
        typingChannelRef.current?.track({ user_id: userId, typing: false, is_admin: false });
      }, 2000);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      sender_id: userId,
      receiver_id: null,
      message: newMsg.trim(),
      is_admin: false,
    } as any);
    setNewMsg("");
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    setUploading(true);
    const path = `chat/${userId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("order-photos").upload(path, file);
    if (!upErr) {
      const { data: urlData } = supabase.storage.from("order-photos").getPublicUrl(path);
      await supabase.from("chat_messages").insert({
        sender_id: userId,
        receiver_id: null,
        message: `📎 ${file.name}`,
        is_admin: false,
        file_url: urlData.publicUrl || path,
        file_name: file.name,
      } as any);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-4 md:top-20 md:bottom-auto md:right-4 z-50 bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window - Full screen on mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-0 md:inset-auto md:top-16 md:right-4 z-50 md:w-80 md:max-h-[70vh] md:rounded-2xl overflow-hidden md:shadow-2xl"
          >
            <Card className="border-0 shadow-none h-full flex flex-col rounded-none md:rounded-2xl">
              <CardHeader className="py-3 px-4 bg-primary text-primary-foreground flex flex-row items-center justify-between flex-shrink-0">
                <CardTitle className="text-sm font-sans font-medium">💬 Live Chat</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-primary-foreground hover:bg-primary/80 h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8 font-sans">
                      👋 Hi {userName}! Send us a message and we'll reply soon.
                    </p>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs font-sans ${
                        msg.sender_id === userId
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}>
                        {msg.is_admin && <p className="text-[9px] font-bold mb-0.5 opacity-70">Admin</p>}
                        {msg.file_url && msg.file_name && isImage(msg.file_name) ? (
                          <img src={msg.file_url} alt={msg.file_name} className="max-w-full rounded-lg mb-1 max-h-48 object-cover" />
                        ) : msg.file_url && msg.file_name ? (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">
                            <FileText className="w-3 h-3" /> {msg.file_name}
                          </a>
                        ) : (
                          <p>{msg.message}</p>
                        )}
                        <p className={`text-[9px] mt-0.5 ${msg.sender_id === userId ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {adminTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-3 py-2 text-xs font-sans text-muted-foreground italic rounded-bl-sm">
                        Admin is typing...
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 p-3 border-t border-border flex-shrink-0">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-8 w-8 p-0 flex-shrink-0">
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                  </Button>
                  <Input
                    value={newMsg}
                    onChange={e => { setNewMsg(e.target.value); handleTyping(); }}
                    placeholder="Type a message..."
                    className="text-xs h-8 font-sans"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim() || sending} className="h-8 w-8 p-0 flex-shrink-0">
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
