import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, X, Loader2, Paperclip, FileText, Smile, Pencil, Trash2, Check, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";

type Message = {
  id: string; sender_id: string; receiver_id: string | null;
  message: string; is_admin: boolean; read: boolean; created_at: string;
  file_url?: string | null; file_name?: string | null;
  edited_at?: string | null; deleted?: boolean;
};

const playDing = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch {}
};

const ChatWidget = ({ userId, userName, isArtistChat = false }: { userId: string; userName: string; isArtistChat?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [adminTyping, setAdminTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMsgCount = useRef(0);

  const fetchMessages = async () => {
    let query = supabase.from("chat_messages").select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true }).limit(100);
    if (isArtistChat) query = query.eq("is_artist_chat", true);
    const { data } = await query;
    if (data) {
      const msgs = data as any as Message[];
      if (msgs.length > prevMsgCount.current && prevMsgCount.current > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.is_admin) playDing();
      }
      prevMsgCount.current = msgs.length;
      setMessages(msgs);
      setUnread(msgs.filter(m => m.receiver_id === userId && !m.read).length);
    }
  };

  useEffect(() => {
    fetchMessages();
    const ch = supabase.channel(`chat-${userId}-${isArtistChat ? "artist" : "user"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => fetchMessages())
      .subscribe();
    const presenceCh = supabase.channel(`typing-${userId}`);
    presenceCh.on("presence", { event: "sync" }, () => {
      const state = presenceCh.presenceState();
      setAdminTyping(Object.values(state).flat().some((p: any) => p.is_admin && p.typing));
    }).subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(presenceCh); };
  }, [userId]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      const unreadIds = messages.filter(m => m.receiver_id === userId && !m.read).map(m => m.id);
      if (unreadIds.length > 0) supabase.from("chat_messages").update({ read: true } as any).in("id", unreadIds).then(() => fetchMessages());
    }
  }, [open, messages]);

  const typingChannelRef = useRef<any>(null);
  useEffect(() => {
    typingChannelRef.current = supabase.channel(`typing-user-${userId}`);
    typingChannelRef.current.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") await typingChannelRef.current.track({ user_id: userId, typing: false, is_admin: false });
    });
    return () => { if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current); };
  }, [userId]);

  const handleTyping = () => {
    if (typingChannelRef.current) {
      typingChannelRef.current.track({ user_id: userId, typing: true, is_admin: false });
      setTimeout(() => typingChannelRef.current?.track({ user_id: userId, typing: false, is_admin: false }), 2000);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      sender_id: userId, receiver_id: null, message: newMsg.trim(), is_admin: false,
      is_artist_chat: isArtistChat,
    } as any);
    setNewMsg(""); setSending(false); setShowEmoji(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 10 * 1024 * 1024) return;
    setUploading(true);
    const path = `chat/${userId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("order-photos").upload(path, file);
    if (!upErr) {
      const { data: urlData } = supabase.storage.from("order-photos").getPublicUrl(path);
      await supabase.from("chat_messages").insert({
        sender_id: userId, receiver_id: null, message: `📎 ${file.name}`, is_admin: false,
        file_url: urlData.publicUrl || path, file_name: file.name, is_artist_chat: isArtistChat,
      } as any);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.message);
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

  const onEmojiClick = (emojiData: any) => {
    setNewMsg(prev => prev + emojiData.emoji);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-4 md:top-20 md:bottom-auto md:right-4 z-50 bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center hover:opacity-90 transition-opacity"
            style={{ boxShadow: "0 2px 10px hsl(28 27% 72% / 0.3)" }}
          >
            <MessageCircle className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{unread}</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed top-14 bottom-14 left-0 right-0 md:inset-auto md:top-16 md:right-4 md:bottom-auto z-50 md:w-80 md:max-h-[70vh] md:rounded-2xl overflow-hidden md:border md:border-border"
            style={{ boxShadow: "0 4px 20px hsl(28 27% 72% / 0.15)" }}
          >
            <Card className="border-0 shadow-none h-full flex flex-col rounded-none md:rounded-2xl bg-card">
              <CardHeader className="py-3 px-4 bg-primary flex flex-row items-center justify-between flex-shrink-0">
                <CardTitle className="text-sm font-body font-medium text-primary-foreground">💬 Live Chat</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-primary-foreground hover:bg-primary/80 h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1 overflow-hidden bg-background">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8 font-body">
                      <span className="font-calligraphy text-lg block mb-1">👋 Hi {userName}!</span>
                      Send us a message and we'll reply soon.
                    </p>
                  )}
                  {messages.map(msg => {
                    const isMine = msg.sender_id === userId;
                    const isDeleted = msg.deleted;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs font-body relative ${
                          isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm border border-border"
                        } ${isDeleted ? "opacity-50 italic" : ""}`}>
                          {msg.is_admin && <p className="text-[9px] font-bold mb-0.5 opacity-70">Admin</p>}
                          {editingId === msg.id ? (
                            <div className="flex items-center gap-1">
                              <Input value={editText} onChange={e => setEditText(e.target.value)} className="h-6 text-xs bg-background text-foreground" autoFocus
                                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }} />
                              <button onClick={saveEdit} className="p-0.5"><Check className="w-3 h-3" /></button>
                              <button onClick={() => setEditingId(null)} className="p-0.5"><XCircle className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <>
                              {msg.file_url && msg.file_name && isImage(msg.file_name) ? (
                                <img src={msg.file_url} alt={msg.file_name} className="max-w-full rounded-lg mb-1 max-h-48 object-cover"  loading="lazy" decoding="async" />
                              ) : msg.file_url && msg.file_name ? (
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline"><FileText className="w-3 h-3" /> {msg.file_name}</a>
                              ) : <p>{msg.message}</p>}
                            </>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              {msg.edited_at && " · edited"}
                            </p>
                          </div>
                          {/* Edit/Delete actions for own messages */}
                          {isMine && !isDeleted && editingId !== msg.id && (
                            <div className="absolute -top-3 right-0 hidden group-hover:flex gap-0.5 bg-card border border-border rounded-full px-1 py-0.5 shadow-sm">
                              <button onClick={() => startEdit(msg)} className="p-0.5 hover:bg-muted rounded"><Pencil className="w-2.5 h-2.5 text-muted-foreground" /></button>
                              <button onClick={() => deleteMessage(msg.id)} className="p-0.5 hover:bg-muted rounded"><Trash2 className="w-2.5 h-2.5 text-destructive" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {adminTyping && (
                    <div className="flex justify-start">
                      <div className="bg-card rounded-2xl px-3 py-2 text-xs font-body text-muted-foreground italic rounded-bl-sm border border-border">Admin is typing...</div>
                    </div>
                  )}
                </div>
                {/* Emoji Picker */}
                {showEmoji && (
                  <div className="border-t border-border">
                    <EmojiPicker onEmojiClick={onEmojiClick} width="100%" height={280} searchPlaceholder="Search emoji..." previewConfig={{ showPreview: false }} />
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 border-t border-border flex-shrink-0 bg-card">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-8 w-8 p-0 flex-shrink-0">
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowEmoji(!showEmoji)} className="h-8 w-8 p-0 flex-shrink-0">
                    <Smile className="w-3 h-3" />
                  </Button>
                  <Input value={newMsg} onChange={e => { setNewMsg(e.target.value); handleTyping(); }} placeholder="Type a message..."
                    className="text-xs h-8 font-body bg-background" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                  <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim() || sending} className="h-8 w-8 p-0 flex-shrink-0 bg-primary hover:bg-primary/90">
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
