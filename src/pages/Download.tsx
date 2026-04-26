import { useEffect, useState } from "react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Smartphone, ShieldCheck, Wifi, ChevronRight, Sparkles, Apple } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

/**
 * Public APK download landing page.
 *
 * Pulls the live APK URL from `admin_site_settings.app_download` so admins
 * can publish a new version without a code change. Falls back to a graceful
 * "coming soon" state if no URL is configured yet.
 */

interface AppDownloadConfig {
  android_apk_url?: string;
  ios_app_url?: string;
  version?: string;
  release_notes?: string;
  size_mb?: number;
  enabled?: boolean;
}

const InstallStep = ({ n, title, body }: { n: number; title: string; body: string }) => (
  <div className="flex gap-4">
    <div className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md">
      {n}
    </div>
    <div className="pt-1">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  </div>
);

const Download = () => {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<AppDownloadConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "app_download")
        .maybeSingle();
      if (!cancelled) {
        setCfg((data?.value as AppDownloadConfig) || { enabled: true });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const apkUrl = cfg?.android_apk_url;
  const version = cfg?.version || "1.0.0";
  const isReady = !loading && !!apkUrl && cfg?.enabled !== false;

  const qrSrc = apkUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(apkUrl)}`
    : "";

  return (
    <>
      <SEOHead
        title="Download Custom Caricature Club App"
        description="Install our Android app for the fastest caricature ordering, event booking and offline browsing experience."
        canonical="/download"
      />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-12 pb-8 sm:pt-16">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold mb-5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New • Native Android App
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
              className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            >
              Get the app.<br />
              <span className="text-primary">Order in seconds.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.15 } }}
              className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto"
            >
              Faster than the website. Works offline. Push notifications for every order update.
            </motion.p>
          </div>
        </section>

        {/* Download card */}
        <section className="px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        v{version}
                      </span>
                      {cfg?.size_mb && (
                        <span className="text-xs text-muted-foreground">
                          {cfg.size_mb} MB
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Custom Caricature Club</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Android 7.0+ • Free • No ads
                    </p>

                    {isReady ? (
                      <a href={apkUrl} download>
                        <Button size="lg" className="mt-5 w-full sm:w-auto">
                          <Download className="w-4 h-4 mr-2" />
                          Download APK
                        </Button>
                      </a>
                    ) : (
                      <Button size="lg" disabled className="mt-5 w-full sm:w-auto">
                        {loading ? "Loading…" : "Coming soon"}
                      </Button>
                    )}

                    {cfg?.release_notes && (
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        What's new: {cfg.release_notes}
                      </p>
                    )}
                  </div>

                  {/* QR Code */}
                  {isReady && (
                    <div className="hidden sm:flex flex-col items-center gap-2">
                      <img
                        src={qrSrc}
                        alt="QR code to download Custom Caricature Club app"
                        className="w-32 h-32 rounded-lg border border-border bg-background p-1"
                        loading="lazy"
                        width={128}
                        height={128}
                      />
                      <span className="text-xs text-muted-foreground">Scan with phone</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* iOS coming soon */}
            <Card className="mt-4 bg-muted/40 border-dashed">
              <CardContent className="p-4 flex items-center gap-3">
                <Apple className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium text-foreground">iPhone version</span>
                  <span className="text-muted-foreground"> — coming soon. Use the web app for now.</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate("/")}>
                  Open <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Install steps */}
        <section className="px-4 mt-10">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Install in 4 steps</h2>
            <div className="space-y-5">
              <InstallStep
                n={1}
                title="Tap Download APK"
                body="Your phone will save the file to Downloads."
              />
              <InstallStep
                n={2}
                title="Allow installs from this source"
                body="Android may ask for permission once — tap Settings → enable Install from unknown sources for your browser."
              />
              <InstallStep
                n={3}
                title="Open the file"
                body="Find Custom-Caricature-Club.apk in your Downloads folder and tap it."
              />
              <InstallStep
                n={4}
                title="Install & open"
                body="That's it — sign in with your existing account or create a new one."
              />
            </div>
          </div>
        </section>

        {/* Why install */}
        <section className="px-4 mt-12">
          <div className="max-w-2xl mx-auto grid sm:grid-cols-3 gap-3">
            {[
              { icon: Wifi, title: "Works offline", body: "Browse, sign up & queue orders without internet." },
              { icon: Smartphone, title: "Native speed", body: "Instant loads, no browser tabs, push alerts." },
              { icon: ShieldCheck, title: "Same login", body: "Your existing email & password just work." },
            ].map((f) => (
              <Card key={f.title} className="text-center">
                <CardContent className="p-5">
                  <f.icon className="w-7 h-7 text-primary mx-auto mb-2" />
                  <div className="font-semibold text-foreground">{f.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{f.body}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default Download;
