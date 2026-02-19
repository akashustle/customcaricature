import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
};

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (data) setNotifications(data as any);
    };

    fetchNotifications();

    const ch = supabase
      .channel("user-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true } as any).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order": return "📦";
      case "event": return "🎉";
      case "payment": return "💰";
      case "chat": return "💬";
      default: return "🔔";
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <h3 className="font-sans font-semibold text-sm">Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[10px] h-6 px-2 font-sans">
                      <Check className="w-3 h-3 mr-1" /> Mark all read
                    </Button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-80">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-sans">No notifications yet</p>
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="text-base mt-0.5">{getTypeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-sans ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      <p className="text-[11px] text-muted-foreground font-sans truncate">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground font-sans mt-0.5">
                        {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
