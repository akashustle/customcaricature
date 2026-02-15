import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, CalendarDays, MapPin, Users, Home, FileText, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LiveGreeting from "@/components/LiveGreeting";
import { EVENT_TYPES, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "@/lib/event-data";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type ArtistEvent = {
  id: string;
  client_name: string;
  event_type: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  venue_name: string;
  full_address: string;
  city: string;
  state: string;
  pincode: string;
  artist_count: number;
  status: string;
  notes: string | null;
};

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [artist, setArtist] = useState<{ id: string; name: string; portfolio_url: string | null } | null>(null);
  const [events, setEvents] = useState<ArtistEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user) {
      fetchArtistProfile(user.id);
    }
  }, [user, authLoading]);

  const fetchArtistProfile = async (userId: string) => {
    const { data: artistData } = await (supabase
      .from("artists")
      .select("id, name, portfolio_url") as any)
      .eq("auth_user_id", userId)
      .maybeSingle();
    
    if (!artistData) {
      // Not an artist, redirect
      navigate("/dashboard");
      return;
    }
    setArtist(artistData as any);
    fetchEvents(artistData.id);

    // Real-time subscription
    const ch = supabase
      .channel("artist-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bookings", filter: `assigned_artist_id=eq.${artistData.id}` }, () => fetchEvents(artistData.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  };

  const fetchEvents = async (artistId: string) => {
    const { data } = await supabase
      .from("event_bookings")
      .select("id, client_name, event_type, event_date, event_start_time, event_end_time, venue_name, full_address, city, state, pincode, artist_count, status, notes")
      .eq("assigned_artist_id", artistId)
      .order("event_date", { ascending: true });
    if (data) setEvents(data as any);
    setLoading(false);
  };

  const handleLogout = async () => { await signOut(); navigate("/login"); };
  const handleRefresh = async () => {
    if (!artist) return;
    toast({ title: "Refreshing..." });
    await fetchEvents(artist.id);
    toast({ title: "Refreshed!" });
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>;

  const upcoming = events.filter(e => e.status === "upcoming");
  const completed = events.filter(e => e.status === "completed");

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-full" />
            <h1 className="font-display text-lg font-bold">Artist Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="font-sans"><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-sans"><Home className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-sans"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <LiveGreeting name={artist?.name} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="card-3d"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-display text-primary">{events.length}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Total Events</p>
          </CardContent></Card>
          <Card className="card-3d"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-display text-primary">{upcoming.length}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Upcoming</p>
          </CardContent></Card>
          <Card className="card-3d"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-display text-primary">{completed.length}</p>
            <p className="text-[10px] text-muted-foreground font-sans">Completed</p>
          </CardContent></Card>
        </div>

        {/* Portfolio Link */}
        {artist?.portfolio_url && (
          <a href={artist.portfolio_url} target="_blank" rel="noopener noreferrer">
            <Card className="mb-6 card-3d border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-sans font-medium text-sm">Your Portfolio</p>
                  <p className="text-xs text-muted-foreground font-sans">View or share your portfolio</p>
                </div>
              </CardContent>
            </Card>
          </a>
        )}

        {/* Upcoming Events */}
        <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> Upcoming Events
        </h2>
        {upcoming.length === 0 ? (
          <Card className="mb-6"><CardContent className="p-8 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-sans text-muted-foreground">No upcoming events assigned yet</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3 mb-6">
            {upcoming.map((ev) => {
              const eventDate = new Date(ev.event_date);
              const today = new Date(); today.setHours(0,0,0,0);
              const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000*60*60*24));
              return (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="card-3d">
                    <CardContent className="p-4 space-y-2">
                      {daysLeft > 0 && (
                        <div className="bg-primary/10 rounded-xl p-3 text-center">
                          <p className="font-display text-2xl font-bold text-primary">{daysLeft}</p>
                          <p className="text-xs font-sans text-muted-foreground">
                            {daysLeft === 1 ? "✨ Tomorrow!" : `📅 Days to go`}
                          </p>
                        </div>
                      )}
                      {daysLeft === 0 && (
                        <div className="bg-primary/20 rounded-xl p-3 text-center">
                          <p className="font-display text-lg font-bold text-primary">🎊 Today!</p>
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-sans font-semibold">{ev.client_name}</p>
                          <Badge className="border-none text-xs bg-primary/10 text-primary mt-1">
                            {EVENT_TYPES.find(t => t.value === ev.event_type)?.label || ev.event_type}
                          </Badge>
                        </div>
                        <Badge className={`${EVENT_STATUS_COLORS[ev.status]} border-none text-xs`}>{EVENT_STATUS_LABELS[ev.status]}</Badge>
                      </div>
                      <div className="text-sm font-sans space-y-1 text-muted-foreground">
                        <p className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {eventDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {ev.event_start_time} - {ev.event_end_time}</p>
                        <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venue_name}, {ev.city}, {ev.state} - {ev.pincode}</p>
                        <p className="flex items-center gap-1"><Users className="w-3 h-3" /> {ev.artist_count} Artist{ev.artist_count > 1 ? "s" : ""}</p>
                        {ev.notes && <p className="text-xs italic">Note: {ev.notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Completed Events */}
        {completed.length > 0 && (
          <>
            <h2 className="font-display text-xl font-bold mb-3">Completed Events</h2>
            <div className="space-y-3">
              {completed.map((ev) => (
                <Card key={ev.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-sans font-semibold">{ev.client_name}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {new Date(ev.event_date).toLocaleDateString("en-IN")} · {ev.venue_name}, {ev.city}
                        </p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-none text-xs">Completed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ArtistDashboard;
