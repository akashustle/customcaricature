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
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50"
      >
        <Button
          onClick={() => navigate("/live-chat")}
          className="rounded-full w-12 h-12 p-0 shadow-lg shadow-primary/25 relative"
        >
          <MessageCircle className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
              {unread}
            </span>
          )}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveChatWrapper;
