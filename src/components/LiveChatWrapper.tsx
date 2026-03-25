import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const LiveChatWrapper = () => {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // Hide on chat page itself, admin pages, login/register
  const hiddenPaths = ["/live-chat", "/admin", "/customcad75", "/admin-login", "/login", "/register"];
  const isHidden = hiddenPaths.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_admin", true)
        .eq("read", false);
      setUnread(count || 0);
    };
    fetchUnread();
    const ch = supabase
      .channel("chat-unread-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user || !(settings as any).live_chat_visible?.enabled || isHidden) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-[240px] right-4 md:bottom-[280px] md:right-6 z-40"
      >
        <button
          onClick={() => navigate("/live-chat")}
          className="group relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.6)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/20 opacity-75" style={{ animationDuration: "3s" }} />
          <MessageCircle className="w-6 h-6 relative z-10 group-hover:rotate-12 transition-transform" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center animate-bounce shadow-lg z-20">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveChatWrapper;
