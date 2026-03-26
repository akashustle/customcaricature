import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Calendar, Users, Filter, RefreshCw, Eye, TrendingUp, Globe } from "lucide-react";
import type { EventPin, UserPin } from "./AdminHeatmapMap";

const LeafletMap = lazy(() => import("./AdminHeatmapMap"));

const INDIA_CITY_COORDS: Record<string, [number, number]> = {
  mumbai: [19.076, 72.8777], delhi: [28.6139, 77.209], bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946], hyderabad: [17.385, 78.4867], chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639], pune: [18.5204, 73.8567], ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873], lucknow: [26.8467, 80.9462], surat: [21.1702, 72.8311],
  kanpur: [26.4499, 80.3319], nagpur: [21.1458, 79.0882], indore: [22.7196, 75.8577],
  thane: [19.2183, 72.9781], bhopal: [23.2599, 77.4126], visakhapatnam: [17.6868, 83.2185],
  patna: [25.6093, 85.1376], vadodara: [22.3072, 73.1812], goa: [15.2993, 74.124],
  panaji: [15.4909, 73.8278], kochi: [9.9312, 76.2673], coimbatore: [11.0168, 76.9558],
  chandigarh: [30.7333, 76.7794], gurgaon: [28.4595, 77.0266], gurugram: [28.4595, 77.0266],
  noida: [28.5355, 77.391], ghaziabad: [28.6692, 77.4538], "navi mumbai": [19.033, 73.0297],
  rajkot: [22.3039, 70.8022], amritsar: [31.634, 74.8723], dehradun: [30.3165, 78.0322],
  ranchi: [23.3441, 85.3096], mysore: [12.2958, 76.6394], mysuru: [12.2958, 76.6394],
  udaipur: [24.5854, 73.7125], varanasi: [25.3176, 82.9739], agra: [27.1767, 78.0081],
  nashik: [19.9975, 73.7898], mangalore: [12.9141, 74.856], thiruvananthapuram: [8.5241, 76.9366],
  bhubaneswar: [20.2961, 85.8245], raipur: [21.2514, 81.6296], aurangabad: [19.8762, 75.3433],
  jodhpur: [26.2389, 73.0243], guwahati: [26.1445, 91.7362], vijayawada: [16.5062, 80.648],
};

function getCoordsByCity(city: string): { lat: number; lng: number } | null {
  const key = city.toLowerCase().trim();
  const coords = INDIA_CITY_COORDS[key];
  if (coords) return { lat: coords[0], lng: coords[1] };
  for (const [k, v] of Object.entries(INDIA_CITY_COORDS)) {
    if (key.includes(k) || k.includes(key)) return { lat: v[0], lng: v[1] };
  }
  return null;
}

