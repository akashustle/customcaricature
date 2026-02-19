import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, MessageCircle, User, Palette } from "lucide-react";

type ChatUser = {
  user_id: string;
  full_name: string;
  email: string;
  last_message: string;
  last_time: string;
  unread: number;
  is_artist: boolean;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_admin: boolean;
  read: boolean;
  created_at: string;
  is_artist_chat: boolean;
};

const AdminChat = ({ adminUserId }: { adminUserId: string }) => {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [chatTab, setChatTab] = useState<"customers" | "artists">("customers");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchChatUsers = async () => {
    const { data: allMsgs } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!allMsgs) return;

    // Get all artist user IDs
    const { data: artists } = await supabase.from("artists").select("auth_user_id");
    const artistUserIds = new Set((artists || []).map((a: any) => a.auth_user_id).filter(Boolean));

    const userMsgMap = new Map<string, { last_message: string; last_time: string; unread: number; is_artist_chat: boolean }>();
    (allMsgs as any[]).forEach((m: any) => {
      const userId = m.is_admin ? m.receiver_id : m.sender_id;
      if (!userId) return;
      if (!userMsgMap.has(userId)) {
        userMsgMap.set(userId, { last_message: m.message, last_time: m.created_at, unread: 0, is_artist_chat: m.is_artist_chat || false });
      }
      if (!m.is_admin && !m.read) {
        const entry = userMsgMap.get(userId)!;
        entry.unread++;
      }
    });

    const userIds = Array.from(userMsgMap.keys());
    if (userIds.length === 0) { setChatUsers([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const users: ChatUser[] = (profiles || []).map((p: any) => {
      const info = userMsgMap.get(p.user_id) || { last_message: "", last_time: "", unread: 0, is_artist_chat: false };
      return {
        user_id: p.user_id, full_name: p.full_name, email: p.email,
        last_message: info.last_message, last_time: info.last_time, unread: info.unread,
        is_artist: artistUserIds.has(p.user_id) || info.is_artist_chat,
      };
    }).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());

    setChatUsers(users);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) {
      setMessages(data as any);
      const unreadIds = (data as any[]).filter((m: any) => !m.is_admin && !m.read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("chat_messages").update({ read: true } as any).in("id", unreadIds);
      }
    }
  };

  useEffect(() => {
    fetchChatUsers();
    const ch = supabase
      .channel("admin-chat-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        fetchChatUsers();
        if (selectedUser) fetchMessages(selectedUser);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) fetchMessages(selectedUser);
  }, [selectedUser]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedUser) return;
    setSending(true);
    const selectedChatUser = chatUsers.find(u => u.user_id === selectedUser);
    await supabase.from("chat_messages").insert({
      sender_id: adminUserId,
      receiver_id: selectedUser,
      message: newMsg.trim(),
      is_admin: true,
      is_artist_chat: selectedChatUser?.is_artist || false,
    } as any);
    setNewMsg("");
    setSending(false);
  };

  const customerChats = chatUsers.filter(u => !u.is_artist);
  const artistChats = chatUsers.filter(u => u.is_artist);
  const totalUnread = chatUsers.reduce((s, u) => s + u.unread, 0);
  const customerUnread = customerChats.reduce((s, u) => s + u.unread, 0);
  const artistUnread = artistChats.reduce((s, u) => s + u.unread, 0);

  const renderUserList = (users: ChatUser[]) => (
    <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 500 }}>
      {users.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans text-sm">No chat messages yet</p></CardContent></Card>
      ) : users.map(u => (
        <Card
          key={u.user_id}
          className={`cursor-pointer transition-colors ${selectedUser === u.user_id ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
          onClick={() => { setSelectedUser(u.user_id); setSelectedUserName(u.full_name); }}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {u.is_artist ? <Palette className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-primary" />}
              </div>
              <div className="min-w-0">
                <p className="font-sans font-medium text-sm truncate">{u.full_name}</p>
                <p className="text-[10px] text-muted-foreground font-sans truncate">{u.last_message}</p>
              </div>
            </div>
            {u.unread > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 flex items-center justify-center">{u.unread}</Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" /> Live Chat
        {totalUnread > 0 && <Badge className="bg-destructive text-destructive-foreground">{totalUnread} new</Badge>}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: 400 }}>
        {/* User List with sub-tabs */}
        <div>
          <Tabs value={chatTab} onValueChange={(v) => setChatTab(v as any)}>
            <TabsList className="w-full mb-2">
              <TabsTrigger value="customers" className="flex-1 font-sans text-xs">
                Customers {customerUnread > 0 && <Badge className="ml-1 bg-destructive text-destructive-foreground text-[9px] h-4 min-w-4">{customerUnread}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="artists" className="flex-1 font-sans text-xs">
                Artists {artistUnread > 0 && <Badge className="ml-1 bg-destructive text-destructive-foreground text-[9px] h-4 min-w-4">{artistUnread}</Badge>}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="customers">{renderUserList(customerChats)}</TabsContent>
            <TabsContent value="artists">{renderUserList(artistChats)}</TabsContent>
          </Tabs>
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2">
          {!selectedUser ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center p-8">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-sans">Select a user to start chatting</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-sm font-sans">{selectedUserName}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 350 }}>
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.is_admin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs font-sans ${
                        msg.is_admin
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}>
                        <p>{msg.message}</p>
                        <p className={`text-[9px] mt-0.5 ${msg.is_admin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
                    placeholder="Reply..."
                    className="text-xs h-8 font-sans"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim() || sending} className="h-8 w-8 p-0">
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
