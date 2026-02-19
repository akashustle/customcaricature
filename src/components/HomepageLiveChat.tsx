import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, X, Loader2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { INDIA_LOCATIONS } from "@/lib/india-locations";

type ChatMessage = {
  id: string;
  sender_type: "system" | "user" | "admin";
  sender_name: string | null;
  message: string;
  message_type: "text" | "options" | "input";
  options: any;
  created_at: string;
};

type FlowStep =
  | "welcome"
  | "name_input"
  | "service_select"
  // Custom flow
  | "custom_email"
  | "custom_phone"
  | "custom_address"
  | "custom_type"
  | "custom_group_faces"
  | "custom_pricing"
  // Event flow
  | "event_name"
  | "event_date"
  | "event_time"
  | "event_state"
  | "event_district"
  | "event_city"
  | "event_pricing"
  // Admin chat
  | "waiting_admin"
  | "admin_chat"
  | "ended";

const getSessionId = () => {
  let id = sessionStorage.getItem("live_chat_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("live_chat_session_id", id);
  }
  return id;
};

const HomepageLiveChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState<FlowStep>("welcome");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState("");
  const [collected, setCollected] = useState<Record<string, any>>({});
  const [caricaturePricing, setCaricaturePricing] = useState<any[]>([]);
  const [eventPricing, setEventPricing] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for external open event from FloatingButtons
  useEffect(() => {
    const handler = () => handleOpen();
    window.addEventListener("open-live-chat", handler);
    return () => window.removeEventListener("open-live-chat", handler);
  }, [messages.length]);

  // Fetch pricing data
  useEffect(() => {
    const fetchPricing = async () => {
      const { data: ct } = await supabase.from("caricature_types").select("*").eq("is_active", true).order("sort_order");
      if (ct) setCaricaturePricing(ct);
      const { data: ep } = await supabase.from("event_pricing").select("*").order("region").order("artist_count");
      if (ep) setEventPricing(ep);
    };
    fetchPricing();
  }, []);

  // Realtime subscription for admin messages
  useEffect(() => {
    if (!dbSessionId) return;
    const ch = supabase
      .channel(`live-chat-${dbSessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `session_id=eq.${dbSessionId}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_type === "admin") {
          setMessages(prev => [...prev, msg]);
          if (msg.message?.includes("has joined the chat")) {
            setStep("admin_chat");
          }
          if (msg.message?.includes("has been closed")) {
            setStep("ended");
          }
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "live_chat_sessions",
        filter: `id=eq.${dbSessionId}`,
      }, (payload) => {
        const session = payload.new as any;
        if (session.status === "ended") setStep("ended");
        if (session.status === "admin_joined") setStep("admin_chat");
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [dbSessionId]);

  const addLocalMessage = useCallback((sender_type: string, message: string, message_type = "text", options: any = null) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      sender_type: sender_type as any,
      sender_name: sender_type === "user" ? userName : null,
      message,
      message_type: message_type as any,
      options,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, [userName]);

  const saveMessageToDb = async (sender_type: string, message: string, message_type = "text", options: any = null) => {
    if (!dbSessionId) return;
    await supabase.from("live_chat_messages").insert({
      session_id: dbSessionId,
      sender_type,
      sender_name: sender_type === "user" ? userName : null,
      message,
      message_type,
      options,
    } as any);
  };

  const createSession = async (name: string) => {
    const browserId = getSessionId();
    const { data } = await supabase.from("live_chat_sessions").insert({
      user_name: name,
      browser_session_id: browserId,
      status: "flow",
    } as any).select("id").single();
    if (data) {
      setDbSessionId(data.id);
      setSessionId(browserId);
    }
    return data?.id;
  };

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      setTimeout(() => {
        addLocalMessage("system", "Hi 👋 Please enter your name to continue.");
        setStep("name_input");
      }, 300);
    }
  };

  const handleOptionClick = async (option: string) => {
    addLocalMessage("user", option);
    await saveMessageToDb("user", option);

    if (step === "service_select") {
      if (option === "🎨 Custom Caricature") {
        setCollected(prev => ({ ...prev, service: "custom" }));
        await supabase.from("live_chat_sessions").update({ service_type: "custom" } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "Great choice! 🎨 Please enter your email address:");
          setStep("custom_email");
        }, 300);
      } else {
        setCollected(prev => ({ ...prev, service: "event" }));
        await supabase.from("live_chat_sessions").update({ service_type: "event" } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "Awesome! 🎉 Please enter the event date (DD/MM/YYYY):");
          setStep("event_date");
        }, 300);
      }
    } else if (step === "custom_type") {
      const type = option.toLowerCase();
      setCollected(prev => ({ ...prev, caricature_type: type }));
      if (type === "group") {
        setTimeout(() => {
          addLocalMessage("system", "How many faces? (Minimum 3, Maximum 7)");
          setStep("custom_group_faces");
        }, 300);
      } else {
        showCustomPricing(type, type === "couple" ? 2 : 1);
      }
    } else if (step === "custom_pricing") {
      if (option === "🛒 Order Now") {
        navigate("/register");
      }
    } else if (step === "event_pricing") {
      if (option === "📅 Book Now") {
        navigate("/register");
      } else if (option === "💬 Chat With Agent") {
        await supabase.from("live_chat_sessions").update({ status: "waiting" } as any).eq("id", dbSessionId);
        addLocalMessage("system", "Connecting you to an agent... Please wait. 🕐");
        await saveMessageToDb("system", "Connecting you to an agent... Please wait. 🕐");
        setStep("waiting_admin");
      }
    }
  };

  const showCustomPricing = (type: string, faces: number) => {
    const ct = caricaturePricing.find(p => p.slug === type);
    let price = 0;
    if (ct) {
      price = ct.per_face ? ct.price * faces : ct.price;
    } else {
      // Fallback
      const single = caricaturePricing.find(p => p.slug === "single");
      const couple = caricaturePricing.find(p => p.slug === "couple");
      const group = caricaturePricing.find(p => p.slug === "group");
      if (type === "single" && single) price = single.price;
      else if (type === "couple" && couple) price = couple.price;
      else if (type === "group" && group) price = group.price * faces;
    }

    setCollected(prev => ({ ...prev, estimated_price: price, face_count: faces }));
    
    setTimeout(() => {
      addLocalMessage("system", `Estimated price: ₹${price.toLocaleString("en-IN")} 💰`);
      setStep("custom_pricing");
    }, 300);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    const val = inputValue.trim();
    setInputValue("");
    setSending(true);

    addLocalMessage("user", val);

    switch (step) {
      case "name_input": {
        setUserName(val);
        setCollected(prev => ({ ...prev, name: val }));
        const sid = await createSession(val);
        if (sid) {
          await supabase.from("live_chat_messages").insert([
            { session_id: sid, sender_type: "system", message: "Hi 👋 Please enter your name to continue.", message_type: "text" },
            { session_id: sid, sender_type: "user", sender_name: val, message: val, message_type: "text" },
          ] as any);
        }
        setTimeout(() => {
          addLocalMessage("system", `Hi ${val}! 😊 How can we help you today?`);
          setStep("service_select");
        }, 400);
        break;
      }
      case "custom_email": {
        setCollected(prev => ({ ...prev, email: val }));
        await saveMessageToDb("user", val);
        await supabase.from("live_chat_sessions").update({ user_email: val } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "📱 Please enter your phone number:");
          setStep("custom_phone");
        }, 300);
        break;
      }
      case "custom_phone": {
        setCollected(prev => ({ ...prev, phone: val }));
        await saveMessageToDb("user", val);
        await supabase.from("live_chat_sessions").update({ user_phone: val } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "🏠 Please enter your full address:");
          setStep("custom_address");
        }, 300);
        break;
      }
      case "custom_address": {
        setCollected(prev => ({ ...prev, address: val }));
        await saveMessageToDb("user", val);
        await supabase.from("live_chat_sessions").update({ user_address: val } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "What type of caricature do you need?");
          setStep("custom_type");
        }, 300);
        break;
      }
      case "custom_group_faces": {
        const faces = parseInt(val);
        if (isNaN(faces) || faces < 3 || faces > 7) {
          addLocalMessage("system", "⚠️ Please enter a number between 3 and 7.");
          break;
        }
        setCollected(prev => ({ ...prev, face_count: faces }));
        await saveMessageToDb("user", val);
        showCustomPricing("group", faces);
        break;
      }
      case "event_date": {
        setCollected(prev => ({ ...prev, event_date: val }));
        await saveMessageToDb("user", val);
        await supabase.from("live_chat_sessions").update({ event_date: val } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "⏰ What time should the event start? (e.g. 4:00 PM)");
          setStep("event_time");
        }, 300);
        break;
      }
      case "event_time": {
        setCollected(prev => ({ ...prev, event_time: val }));
        await saveMessageToDb("user", val);
        await supabase.from("live_chat_sessions").update({ event_time: val } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "📍 Which state is the event in?");
          setStep("event_state");
        }, 300);
        break;
      }
      case "event_state": {
        setCollected(prev => ({ ...prev, event_state: val }));
        await saveMessageToDb("user", val);
        await supabase.from("live_chat_sessions").update({ event_state: val } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "🏘️ Which district?");
          setStep("event_district");
        }, 300);
        break;
      }
      case "event_district": {
        setCollected(prev => ({ ...prev, event_district: val }));
        await saveMessageToDb("user", val);
        await supabase.from("live_chat_sessions").update({ event_district: val } as any).eq("id", dbSessionId);
        setTimeout(() => {
          addLocalMessage("system", "🏙️ Which city?");
          setStep("event_city");
        }, 300);
        break;
      }
      case "event_city": {
        setCollected(prev => ({ ...prev, event_city: val }));
        await saveMessageToDb("user", val);
        await supabase.from("live_chat_sessions").update({ event_city: val } as any).eq("id", dbSessionId);
        // Show event pricing
        showEventPricing(val, collected.event_district || "", collected.event_state || "");
        break;
      }
      case "admin_chat": {
        await saveMessageToDb("user", val);
        break;
      }
    }
    setSending(false);
  };

  const showEventPricing = (city: string, district: string, state: string) => {
    const mumbaiDistricts = ["Mumbai City", "Mumbai Suburban", "Thane", "Navi Mumbai", "Palghar"];
    const isMumbai = mumbaiDistricts.some(d => district.toLowerCase().includes(d.toLowerCase()) || city.toLowerCase().includes(d.toLowerCase()));
    const region = isMumbai ? "mumbai" : "pan_india";
    
    const regionPricing = eventPricing.filter(p => p.region === region);
    if (regionPricing.length > 0) {
      const minPrice = Math.min(...regionPricing.map(p => p.total_price));
      const maxPrice = Math.max(...regionPricing.map(p => p.total_price));
      setTimeout(() => {
        addLocalMessage("system", `Estimated event pricing: ₹${minPrice.toLocaleString("en-IN")} – ₹${maxPrice.toLocaleString("en-IN")} 💰`);
        setStep("event_pricing");
      }, 300);
    } else {
      setTimeout(() => {
        addLocalMessage("system", "We'll share pricing details with you shortly. Would you like to book or chat with an agent?");
        setStep("event_pricing");
      }, 300);
    }
  };

  const renderOptions = () => {
    if (step === "service_select") {
      return (
        <div className="flex flex-col gap-2 px-3 pb-2">
          <Button size="sm" onClick={() => handleOptionClick("🎨 Custom Caricature")} className="rounded-full btn-3d font-sans text-xs justify-start">
            🎨 Custom Caricature
          </Button>
          <Button size="sm" onClick={() => handleOptionClick("🎉 Event Booking")} className="rounded-full btn-3d font-sans text-xs justify-start">
            🎉 Event Booking
          </Button>
        </div>
      );
    }
    if (step === "custom_type") {
      return (
        <div className="flex flex-col gap-2 px-3 pb-2">
          {["Single", "Couple", "Group"].map(t => (
            <Button key={t} size="sm" onClick={() => handleOptionClick(t)} className="rounded-full btn-3d font-sans text-xs justify-start">
              {t}
            </Button>
          ))}
        </div>
      );
    }
    if (step === "custom_pricing") {
      return (
        <div className="flex flex-col gap-2 px-3 pb-2">
          <Button size="sm" onClick={() => handleOptionClick("🛒 Order Now")} className="rounded-full btn-3d font-sans text-xs bg-primary hover:bg-primary/90">
            🛒 Order Now
          </Button>
        </div>
      );
    }
    if (step === "event_pricing") {
      return (
        <div className="flex flex-col gap-2 px-3 pb-2">
          <Button size="sm" onClick={() => handleOptionClick("📅 Book Now")} className="rounded-full btn-3d font-sans text-xs bg-primary hover:bg-primary/90">
            📅 Book Now
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleOptionClick("💬 Chat With Agent")} className="rounded-full btn-3d font-sans text-xs">
            💬 Chat With Agent
          </Button>
        </div>
      );
    }
    return null;
  };

  const showInput = ["name_input", "custom_email", "custom_phone", "custom_address", "custom_group_faces", "event_date", "event_time", "event_state", "event_district", "event_city", "admin_chat"].includes(step);

  const getPlaceholder = () => {
    switch (step) {
      case "name_input": return "Enter your name...";
      case "custom_email": return "your@email.com";
      case "custom_phone": return "9876543210";
      case "custom_address": return "Full address...";
      case "custom_group_faces": return "Number of faces (3-7)";
      case "event_date": return "DD/MM/YYYY";
      case "event_time": return "e.g. 4:00 PM";
      case "event_state": return "State name...";
      case "event_district": return "District name...";
      case "event_city": return "City name...";
      case "admin_chat": return "Type a message...";
      default: return "Type here...";
    }
  };

  return (
    <>
      {/* Chat Window - full screen on mobile, popup on desktop */}
      {open && (
        <div
          className="fixed top-14 bottom-14 left-0 right-0 md:inset-auto md:bottom-6 md:right-24 z-[60] md:w-[380px] md:max-h-[75vh] md:rounded-2xl shadow-2xl overflow-hidden"
        >
            <Card className="border-0 shadow-none h-full flex flex-col md:rounded-2xl">
              <CardHeader className="py-3 px-4 bg-primary text-primary-foreground flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-sans font-medium flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Live Chat
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-primary-foreground hover:bg-primary/80 h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1" style={{ maxHeight: "calc(100vh - 60px)" }}>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 250 }}>
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8 font-sans">
                      💬 Start a conversation with us!
                    </p>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs font-sans ${
                        msg.sender_type === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : msg.sender_type === "admin"
                          ? "bg-accent text-accent-foreground rounded-bl-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}>
                        {msg.sender_type === "admin" && msg.sender_name && (
                          <p className="text-[9px] font-bold mb-0.5 opacity-70">{msg.sender_name}</p>
                        )}
                        <p>{msg.message}</p>
                        <p className={`text-[9px] mt-0.5 ${msg.sender_type === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {step === "waiting_admin" && (
                    <div className="flex justify-center py-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                        <Loader2 className="w-3 h-3 animate-spin" /> Waiting for an agent...
                      </div>
                    </div>
                  )}

                  {step === "ended" && (
                    <div className="bg-muted rounded-xl p-3 text-center text-xs font-sans text-muted-foreground">
                      This chat has been closed. Start a new chat if you need help.
                    </div>
                  )}
                </div>

                {/* Options */}
                {renderOptions()}

                {/* Input */}
                {showInput && step !== "ended" && (
                  <div className="flex items-center gap-2 p-3 border-t border-border">
                    <Input
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      placeholder={getPlaceholder()}
                      className="text-xs h-8 font-sans"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    />
                    <Button size="sm" onClick={handleSubmit} disabled={!inputValue.trim() || sending} className="h-8 w-8 p-0">
                      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    </Button>
                  </div>
                )}
              </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default HomepageLiveChat;
