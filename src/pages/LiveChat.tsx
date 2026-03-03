import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2, ArrowLeft, Bot, User, Sparkles, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "admin" | "system";
  content: string;
  sender_name?: string;
  created_at: string;
};

const LiveChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Create session and set welcome message
  useEffect(() => {
    const initSession = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const { data, error } = await supabase.from("ai_chat_sessions").insert({
        user_id: authSession?.user?.id || null,
        status: "active",
      } as any).select("id").single();
      if (data) setSessionId((data as any).id);
    };
    initSession();

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Hi! 👋 I'm the Creative Caricature Club assistant. I can help you with:\n\n🎨 **Custom Caricature** pricing & ordering\n🎉 **Event Booking** information\n📦 **Order tracking** questions\n💬 **General queries**\n\nHow can I help you today?",
      created_at: new Date().toISOString(),
    }]);
  }, []);

  // Listen for admin messages in real-time
  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`ai-chat-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ai_chat_messages",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const newMsg = payload.new as any;
        // Only add admin messages (user & assistant are added locally)
        if (newMsg.role === "admin") {
          setMessages(prev => [...prev, {
            id: newMsg.id,
            role: "admin",
            content: newMsg.content,
            sender_name: newMsg.sender_name,
            created_at: newMsg.created_at,
          }]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  const saveMessage = async (role: string, content: string, senderName?: string) => {
    if (!sessionId) return;
    await supabase.from("ai_chat_messages").insert({
      session_id: sessionId,
      role,
      content,
      sender_name: senderName || null,
    } as any);
    // Update session timestamp
    await supabase.from("ai_chat_sessions").update({ updated_at: new Date().toISOString() } as any).eq("id", sessionId);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Save user message to DB
    saveMessage("user", userMsg.content);

    // Check if user provided name/email/city info and update session
    updateSessionInfo(userMsg.content);

    try {
      const chatHistory = [...messages.filter(m => m.id !== "welcome" && m.role !== "admin"), userMsg].map(m => ({
        role: m.role === "admin" ? "user" : m.role as "user" | "assistant",
        content: m.role === "admin" ? `[Admin message]: ${m.content}` : m.content,
      }));

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ messages: chatHistory }),
        }
      );

      if (resp.status === 429) {
        const errMsg = "I'm getting too many requests right now. Please try again in a moment! 🙏";
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: errMsg, created_at: new Date().toISOString() }]);
        saveMessage("assistant", errMsg);
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        const errMsg = "Service temporarily unavailable. Please try again later.";
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: errMsg, created_at: new Date().toISOString() }]);
        saveMessage("assistant", errMsg);
        setLoading(false);
        return;
      }

      if (!resp.ok || !resp.body) throw new Error("Failed to get response");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      const assistantId = crypto.randomUUID();

      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() }]);

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
            }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      // Save complete assistant response to DB
      if (assistantContent) saveMessage("assistant", assistantContent);
    } catch (err) {
      console.error("Chat error:", err);
      const errMsg = "Sorry, I'm having trouble connecting right now. Please try again or contact us at 8369594271. 📞";
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errMsg,
        created_at: new Date().toISOString(),
      }]);
      saveMessage("assistant", errMsg);
    }
    setLoading(false);
  };

  const updateSessionInfo = async (content: string) => {
    if (!sessionId) return;
    // Try to extract name/email/city from messages
    const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/);
    const updates: Record<string, string> = {};
    if (emailMatch) updates.guest_email = emailMatch[0];
    // Simple city/name detection - update if present
    if (Object.keys(updates).length > 0) {
      await supabase.from("ai_chat_sessions").update(updates as any).eq("id", sessionId);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">CCC Assistant</h1>
              <p className="text-[10px] text-muted-foreground font-sans flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI-Powered • Always Available
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm font-sans ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : msg.role === "admin"
                  ? "bg-blue-100 text-blue-900 rounded-bl-sm border border-blue-200"
                  : "bg-card border border-border rounded-bl-sm"
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.role === "assistant" && <Bot className="w-3.5 h-3.5 text-primary" />}
                  {msg.role === "admin" && <MessageCircle className="w-3.5 h-3.5 text-blue-600" />}
                  {msg.role === "user" && <User className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-medium opacity-70">
                    {msg.role === "user" ? "You" : msg.role === "admin" ? (msg.sender_name || "Admin") : "CCC Assistant"}
                  </span>
                </div>
                <div className="leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                  {msg.role !== "user" ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && messages[messages.length - 1]?.role === "user" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-3 z-50">
        <div className="container mx-auto max-w-2xl">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about caricatures..."
              className="flex-1 rounded-full font-sans"
              disabled={loading}
            />
            <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground font-sans mt-1">
            Powered by AI • For urgent queries call <a href="tel:+918369594271" className="text-primary underline">8369594271</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveChat;
