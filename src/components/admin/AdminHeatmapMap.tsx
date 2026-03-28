import { useEffect, useRef, useState } from "react";
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

type LeafletRuntime = {
  L: typeof import("leaflet");
  eventIcon: import("leaflet").Icon;
  userIcon: import("leaflet").Icon;
  completedIcon: import("leaflet").Icon;
};

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const AdminHeatmapMap = (props: Props) => {
  const { filteredEvents, users, showEvents, showUsers, allPins, onMapReady, onMapError } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [leafletRuntime, setLeafletRuntime] = useState<LeafletRuntime | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await import("leaflet/dist/leaflet.css");
        const L = await import("leaflet");

        if (cancelled) return;

        try {
          delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          });
        } catch (_) {
          // Ignore icon patch errors and keep defaults.
        }

        const shadow = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";
        const iconOpts = { iconSize: [25, 41] as [number, number], iconAnchor: [12, 41] as [number, number], popupAnchor: [1, -34] as [number, number], shadowSize: [41, 41] as [number, number] };

        setLeafletRuntime({
          L,
          eventIcon: new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", shadowUrl: shadow, ...iconOpts }),
          userIcon: new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png", shadowUrl: shadow, ...iconOpts }),
          completedIcon: new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", shadowUrl: shadow, ...iconOpts }),
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

  useEffect(() => {
    if (!leafletRuntime || !containerRef.current || mapRef.current) return;

    const { L } = leafletRuntime;
    let rafId = 0;
    let attempts = 0;

    const initializeMap = () => {
      const container = containerRef.current;
      if (!container) return;

      if (container.clientWidth === 0 || container.clientHeight === 0) {
        if (attempts < 10) {
          attempts += 1;
          rafId = window.requestAnimationFrame(initializeMap);
          return;
        }

        const message = "Map container is not ready yet.";
        setLoadError(message);
        onMapError?.(message);
        return;
      }

      try {
        const map = L.map(container, {
          center: [20.5937, 78.9629],
          zoom: 5,
          scrollWheelZoom: true,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setLoadError(null);
        onMapReady?.();

        resizeObserverRef.current = new ResizeObserver(() => {
          map.invalidateSize(false);
        });
        resizeObserverRef.current.observe(container);

        window.setTimeout(() => map.invalidateSize(false), 150);
      } catch (err: any) {
        console.error("Failed to initialize heatmap:", err);
        const message = err?.message || "Failed to initialize map.";
        setLoadError(message);
        onMapError?.(message);
      }
    };

    initializeMap();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      markersLayerRef.current?.clearLayers();
      markersLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [leafletRuntime, onMapError, onMapReady]);

  useEffect(() => {
    if (!leafletRuntime || !mapRef.current || !markersLayerRef.current) return;

    const { L, eventIcon, userIcon, completedIcon } = leafletRuntime;
    const layer = markersLayerRef.current;

    try {
      layer.clearLayers();

      if (showEvents) {
        filteredEvents.forEach((ev) => {
          const icon = ev.status === "completed" ? completedIcon : eventIcon;
          L.marker([ev.lat, ev.lng], { icon })
            .bindPopup(`
              <div class="space-y-2 text-xs text-foreground">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-bold text-foreground">${escapeHtml(ev.client_name)}</span>
                  <span class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">${escapeHtml(ev.status)}</span>
                </div>
                <div class="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <div>📅 ${escapeHtml(ev.event_date)}</div>
                  <div>🎪 ${escapeHtml(ev.event_type)}</div>
                  <div>📍 ${escapeHtml(ev.city)}, ${escapeHtml(ev.state)}</div>
                  <div>🏛️ ${escapeHtml(ev.venue_name)}</div>
                  <div>🕐 ${escapeHtml(ev.event_start_time)} - ${escapeHtml(ev.event_end_time)}</div>
                  <div>🎨 ${escapeHtml(ev.artist_count)}</div>
                  <div>💰 ₹${escapeHtml(ev.total_price?.toLocaleString())}</div>
                  <div>💳 ${escapeHtml(ev.payment_status)}</div>
                </div>
              </div>
            `)
            .addTo(layer);
        });
      }

      if (showUsers) {
        users.forEach((user) => {
          L.marker([user.lat, user.lng], { icon: userIcon })
            .bindPopup(`
              <div class="space-y-1 text-xs text-foreground">
                <p class="text-sm font-bold text-foreground">${escapeHtml(user.full_name)}</p>
                <p class="text-muted-foreground">${escapeHtml(user.email)}</p>
                <p class="text-muted-foreground">📍 ${escapeHtml(user.city)}, ${escapeHtml(user.state)}</p>
                <p class="text-muted-foreground">Joined: ${escapeHtml(format(new Date(user.created_at), "dd MMM yyyy"))}</p>
              </div>
            `)
            .addTo(layer);
        });
      }

      setLoadError(null);
    } catch (err: any) {
      console.error("Failed to render heatmap markers:", err);
      const message = err?.message || "Map rendering failed.";
      setLoadError(message);
      onMapError?.(message);
    }
  }, [filteredEvents, leafletRuntime, onMapError, showEvents, showUsers, users]);

  useEffect(() => {
    if (!leafletRuntime || !mapRef.current) return;

    try {
      if (allPins.length > 0) {
        const bounds = leafletRuntime.L.latLngBounds(allPins.map((pin) => [pin.lat, pin.lng] as [number, number]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } else {
        mapRef.current.setView([20.5937, 78.9629], 5);
      }
    } catch (err: any) {
      console.error("Failed to fit heatmap bounds:", err);
    }
  }, [allPins, leafletRuntime]);

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Map failed to load: {loadError}
      </div>
    );
  }

  if (!leafletRuntime) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-muted/30"
      style={{ minHeight: "500px" }}
      aria-label="Admin heatmap"
    >
      <span className="sr-only">Loading heatmap</span>
    </div>
  );
};

export default AdminHeatmapMap;
