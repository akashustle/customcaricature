import { useState, useEffect, useRef } from "react";
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

// Different sounds for different notification types
const playNotificationSound = (type: string) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === "order") {
      // Cash register ding - two bright tones
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1318.5; // E6
      osc.type = "sine";
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        try {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = 1567.98; // G6
          o2.type = "sine";
          g2.gain.setValueAtTime(0.35, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.4);
        } catch {}
      }, 100);
    } else if (type === "event") {
      // Celebration fanfare - ascending three notes
      [0, 150, 300].forEach((delay, i) => {
        setTimeout(() => {
          try {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.frequency.value = [523.25, 659.25, 783.99][i]; // C5, E5, G5
            o.type = "triangle";
            g.gain.setValueAtTime(0.3, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
          } catch {}
        }, delay);
      });
    } else if (type === "chat") {
      // Soft bubble pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; // A5
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        try {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = 1174.66; // D6
          o2.type = "sine";
          g2.gain.setValueAtTime(0.25, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.2);
        } catch {}
      }, 80);
    } else if (type === "agent_request") {
      // Urgent attention - rapid beeping
      [0, 200, 400].forEach((delay) => {
        setTimeout(() => {
          try {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.frequency.value = 1046.5; // C6
            o.type = "square";
            g.gain.setValueAtTime(0.2, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.12);
          } catch {}
        }, delay);
      });
    } else if (type === "payment") {
      // Success chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 783.99; // G5
      osc.type = "sine";
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
      setTimeout(() => {
        try {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = 1046.5; // C6
          o2.type = "sine";
          g2.gain.setValueAtTime(0.3, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.6);
        } catch {}
      }, 200);
    } else {
      // Default ding-dong
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1046.5;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
      setTimeout(() => {
        try {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = 784;
          o2.type = "sine";
          g2.gain.setValueAtTime(0.3, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.8);
        } catch {}
      }, 150);
    }
  } catch {}
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

    // Request notification permission and show native notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          console.log("Notification permission granted");
        }
      });
    }

    const ch = supabase
      .channel("user-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as any;
        setNotifications(prev => [newNotif, ...prev]);
        playNotificationSound(newNotif.type);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(newNotif.title, { 
            body: newNotif.message, 
            icon: "/logo.png",
            badge: "/logo.png",
            tag: `ccc-${newNotif.id}`,
          });
        }
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
    // Track click for analytics
    supabase.from("notifications").update({ clicked: true } as any).eq("id", n.id);
    if (n.link) { navigate(n.link); setOpen(false); }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order": return "📦";
      case "event": return "🎉";
      case "payment": return "💰";
      case "chat": return "💬";
      case "agent_request": return "🆘";
      default: return "🔔";
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-full hover:bg-muted transition-colors" aria-label="Notifications">
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
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
                    className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}
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
