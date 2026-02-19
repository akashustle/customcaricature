import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_admin: boolean;
  read: boolean;
  created_at: string;
};

const ChatWidget = ({ userId, userName }: { userId: string; userName: string }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data as any);
      const unreadCount = (data as any[]).filter((m: any) => m.receiver_id === userId && !m.read).length;
      setUnread(unreadCount);
    }
  };

  useEffect(() => {
    fetchMessages();
    const ch = supabase
      .channel(`chat-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      // Mark messages as read
      const unreadIds = messages.filter(m => m.receiver_id === userId && !m.read).map(m => m.id);
      if (unreadIds.length > 0) {
        supabase.from("chat_messages").update({ read: true } as any).in("id", unreadIds).then(() => fetchMessages());
      }
    }
  }, [open, messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      sender_id: userId,
      receiver_id: null, // admin will pick it up
      message: newMsg.trim(),
      is_admin: false,
    } as any);
    setNewMsg("");
    setSending(false);
  };

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
            className="fixed top-20 right-4 z-50 bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
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

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed top-16 right-4 z-50 w-80 max-h-[70vh] shadow-2xl rounded-2xl overflow-hidden"
          >
            <Card className="border-0 shadow-none h-full flex flex-col">
              <CardHeader className="py-3 px-4 bg-primary text-primary-foreground flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-sans font-medium">💬 Live Chat</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-primary-foreground hover:bg-primary/80 h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1" style={{ maxHeight: "50vh" }}>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 200 }}>
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
                        <p>{msg.message}</p>
                        <p className={`text-[9px] mt-0.5 ${msg.sender_id === userId ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 p-3 border-t border-border">
                  <Input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="text-xs h-8 font-sans"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim() || sending} className="h-8 w-8 p-0">
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
