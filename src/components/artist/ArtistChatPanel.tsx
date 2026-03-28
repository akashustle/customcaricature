import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, X, MessageCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ChatMessage = {
  id: string; message: string; is_admin: boolean; sender_id: string;
  created_at: string; read: boolean;
};

const ArtistChatPanel = ({ userId, userName, isDesktop = false, onClose }: {
  userId: string; userName: string; isDesktop?: boolean; onClose?: () => void;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const ch = supabase.channel(`artist-chat-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `sender_id=eq.${userId}` }, fetchMessages)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${userId}` }, fetchMessages)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase.from("chat_messages")
      .select("id, message, is_admin, sender_id, created_at, read")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("is_artist_chat", true)
      .eq("deleted", false)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) setMessages(data as any);

    // Mark admin messages as read
    await supabase.from("chat_messages")
      .update({ read: true } as any)
      .eq("receiver_id", userId)
      .eq("is_artist_chat", true)
      .eq("read", false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      sender_id: userId, message: newMessage.trim(),
      is_admin: false, is_artist_chat: true,
    } as any);
    setNewMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const containerClass = isDesktop
    ? "flex flex-col h-full bg-background border-l border-border"
    : "flex flex-col h-full bg-background rounded-xl border border-border";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <div>
            <p className="font-sans font-semibold text-sm">Chat with Admin</p>
            <p className="text-[10px] text-muted-foreground font-sans">Real-time messaging</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-sans text-muted-foreground">No messages yet</p>
            <p className="text-[10px] text-muted-foreground font-sans">Start a conversation with admin</p>
          </div>
        )}
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm font-sans ${
              msg.is_admin
                ? "bg-muted/50 text-foreground rounded-tl-sm"
                : "bg-primary text-primary-foreground rounded-tr-sm"
            }`}>
              {msg.is_admin && <p className="text-[10px] font-semibold text-primary mb-0.5">Admin</p>}
              <p className="whitespace-pre-wrap break-words">{msg.message}</p>
              <p className={`text-[9px] mt-0.5 ${msg.is_admin ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="flex gap-2">
          <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown} placeholder="Type a message..."
            className="flex-1 h-10 rounded-full text-sm" />
          <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}
            className="h-10 w-10 rounded-full p-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArtistChatPanel;