const AdminHeatmap = () => {
  const [events, setEvents] = useState<EventPin[]>([]);
  const [users, setUsers] = useState<UserPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("event_bookings")
      .select("id, client_name, event_date, event_type, city, state, status, payment_status, total_price, artist_count, venue_name, event_start_time, event_end_time, client_mobile, client_email, registration_lat, registration_lng")
      .order("event_date", { ascending: true });

    if (data) {
      const pins: EventPin[] = [];
      for (const ev of data as any[]) {
        let lat = ev.registration_lat;
        let lng = ev.registration_lng;
        if (!lat || !lng) {
          const coords = getCoordsByCity(ev.city || "");
          if (coords) { lat = coords.lat; lng = coords.lng; }
        }
        if (lat && lng) {
          const jitter = () => (Math.random() - 0.5) * 0.01;
          pins.push({
            id: ev.id, lat: lat + jitter(), lng: lng + jitter(),
            client_name: ev.client_name, event_date: ev.event_date, event_type: ev.event_type,
            city: ev.city, state: ev.state, status: ev.status, payment_status: ev.payment_status,
            total_price: ev.total_price, artist_count: ev.artist_count, venue_name: ev.venue_name,
            event_start_time: ev.event_start_time, event_end_time: ev.event_end_time,
            client_mobile: ev.client_mobile, client_email: ev.client_email,
          });
        }
      }
      setEvents(pins);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, city, state, created_at")
      .not("city", "is", null);

    if (data) {
      const pins: UserPin[] = [];
      for (const u of data as any[]) {
        const coords = getCoordsByCity(u.city || "");
        if (coords) {
          const jitter = () => (Math.random() - 0.5) * 0.02;
          pins.push({
            id: u.user_id, lat: coords.lat + jitter(), lng: coords.lng + jitter(),
            full_name: u.full_name, email: u.email, city: u.city, state: u.state, created_at: u.created_at,
          });
        }
      }
      setUsers(pins);
    }
  };

  useEffect(() => {
    Promise.all([fetchEvents(), fetchUsers()]).finally(() => setLoading(false));
    // Delay map mount slightly to avoid blocking the UI thread
    const t = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (statusFilter === "upcoming") filtered = filtered.filter(e => new Date(e.event_date) >= new Date());
    else if (statusFilter === "completed") filtered = filtered.filter(e => e.status === "completed");
    else if (statusFilter === "confirmed") filtered = filtered.filter(e => e.status === "confirmed");
    if (cityFilter) filtered = filtered.filter(e => e.city?.toLowerCase().includes(cityFilter.toLowerCase()));
    return filtered;
  }, [events, statusFilter, cityFilter]);

  const allPins = useMemo(() => {
    const pins: { lat: number; lng: number }[] = [];
    if (showEvents) pins.push(...filteredEvents);
    if (showUsers) pins.push(...users);
    return pins.length > 0 ? pins : [{ lat: 20.5937, lng: 78.9629 }];
  }, [filteredEvents, users, showEvents, showUsers]);

  const stats = useMemo(() => ({
    total: events.length,
    upcoming: events.filter(e => new Date(e.event_date) >= new Date()).length,
    completed: events.filter(e => e.status === "completed").length,
    cities: new Set(events.map(e => e.city)).size,
    totalRevenue: events.reduce((s, e) => s + (e.total_price || 0), 0),
    usersWithLocation: users.length,
  }), [events, users]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Event Heatmap
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live map of all events & registered users</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); Promise.all([fetchEvents(), fetchUsers()]).finally(() => setLoading(false)); }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { label: "Total Events", value: stats.total, icon: Calendar, color: "text-primary bg-primary/10" },
          { label: "Upcoming", value: stats.upcoming, icon: TrendingUp, color: "text-accent-foreground bg-accent" },
          { label: "Completed", value: stats.completed, icon: Eye, color: "text-primary bg-primary/10" },
          { label: "Cities", value: stats.cities, icon: Globe, color: "text-accent-foreground bg-accent" },
          { label: "Revenue", value: `₹${(stats.totalRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-primary bg-primary/10" },
          { label: "User Locations", value: stats.usersWithLocation, icon: Users, color: "text-accent-foreground bg-accent" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="upcoming">Upcoming Only</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Filter by city..." value={cityFilter} onChange={e => setCityFilter(e.target.value)}
              className="h-8 w-[160px] text-xs" />
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5">
                <Switch id="show-events" checked={showEvents} onCheckedChange={setShowEvents} />
                <Label htmlFor="show-events" className="text-xs cursor-pointer flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive" /> Events ({filteredEvents.length})
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch id="show-users" checked={showUsers} onCheckedChange={setShowUsers} />
                <Label htmlFor="show-users" className="text-xs cursor-pointer flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" /> Users ({users.length})
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[500px] md:h-[600px] relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            {mapReady ? (
              <Suspense fallback={
                <div className="h-full flex items-center justify-center bg-muted/30">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              }>
                <LeafletMap
                  filteredEvents={filteredEvents}
                  users={users}
                  showEvents={showEvents}
                  showUsers={showUsers}
                  allPins={allPins}
                />
              </Suspense>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/30">
                <p className="text-xs text-muted-foreground">Loading map…</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-destructive" /> Upcoming Events</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-primary" /> Completed Events</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent" /> Registered Users</div>
      </div>
    </div>
  );
};

export default AdminHeatmap;
