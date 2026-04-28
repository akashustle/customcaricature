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

// Register push subscription for offline notifications
const registerPushSubscription = async (userId: string) => {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    
    const registration = await navigator.serviceWorker.ready;
    const pushManager = (registration as any).pushManager;
    if (!pushManager) return;
    
    // Always check for existing subscription and compare
    const existingSub = await pushManager.getSubscription();
    
    // Get VAPID public key from edge function
    let vapidKey: string;
    try {
      const { data } = await supabase.functions.invoke("send-web-push", {
        body: { action: "get_vapid_key" },
      });
      vapidKey = data?.vapid_public_key;
      if (!vapidKey) return;
    } catch {
      return;
    }
    
    // If existing subscription exists, check if it's already saved
    if (existingSub) {
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("endpoint", existingSub.endpoint)
        .maybeSingle();
      if (existing) return; // Already registered
    }

    // Convert VAPID key to Uint8Array
    const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);

    const subscription = existingSub || await pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: outputArray,
    });

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");
    if (!key || !auth) return;

    // Store as base64url to match Web Push standard
    const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    await supabase.from("push_subscriptions").insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: p256dh,
      auth: authKey,
    } as any);

    console.log("Push subscription registered");
  } catch (err) {
    console.warn("Push subscription registration failed:", err);
  }
};

// Send a greeting notification when user first allows push
const sendGreetingNotification = async (userId: string) => {
  try {
    // Check if we already sent a greeting
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "greeting")
      .maybeSingle();
    if (existing) return;

    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Welcome to CCC! 🎨",
      message: "Thanks for enabling notifications! You'll now receive updates about your orders, events and messages even when you're away.",
      type: "greeting",
      link: "/dashboard",
    } as any);
  } catch (err) {
    console.warn("Greeting notification failed:", err);
  }
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

    // Request notification permission and register push subscription
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          console.log("Notification permission granted");
          registerPushSubscription(user.id);
          // Send a welcome greeting notification
          sendGreetingNotification(user.id);
        }
      });
    } else if ("Notification" in window && Notification.permission === "granted") {
      registerPushSubscription(user.id);
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

  const markAsUnread = async (id: string) => {
    await supabase.from("notifications").update({ read: false } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
  };

  const toggleRead = (n: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (n.read) markAsUnread(n.id); else markAsRead(n.id);
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
            {/* Backdrop:
                - Mobile (<md): fullscreen blur to dim the page behind sheet
                - Desktop (md+): transparent click-catcher only — popover floats below bell */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-md md:bg-transparent md:backdrop-blur-0"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            />
            <motion.aside
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              /* Mobile: fullscreen sheet, leaves room for bottom nav.
                 Desktop: floating popover anchored to bell (right-aligned, fixed width). */
              className="
                fixed inset-x-0 top-0 z-[61] flex flex-col bg-background shadow-2xl
                md:inset-auto md:absolute md:top-full md:right-0 md:mt-2
                md:w-[400px] md:max-h-[min(560px,calc(100vh-120px))]
                md:rounded-2xl md:border md:border-border/60 md:overflow-hidden
              "
              className="
                fixed inset-x-0 top-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[61] flex flex-col bg-background shadow-2xl
                md:inset-auto md:bottom-auto md:absolute md:top-full md:right-0 md:mt-2
                md:w-[400px] md:max-h-[min(560px,calc(100vh-120px))]
                md:rounded-2xl md:border md:border-border/60 md:overflow-hidden md:shadow-2xl
              "
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60 px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-bold text-foreground leading-tight">Notifications</h2>
                    <p className="text-[11px] font-sans text-muted-foreground leading-tight">
                      {unreadCount > 0 ? `${unreadCount} new` : "You're all caught up"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[11px] h-8 px-2.5 font-sans rounded-full">
                      <Check className="w-3.5 h-3.5 mr-1" /> Mark all read
                    </Button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto md:max-h-[480px]">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                      <Bell className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground font-sans font-semibold">No notifications yet</p>
                    <p className="text-xs text-muted-foreground font-sans mt-1">We'll let you know when something happens.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {notifications.map((n) => (
                      <SwipeableNotifRow
                        key={n.id}
                        notification={n}
                        onClick={() => handleClick(n)}
                        onToggleRead={(e) => toggleRead(n, e)}
                        getTypeIcon={getTypeIcon}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Notification row that supports both:
 *  - Tap-to-toggle-read via the small dot button on the right
 *  - Swipe-left (mobile) to reveal a "Mark read/unread" action
 * The whole row is still tappable to navigate to the linked page.
 */
const SwipeableNotifRow = ({
  notification: n,
  onClick,
  onToggleRead,
  getTypeIcon,
}: {
  notification: Notification;
  onClick: () => void;
  onToggleRead: (e: React.MouseEvent) => void;
  getTypeIcon: (t: string) => string;
}) => {
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
    moved.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 6) moved.current = true;
    setDragX(Math.max(-90, Math.min(0, dx))); // clamp left swipe only
  };
  const onTouchEnd = () => {
    dragging.current = false;
    if (dragX < -55) {
      // commit: trigger toggle then snap back
      onToggleRead({ stopPropagation: () => {} } as any);
    }
    setDragX(0);
  };

  return (
    <li className="relative overflow-hidden">
      {/* Reveal action behind the row */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3" aria-hidden>
        <span className={`text-[11px] font-sans font-semibold px-2.5 py-1 rounded-full ${n.read ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
          {n.read ? "Mark unread" : "Mark read"}
        </span>
      </div>
      <div
        style={{ transform: `translateX(${dragX}px)`, transition: dragging.current ? "none" : "transform 0.2s ease-out" }}
        className="relative bg-background"
      >
        <button
          type="button"
          onClick={(e) => {
            if (moved.current) { e.preventDefault(); return; }
            onClick();
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={`w-full text-left flex items-start gap-3 px-4 py-3.5 min-h-[64px] transition-colors hover:bg-muted/50 active:bg-muted ${
            !n.read ? "bg-primary/5" : "bg-transparent"
          }`}
        >
          <span className="text-xl mt-0.5 flex-shrink-0">{getTypeIcon(n.type)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-sans leading-snug text-foreground ${!n.read ? "font-semibold" : "font-medium"}`}>
                {n.title}
              </p>
              {/* Tap-to-toggle dot */}
              <button
                type="button"
                onClick={onToggleRead}
                className="p-1 -m-1 rounded-full hover:bg-muted/60 flex-shrink-0"
                aria-label={n.read ? "Mark as unread" : "Mark as read"}
              >
                <span className={`block w-2.5 h-2.5 rounded-full ${!n.read ? "bg-primary" : "bg-muted-foreground/30"}`} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-sans mt-0.5 line-clamp-2">{n.message}</p>
            <p className="text-[10px] text-muted-foreground/80 font-sans mt-1">
              {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </button>
      </div>
    </li>
  );
};

export default NotificationBell;
