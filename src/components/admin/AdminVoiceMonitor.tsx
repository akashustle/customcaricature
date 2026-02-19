import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, Radio } from "lucide-react";
import { useAdminVoiceListener } from "@/hooks/useVoiceStream";

type OnlineUser = {
  user_id: string;
  mic_available: boolean;
  full_name?: string;
  email?: string;
};

const AdminVoiceMonitor = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const { startListening, stopListening, listeningTo, status } = useAdminVoiceListener();

  useEffect(() => {
    // Subscribe to voice presence channels to discover who's online with mic
    const presenceCh = supabase.channel("voice-presence-global");

    // We need to scan for active voice-presence channels
    // Poll profiles with recent location updates as proxy for "online"
    const fetchOnlineUsers = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: locations } = await supabase
        .from("user_live_locations")
        .select("user_id, is_online, last_seen_at")
        .eq("is_online", true)
        .gte("last_seen_at", fiveMinAgo);

      if (!locations || locations.length === 0) {
        setOnlineUsers([]);
        return;
      }

      const userIds = locations.map(l => l.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const users: OnlineUser[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        mic_available: true, // They have permissions if they're tracked
      }));

      setOnlineUsers(users);
    };

    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 15000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(presenceCh);
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Radio className="w-5 h-5 text-primary" /> Voice Monitor
        {status === "streaming" && (
          <Badge className="bg-green-600 text-white animate-pulse">🔴 LIVE</Badge>
        )}
      </h2>

      {onlineUsers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MicOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-sans text-sm">No users currently online with mic access</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {onlineUsers.map(user => {
            const isListening = listeningTo === user.user_id;
            return (
              <Card key={user.user_id} className={`transition-all ${isListening ? "border-green-500 bg-green-500/5 shadow-lg" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-sans font-medium text-sm truncate">{user.full_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground font-sans truncate">{user.email}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-green-600 font-sans">Online</span>
                        {user.mic_available && (
                          <Badge variant="outline" className="text-[9px] h-4 ml-1">
                            <Mic className="w-2 h-2 mr-0.5" /> Mic
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      {isListening ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={stopListening}
                          className="h-8 text-xs"
                        >
                          <VolumeX className="w-3 h-3 mr-1" /> Stop
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => startListening(user.user_id)}
                          disabled={status === "connecting"}
                          className="h-8 text-xs"
                        >
                          <Volume2 className="w-3 h-3 mr-1" /> Listen
                        </Button>
                      )}
                    </div>
                  </div>
                  {isListening && status === "connecting" && (
                    <p className="text-[10px] text-amber-600 mt-2 font-sans animate-pulse">Connecting...</p>
                  )}
                  {isListening && status === "streaming" && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[10px] text-green-600 font-sans">🎧 Listening live</span>
                      <div className="flex gap-0.5 ml-1">
                        {[...Array(4)].map((_, i) => (
                          <span key={i} className="w-0.5 bg-green-500 rounded-full animate-pulse" style={{ height: `${6 + Math.random() * 8}px`, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground font-sans">
            ⚠️ Voice monitoring requires users to have granted microphone permission. Only users currently online with active sessions are shown.
            Audio is streamed peer-to-peer via WebRTC — no recordings are stored.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVoiceMonitor;
