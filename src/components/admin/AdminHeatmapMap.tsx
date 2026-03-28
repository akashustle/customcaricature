import { useEffect, useState, useRef, Component, type ReactNode, type ErrorInfo } from "react";
import { format } from "date-fns";

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

interface Props {
  filteredEvents: EventPin[];
  users: UserPin[];
  showEvents: boolean;
  showUsers: boolean;
  allPins: { lat: number; lng: number }[];
  onMapReady?: () => void;
  onMapError?: (message?: string) => void;
}

/* ---------- tiny error boundary just for the map ---------- */
class MapErrorCatcher extends Component<
  { children: ReactNode; onError?: (msg: string) => void; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("Leaflet map render error:", err, info);
    this.props.onError?.(err.message);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/* ---------- the actual map, rendered only after leaflet loads ---------- */
const AdminHeatmapMap = (props: Props) => {
  const { filteredEvents, users, showEvents, showUsers, allPins, onMapReady, onMapError } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [leafletModules, setLeafletModules] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamically import leaflet + react-leaflet so if it fails we catch it
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Import CSS
        await import("leaflet/dist/leaflet.css");

        // Import modules
        const [L, RL] = await Promise.all([
          import("leaflet"),
          import("react-leaflet"),
        ]);

        if (cancelled) return;

        // Fix default icons
        try {
          delete (L.default.Icon.Default.prototype as any)._getIconUrl;
          L.default.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          });
        } catch (_) { /* ignore */ }

        const shadow = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";
        const iconOpts = { iconSize: [25, 41] as [number, number], iconAnchor: [12, 41] as [number, number], popupAnchor: [1, -34] as [number, number], shadowSize: [41, 41] as [number, number] };

        setLeafletModules({
          L: L.default,
          MapContainer: RL.MapContainer,
          TileLayer: RL.TileLayer,
          Marker: RL.Marker,
          Popup: RL.Popup,
          useMap: RL.useMap,
          eventIcon: new L.default.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", shadowUrl: shadow, ...iconOpts }),
          userIcon: new L.default.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png", shadowUrl: shadow, ...iconOpts }),
          completedIcon: new L.default.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", shadowUrl: shadow, ...iconOpts }),
        });
      } catch (err: any) {
        if (!cancelled) {
          console.error("Failed to load Leaflet:", err);
          setLoadError(err?.message || "Failed to load map library");
          onMapError?.(err?.message);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [onMapError]);

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Map failed to load: {loadError}
      </div>
    );
  }

  if (!leafletModules) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const { L, MapContainer, TileLayer, Marker, Popup, useMap, eventIcon, userIcon, completedIcon } = leafletModules;

  const getEventIcon = (ev: EventPin) => ev.status === "completed" ? completedIcon : eventIcon;

  const FitBounds = ({ pins }: { pins: { lat: number; lng: number }[] }) => {
    const map = useMap();
    useEffect(() => {
      if (pins.length > 0) {
        try {
          const bounds = L.latLngBounds(pins.map((p: any) => [p.lat, p.lng]));
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        } catch (_) { /* ignore bounds error */ }
      }
    }, [pins, map]);
    return null;
  };

  const errorFallback = (
    <div className="h-full flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
      Map rendering failed. Try refreshing the page.
    </div>
  );

  return (
    <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
      <MapErrorCatcher onError={onMapError} fallback={errorFallback}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: "100%", width: "100%", minHeight: "500px", background: "#e5e7eb" }}
          scrollWheelZoom={true}
          whenReady={() => {
            onMapReady?.();
            setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds pins={allPins} />

          {showEvents && filteredEvents.map((ev: EventPin) => (
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
                    <div><span className="text-gray-500">📅</span> {ev.event_date}</div>
                    <div><span className="text-gray-500">🎪</span> {ev.event_type}</div>
                    <div><span className="text-gray-500">📍</span> {ev.city}, {ev.state}</div>
                    <div><span className="text-gray-500">🏛️</span> {ev.venue_name}</div>
                    <div><span className="text-gray-500">🕐</span> {ev.event_start_time} - {ev.event_end_time}</div>
                    <div><span className="text-gray-500">🎨</span> {ev.artist_count}</div>
                    <div><span className="text-gray-500">💰</span> ₹{ev.total_price?.toLocaleString()}</div>
                    <div><span className="text-gray-500">💳</span> {ev.payment_status}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {showUsers && users.map((u: UserPin) => (
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
      </MapErrorCatcher>
    </div>
  );
};

export default AdminHeatmapMap;
