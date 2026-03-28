import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";

// Fix leaflet default marker icons
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
} catch (e) {
  console.warn("Leaflet icon fix failed:", e);
}

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

export interface EventPin {
  id: string; lat: number; lng: number;
  client_name: string; event_date: string; event_type: string;
  city: string; state: string; status: string; payment_status: string;
  total_price: number; artist_count: number; venue_name: string;
  event_start_time: string; event_end_time: string;
  client_mobile: string; client_email: string;
}

export interface UserPin {
  id: string; lat: number; lng: number;
  full_name: string; email: string; city: string | null; state: string | null; created_at: string;
}

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

const getEventIcon = (ev: EventPin) => {
  if (ev.status === "completed") return completedIcon;
  return eventIcon;
};

interface Props {
  filteredEvents: EventPin[];
  users: UserPin[];
  showEvents: boolean;
  showUsers: boolean;
  allPins: { lat: number; lng: number }[];
  onMapReady?: () => void;
  onMapError?: (message?: string) => void;
}

const AdminHeatmapMap = ({ filteredEvents, users, showEvents, showUsers, allPins, onMapReady, onMapError }: Props) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Small delay to ensure container is measured before Leaflet initializes
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (error) {
    onMapError?.(error);
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Map failed to load. <button className="ml-2 underline" onClick={() => { setError(null); setReady(false); requestAnimationFrame(() => setReady(true)); }}>Retry</button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: "100%", width: "100%", minHeight: "500px", background: "#e5e7eb" }}
      scrollWheelZoom={true}
      whenReady={() => {
        onMapReady?.();
        // Force tile layer refresh after mount
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 200);
      }}
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
  );
};

export default AdminHeatmapMap;
