import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const getTypeIcon = (type: string) => {
  switch (type) {
    case "assignment": return "📝";
    case "session": return "🎥";
    case "certificate": return "📜";
    case "announcement": return "📢";
    default: return "🔔";
  }
};

const WorkshopNotifications = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [notifications, setNotifications] = useState<any[]>([]);

  const cardBg = dm ? "bg-[#241f33]/80 border-[#3a3150]/50" : "bg-white/50 border-purple-100/30";
  const textPrimary = dm ? "text-white font-bold" : "text-[#3a2e22] font-bold";
  const textSecondary = dm ? "text-white/60 font-medium" : "text-[#5a4a3a] font-medium";
  const textMuted = dm ? "text-white/40" : "text-[#8a7a6a]";

  useEffect(() => {
    fetchNotifications();
    const ch = supabase.channel("ws-notif-user")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workshop_notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from("workshop_notifications" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (data) setNotifications(data as any[]);
  };

  const markRead = async (id: string) => {
    await supabase.from("workshop_notifications" as any).update({ read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    for (const id of unreadIds) {
      await supabase.from("workshop_notifications" as any).update({ read: true } as any).eq("id", id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4">
      <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${textPrimary} text-lg flex items-center gap-2`}>
            <Bell className="w-5 h-5 text-purple-500" /> Notifications
            {unreadCount > 0 && <Badge className="bg-red-500 text-white text-[10px]">{unreadCount}</Badge>}
          </h2>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className={`${textSecondary} text-xs`}>
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className={`w-10 h-10 mx-auto mb-2 ${textMuted}`} />
            <p className={`${textMuted} text-sm`}>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            <AnimatePresence>
              {notifications.map((n, i) => (
                <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors ${
                    !n.read 
                      ? dm ? "bg-purple-500/10 border-purple-500/30 border" : "bg-purple-50 border-purple-200 border" 
                      : dm ? "bg-white/5 border-white/10 border" : "bg-gray-50/50 border-gray-100 border"
                  }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{getTypeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.read ? textPrimary : textSecondary}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className={`${textMuted} text-xs mt-0.5`}>{n.message}</p>
                      <p className={`${textMuted} text-[10px] mt-1`}>{new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkshopNotifications;
