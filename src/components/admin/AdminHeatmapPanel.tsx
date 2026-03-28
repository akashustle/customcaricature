import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import type { EventPin, UserPin } from "./AdminHeatmapMap";

const LeafletMap = lazy(() => import("./AdminHeatmapMap"));

interface Props {
  filteredEvents: EventPin[];
  users: UserPin[];
  showEvents: boolean;
  showUsers: boolean;
  loading: boolean;
}

const AdminHeatmapPanel = ({ filteredEvents, users, showEvents, showUsers, loading }: Props) => {
  const [mapReady, setMapReady] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [showRetryOverlay, setShowRetryOverlay] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const allPins = useMemo(() => {
    const pins: { lat: number; lng: number }[] = [];
    if (showEvents) pins.push(...filteredEvents);
    if (showUsers) pins.push(...users);
    return pins.length > 0 ? pins : [{ lat: 20.5937, lng: 78.9629 }];
  }, [filteredEvents, users, showEvents, showUsers]);

  useEffect(() => {
    if (mapReady) return;

    const idleHost = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const start = () => setMapReady(true);

    if (typeof idleHost.requestIdleCallback === "function") {
      const id = idleHost.requestIdleCallback(() => start(), { timeout: 300 });
      return () => idleHost.cancelIdleCallback?.(id);
    }

    const id = globalThis.setTimeout(start, 150);
    return () => globalThis.clearTimeout(id);
  }, [mapReady, reloadKey]);

  useEffect(() => {
    if (!mapReady || leafletReady || loading) {
      setShowRetryOverlay(false);
      return;
    }

    const id = globalThis.setTimeout(() => {
      setShowRetryOverlay(true);
    }, 8000);

    return () => globalThis.clearTimeout(id);
  }, [mapReady, leafletReady, loading, reloadKey]);

  const retryMap = () => {
    setShowRetryOverlay(false);
    setLeafletReady(false);
    setMapReady(false);
    setReloadKey((value) => value + 1);
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="relative h-[500px] md:h-[600px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            </div>
          )}

          {mapReady ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-muted/30">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                </div>
              }
            >
              <LeafletMap
                key={reloadKey}
                filteredEvents={filteredEvents}
                users={users}
                showEvents={showEvents}
                showUsers={showUsers}
                allPins={allPins}
                onMapReady={() => setLeafletReady(true)}
                onMapError={() => {
                  setLeafletReady(false);
                  setShowRetryOverlay(true);
                }}
              />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center bg-muted/30">
              <p className="text-xs text-muted-foreground">Preparing map…</p>
            </div>
          )}

          {showRetryOverlay && !leafletReady && !loading && (
            <div className="absolute inset-x-4 bottom-4 z-20 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-left">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Map is taking longer than expected.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Retry the heatmap without freezing the admin panel.</p>
                </div>
                <Button variant="outline" size="sm" onClick={retryMap}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry map
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminHeatmapPanel;