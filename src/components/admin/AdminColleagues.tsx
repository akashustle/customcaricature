import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Send, Smile, Pin, Search, Trash2, Star, MessageCircle, User, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_LIST = [
  { name: "Akash", email: "akashxbhavans@gmail.com", designation: "Chief Strategy & Technology Officer" },
  { name: "Dilip", email: "dilip@gmail.com", designation: "Chief Operating Officer (COO)" },
  { name: "Ritesh", email: "ritesh@gmail.com", designation: "Founder & CEO" },
  { name: "Kaushik", email: "kaushik@gmail.com", designation: "Senior Operations Manager" },
  { name: "Manashvi", email: "manashvi@gmail.com", designation: "Creative Director" },
];

interface ColleagueMessage {
  id: string;
  from_email: string;
  from_name: string;
  to_email: string;
  message: string;
  created_at: string;
  is_pinned?: boolean;
  is_starred?: boolean;
  read?: boolean;
}

const AdminColleagues = () => {
  const { user } = useAuth();
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null);
  const [messages, setMessages] = useState<ColleagueMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("chats");
  const [onlineAdmins, setOnlineAdmins] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("email, full_name").eq("user_id", user.id).maybeSingle();
      if (data) { setCurrentEmail(data.email || ""); setCurrentName(data.full_name || ""); }
    };
    fetchProfile();
    fetchOnlineAdmins();
  }, [user]);

  useEffect(() => {
    if (!currentEmail) return;
    fetchMessages();
    const ch = supabase.channel("colleague-chat-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_site_settings", filter: "id=eq.colleague_messages" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentEmail, selectedColleague]);

  const fetchOnlineAdmins = async () => {
    const { data } = await supabase.from("admin_sessions").select("admin_name").eq("is_active", true);
    if (data) setOnlineAdmins(data.map((s: any) => s.admin_name));
  };

  const fetchMessages = async () => {
    const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "colleague_messages").maybeSingle();
    if (data?.value && Array.isArray((data.value as any).messages)) {
      setMessages((data.value as any).messages);
    }
  };

  const getConversation = () => {
    if (!selectedColleague || !currentEmail) return [];
    return messages.filter(m =>
      (m.from_email === currentEmail && m.to_email === selectedColleague) ||
      (m.from_email === selectedColleague && m.to_email === currentEmail)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedColleague || !currentEmail) return;
    const msg: ColleagueMessage = {
      id: crypto.randomUUID(),
      from_email: currentEmail,
      from_name: currentName,
      to_email: selectedColleague,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
      read: false,
    };
    const allMessages = [...messages, msg];
    await supabase.from("admin_site_settings").upsert({ id: "colleague_messages", value: { messages: allMessages.slice(-500) } } as any);
    setMessages(allMessages);
    setNewMessage("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const deleteMessage = async (msgId: string) => {
    const updated = messages.filter(m => m.id !== msgId);
    await supabase.from("admin_site_settings").upsert({ id: "colleague_messages", value: { messages: updated } } as any);
    setMessages(updated);
    toast({ title: "Message deleted" });
  };

  const togglePin = async (msgId: string) => {
    const updated = messages.map(m => m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m);
    await supabase.from("admin_site_settings").upsert({ id: "colleague_messages", value: { messages: updated } } as any);
    setMessages(updated);
  };

  const toggleStar = async (msgId: string) => {
    const updated = messages.map(m => m.id === msgId ? { ...m, is_starred: !m.is_starred } : m);
    await supabase.from("admin_site_settings").upsert({ id: "colleague_messages", value: { messages: updated } } as any);
    setMessages(updated);
  };

  const colleagues = ADMIN_LIST.filter(a => a.email !== currentEmail);
  const filteredColleagues = searchQuery
    ? colleagues.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : colleagues;

  const getUnreadCount = (email: string) => {
    return messages.filter(m => m.from_email === email && m.to_email === currentEmail && !m.read).length;
  };

  const getLastMessage = (email: string) => {
    const conv = messages.filter(m =>
      (m.from_email === currentEmail && m.to_email === email) ||
      (m.from_email === email && m.to_email === currentEmail)
    );
    return conv[conv.length - 1];
  };

  const conversation = getConversation();
  const selectedColleagueInfo = ADMIN_LIST.find(a => a.email === selectedColleague);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" /> Colleagues
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]">
        {/* Left - Colleague List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search colleagues..." className="pl-9 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            {filteredColleagues.map(c => {
              const unread = getUnreadCount(c.email);
              const lastMsg = getLastMessage(c.email);
              const isOnline = onlineAdmins.some(n => n.toLowerCase() === c.name.toLowerCase());
              return (
                <motion.button key={c.email} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedColleague(c.email)}
                  className={`w-full p-3 rounded-xl text-left transition-all border ${
                    selectedColleague === c.email ? "bg-primary/10 border-primary/30" : "bg-card border-border/40 hover:bg-muted/50"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary/60" />
                      </div>
                      {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        {unread > 0 && <Badge className="bg-primary text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center p-0">{unread}</Badge>}
                      </div>
                      <p className="text-[10px] text-indigo-600 font-medium truncate">{c.designation}</p>
                      {lastMsg && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lastMsg.message.slice(0, 40)}</p>}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right - Chat Area */}
        <div className="md:col-span-2">
          {selectedColleague && selectedColleagueInfo ? (
            <Card className="h-full flex flex-col">
              {/* Chat header */}
              <CardHeader className="py-3 px-4 border-b flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary/60" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{selectedColleagueInfo.name}</p>
                    <p className="text-[10px] text-indigo-600">{selectedColleagueInfo.designation}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {onlineAdmins.some(n => n.toLowerCase() === selectedColleagueInfo.name.toLowerCase()) ? (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">🟢 Online</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Offline</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                {conversation.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <div className="text-center">
                      <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Start a conversation with {selectedColleagueInfo.name}</p>
                    </div>
                  </div>
                ) : conversation.map(msg => {
                  const isMine = msg.from_email === currentEmail;
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 relative ${
                        isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                      }`}>
                        <p className="text-sm">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {msg.is_pinned && <Pin className="w-2.5 h-2.5" />}
                          {msg.is_starred && <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />}
                        </div>
                        {/* Actions on hover */}
                        <div className="absolute -top-6 right-0 hidden group-hover:flex gap-1 bg-card border rounded-lg shadow-sm p-1">
                          <button onClick={() => togglePin(msg.id)} className="p-1 hover:bg-muted rounded"><Pin className="w-3 h-3" /></button>
                          <button onClick={() => toggleStar(msg.id)} className="p-1 hover:bg-muted rounded"><Star className="w-3 h-3" /></button>
                          {isMine && <button onClick={() => deleteMessage(msg.id)} className="p-1 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input */}
              <div className="p-3 border-t flex-shrink-0">
                <div className="flex gap-2">
                  <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    placeholder={`Message ${selectedColleagueInfo.name}...`}
                    className="rounded-xl"
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())} />
                  <Button onClick={sendMessage} size="sm" className="rounded-xl px-4" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Select a colleague to chat</p>
                <p className="text-xs mt-1">Internal communication between admins</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminColleagues;
