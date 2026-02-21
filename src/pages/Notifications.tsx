import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check, ArrowLeft, ExternalLink } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const getTypeIcon = (type: string) => {
  switch (type) {
    case "order": return "📦";
    case "event": return "🎉";
    case "payment": return "💰";
    case "chat": return "💬";
    case "agent_request": return "🆘";
    case "broadcast": return "📢";
    default: return "🔔";
  }
};

const Notifications = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setNotifications(data as any);
      setLoading(false);
    };
    fetch();

    const ch = supabase
      .channel("notif-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, authLoading]);

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
    // Track click for analytics
    supabase.from("notifications").update({ clicked: true } as any).eq("id", n.id);
    if (n.link) navigate(n.link);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg font-bold">Notifications</h1>
            {unreadCount > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px]">{unreadCount} new</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="font-sans text-xs">
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-2xl">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-sans">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${!n.read ? "border-primary/30 bg-primary/5" : ""}`}
                    onClick={() => handleClick(n)}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <span className="text-xl mt-0.5">{getTypeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-sans ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                          {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />}
                        </div>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-muted-foreground font-sans">
                            {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {n.link && (
                            <span className="text-[10px] text-primary font-sans flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> View
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default Notifications;
