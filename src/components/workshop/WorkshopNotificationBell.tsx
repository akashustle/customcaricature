/**
 * WorkshopNotificationBell — mirrors the booking dashboard's NotificationBell
 * but pulls from the `workshop_notifications` table for the current workshop
 * user (workshop users live in localStorage, not Supabase auth).
 *
 * Behaviour:
 *  - Top-right bell with unread badge
 *  - Tapping opens a fullscreen panel that respects the mobile bottom-nav
 *    (panel bottom is offset by ~76px + safe-area)
 *  - All rows are fully clickable touch targets (min 56px) and mark-on-click
 *  - Realtime updates via supabase channel
 */
import { useEffect, useState } from "react";
import { Bell, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type WorkshopNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string | null;
  created_at: string;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "assignment": return "📝";
    case "session": return "🎥";
    case "certificate": return "📜";
    case "announcement": return "📢";
    case "payment": return "💰";
    default: return "🔔";
  }
};

const WorkshopNotificationBell = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<WorkshopNotification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetch = async () => {
      const { data } = await supabase
        .from("workshop_notifications" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled && data) setNotifications(data as any);
    };
    fetch();

    const ch = supabase
      .channel("ws-notif-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workshop_notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as any, ...prev]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  const markRead = async (id: string) => {
    await supabase.from("workshop_notifications" as any).update({ read: true } as any).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markUnread = async (id: string) => {
    await supabase.from("workshop_notifications" as any).update({ read: false } as any).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
  };

  const toggleRead = (n: WorkshopNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (n.read) markUnread(n.id); else markRead(n.id);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;
    await supabase.from("workshop_notifications" as any).update({ read: true } as any).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = (n: WorkshopNotification) => {
    if (!n.read) markRead(n.id);
    if (n.link) {
      window.location.assign(n.link);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-md"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            />
            <motion.aside
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-x-0 top-0 z-[61] flex flex-col bg-background"
              style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
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

              <div className="flex-1 overflow-y-auto">
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
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleClick(n)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 active:bg-muted ${
                            !n.read ? "bg-primary/5" : "bg-transparent"
                          }`}
                        >
                          <span className="text-xl mt-0.5 flex-shrink-0">{getTypeIcon(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm font-sans leading-snug text-foreground ${
                                  !n.read ? "font-semibold" : "font-medium"
                                }`}
                              >
                                {n.title}
                              </p>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground font-sans mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground/80 font-sans mt-1">
                              {new Date(n.created_at).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </button>
                      </li>
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

export default WorkshopNotificationBell;
