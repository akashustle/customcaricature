import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudOff, Download, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Banner that surfaces when the device just came back online AND the locally
 * installed APK version is older than the one configured in
 * `admin_site_settings.app_download.version`.
 *
 * It runs once per page load, only inside the Capacitor shell (i.e. when
 * window.Capacitor is defined). Web users never see it.
 *
 * Dismissals are remembered per-version so we don't nag for the same release.
 */

const DISMISS_KEY = "ccc:apk-update-dismissed:";

const cmpVersion = (a: string, b: string) => {
  const pa = a.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
};

const ApkUpdatePrompt = () => {
  const navigate = useNavigate();
  const [latest, setLatest] = useState<{ version: string; url?: string; notes?: string } | null>(null);
  const [installed, setInstalled] = useState<string | null>(null);

  useEffect(() => {
    // Only run inside the Capacitor shell.
    const cap = (typeof window !== "undefined" ? (window as any).Capacitor : null);
    if (!cap || typeof cap.getPlatform !== "function") return;
    const platform = cap.getPlatform();
    if (platform !== "android") return;

    let cancelled = false;

    const run = async () => {
      try {
        // Read installed app info via the native bridge (App plugin).
        const App = (window as any).Capacitor?.Plugins?.App;
        const info = App?.getInfo ? await App.getInfo() : null;
        const localVersion: string | null = info?.version ?? null;
        if (!localVersion || cancelled) return;

        const { data } = await supabase
          .from("admin_site_settings")
          .select("value")
          .eq("id", "app_download")
          .maybeSingle();
        const cfg = (data?.value as any) || {};
        const remoteVersion: string | undefined = cfg.version;
        if (!remoteVersion || cancelled) return;

        // Skip if user has already dismissed this exact version.
        if (localStorage.getItem(DISMISS_KEY + remoteVersion)) return;

        if (cmpVersion(remoteVersion, localVersion) > 0 && cfg.android_apk_url && cfg.enabled !== false) {
          setLatest({ version: remoteVersion, url: cfg.android_apk_url, notes: cfg.release_notes });
          setInstalled(localVersion);
        }
      } catch {/* silent */}
    };

    // Run once now and again whenever we come back online.
    void run();
    const onOnline = () => void run();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!latest || !installed) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY + latest.version, "1"); } catch {/* ignore */}
    setLatest(null);
  };

  return (
    <div className="fixed inset-x-3 top-3 z-[70] sm:left-auto sm:right-4 sm:max-w-sm">
      <Card className="border-2 border-primary/30 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">Update available</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have v{installed} · latest is v{latest.version}
              </p>
              {latest.notes && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">{latest.notes}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => navigate("/download")}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Update now
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Later
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="p-1 -m-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CloudOff className="w-3 h-3" /> Tip: install while you have a strong connection.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApkUpdatePrompt;
