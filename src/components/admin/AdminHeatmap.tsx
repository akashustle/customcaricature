import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Calendar, Users, Filter, RefreshCw, X, Eye, TrendingUp, Globe, Locate } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const eventIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const completedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface EventPin {
  id: string;
  lat: number;
  lng: number;
  client_name: string;
  event_date: string;
  event_type: string;
  city: string;
  state: string;
  status: string;
  payment_status: string;
  total_price: number;
  artist_count: number;
  venue_name: string;
  event_start_time: string;
  event_end_time: string;
  client_mobile: string;
  client_email: string;
}

interface UserPin {
  id: string;
  lat: number;
  lng: number;
  full_name: string;
  email: string;
  city: string | null;
  state: string | null;
  created_at: string;
}

// Geocode cache to avoid re-geocoding
const geocodeCache: Record<string, { lat: number; lng: number } | null> = {};

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
  noida: [28.5355, 77.391], ghaziabad: [28.6692, 77.4538], navi_mumbai: [19.033, 73.0297],
  "navi mumbai": [19.033, 73.0297], rajkot: [22.3039, 70.8022], amritsar: [31.634, 74.8723],
  dehradun: [30.3165, 78.0322], ranchi: [23.3441, 85.3096], mysore: [12.2958, 76.6394],
  mysuru: [12.2958, 76.6394], udaipur: [24.5854, 73.7125], varanasi: [25.3176, 82.9739],
  agra: [27.1767, 78.0081], nashik: [19.9975, 73.7898], mangalore: [12.9141, 74.856],
  thiruvananthapuram: [8.5241, 76.9366], bhubaneswar: [20.2961, 85.8245],
  raipur: [21.2514, 81.6296], aurangabad: [19.8762, 75.3433], jodhpur: [26.2389, 73.0243],
  guwahati: [26.1445, 91.7362], vijayawada: [16.5062, 80.6480],
};

function getCoordsByCity(city: string): { lat: number; lng: number } | null {
  const key = city.toLowerCase().trim();
  const coords = INDIA_CITY_COORDS[key];
  if (coords) return { lat: coords[0], lng: coords[1] };
  // fuzzy match
  for (const [k, v] of Object.entries(INDIA_CITY_COORDS)) {
    if (key.includes(k) || k.includes(key)) return { lat: v[0], lng: v[1] };
  }
  return null;
}

// Component to fit bounds
const FitBounds = ({ pins }: { pins: { lat: number; lng: number }[] }) => {
  const map = useMap();
  useEffect(() => {
    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [pins, map]);
  return null;
};

const AdminHeatmap = () => {
  const [events, setEvents] = useState<EventPin[]>([]);
  const [users, setUsers] = useState<UserPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventPin | null>(null);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("event_bookings")
      .select("id, client_name, event_date, event_type, city, state, status, payment_status, total_price, artist_count, venue_name, event_start_time, event_end_time, client_mobile, client_email, registration_lat, registration_lng, country")
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
          // Add small jitter to avoid overlapping pins
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
    return pins.length > 0 ? pins : [{ lat: 20.5937, lng: 78.9629 }]; // India center default
  }, [filteredEvents, users, showEvents, showUsers]);

  const stats = useMemo(() => ({
    total: events.length,
    upcoming: events.filter(e => new Date(e.event_date) >= new Date()).length,
    completed: events.filter(e => e.status === "completed").length,
    cities: new Set(events.map(e => e.city)).size,
    totalRevenue: events.reduce((s, e) => s + (e.total_price || 0), 0),
    usersWithLocation: users.length,
  }), [events, users]);

  const getEventIcon = (ev: EventPin) => {
    if (ev.status === "completed") return completedIcon;
    if (new Date(ev.event_date) >= new Date()) return eventIcon;
    return completedIcon;
  };

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

      {/* Stats widgets */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { label: "Total Events", value: stats.total, icon: Calendar, color: "text-blue-600 bg-blue-50" },
          { label: "Upcoming", value: stats.upcoming, icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
          { label: "Completed", value: stats.completed, icon: Eye, color: "text-emerald-600 bg-emerald-50" },
          { label: "Cities", value: stats.cities, icon: Globe, color: "text-violet-600 bg-violet-50" },
          { label: "Revenue", value: `₹${(stats.totalRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-rose-600 bg-rose-50" },
          { label: "User Locations", value: stats.usersWithLocation, icon: Users, color: "text-sky-600 bg-sky-50" },
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
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Events ({filteredEvents.length})
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch id="show-users" checked={showUsers} onCheckedChange={setShowUsers} />
                <Label htmlFor="show-users" className="text-xs cursor-pointer flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Users ({users.length})
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
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : null}
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds pins={allPins} />

              {showEvents && filteredEvents.map(ev => (
                <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={getEventIcon(ev)}>
                  <Popup maxWidth={320} minWidth={260}>
                    <div className="space-y-2 text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{ev.client_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ev.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                          ev.status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                        }`}>{ev.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <div><span className="text-gray-500">📅 Date:</span> {ev.event_date}</div>
                        <div><span className="text-gray-500">🎪 Type:</span> {ev.event_type}</div>
                        <div><span className="text-gray-500">📍 City:</span> {ev.city}, {ev.state}</div>
                        <div><span className="text-gray-500">🏛️ Venue:</span> {ev.venue_name}</div>
                        <div><span className="text-gray-500">🕐 Time:</span> {ev.event_start_time} - {ev.event_end_time}</div>
                        <div><span className="text-gray-500">🎨 Artists:</span> {ev.artist_count}</div>
                        <div><span className="text-gray-500">💰 Price:</span> ₹{ev.total_price?.toLocaleString()}</div>
                        <div><span className="text-gray-500">💳 Payment:</span> {ev.payment_status}</div>
                        <div><span className="text-gray-500">📞 Mobile:</span> {ev.client_mobile}</div>
                        <div><span className="text-gray-500">✉️ Email:</span> {ev.client_email}</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {showUsers && users.map(u => (
                <Marker key={u.id} position={[u.lat, u.lng]} icon={userIcon}>
                  <Popup maxWidth={250}>
                    <div className="space-y-1 text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                      <p className="font-bold text-sm">{u.full_name}</p>
                      <p className="text-gray-500">{u.email}</p>
                      <p className="text-gray-500">📍 {u.city}, {u.state}</p>
                      <p className="text-gray-500">Joined: {format(new Date(u.created_at), "dd MMM yyyy")}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500" /> Upcoming Events</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Completed Events</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" /> Registered Users</div>
      </div>
    </div>
  );
};

export default AdminHeatmap;
