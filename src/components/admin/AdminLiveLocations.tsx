import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wifi, WifiOff } from "lucide-react";

type UserLocation = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  city: string | null;
  location_name: string | null;
  last_seen_at: string;
  is_online: boolean;
  profile_name?: string;
  profile_email?: string;
};

const AdminLiveLocations = () => {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string }>>({});

  useEffect(() => {
    fetchLocations();
    fetchProfiles();
    const channel = supabase
      .channel("admin-live-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_live_locations" }, () => fetchLocations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("user_live_locations")
      .select("*")
      .order("last_seen_at", { ascending: false }) as any;
    if (data) setLocations(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email");
    if (data) {
      const map: Record<string, { name: string; email: string }> = {};
      data.forEach((p: any) => { map[p.user_id] = { name: p.full_name, email: p.email }; });
      setProfiles(map);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const onlineCount = locations.filter(l => l.is_online).length;

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-bold">Live User Locations</h2>
        <Badge className="bg-green-100 text-green-800 border-none">
          <Wifi className="w-3 h-3 mr-1" />{onlineCount} Online
        </Badge>
      </div>

      {locations.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-muted-foreground">No location data yet. Users will appear here when they grant location access.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {locations.map((loc) => {
            const profile = profiles[loc.user_id];
            return (
              <Card key={loc.id} className={`cursor-pointer hover:shadow-md transition-shadow ${loc.is_online ? "border-green-200" : "border-border"}`}
                onClick={() => openGoogleMaps(loc.latitude, loc.longitude)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-sans font-medium text-sm">{profile?.name || "Unknown User"}</p>
                      <p className="text-xs text-muted-foreground font-sans">{profile?.email || loc.user_id}</p>
                    </div>
                    <Badge className={`border-none text-xs ${loc.is_online ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                      {loc.is_online ? <><Wifi className="w-3 h-3 mr-1" />Online</> : <><WifiOff className="w-3 h-3 mr-1" />Offline</>}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                    {loc.city && <span>· {loc.city}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground font-sans">
                    Last seen: {formatTime(loc.last_seen_at)} ({getTimeSince(loc.last_seen_at)})
                  </p>
                  <p className="text-[10px] text-primary font-sans">📍 Tap to open in Google Maps</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminLiveLocations;
