import { useEffect, useMemo, useState } from "react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download as DownloadIcon, Smartphone, ShieldCheck, Wifi, ChevronRight,
  Sparkles, Apple, Copy, Check, Hash, FileDown, BookOpenCheck, AlertTriangle,
  ShieldAlert, Share2, Plus, Globe, ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

/**
 * Public APK download landing page.
 *
 * - Auto-detects Android vs iOS and shows the right install path.
 * - Pulls live config from `admin_site_settings.app_download` so admins
 *   can publish a new version without a code change.
 * - Security: refuses to render http:// URLs (only https or stored APK),
 *   shows SHA-256 checksum, version, size, copyable URL and a QR code
 *   that encodes the EXACT version-pinned download URL.
 * - iOS users get the "Add to Home Screen" PWA install path with steps,
 *   plus a TestFlight slot when the admin sets it.
 */

interface AppDownloadConfig {
  android_apk_url?: string;
  ios_app_url?: string;          // Apple App Store URL (when published)
  ios_testflight_url?: string;   // TestFlight invite URL (optional)
  version?: string;
  release_notes?: string;
  changelog?: string;
  size_mb?: number;
  sha256?: string;
  enabled?: boolean;
}

type Platform = "android" | "ios" | "other";

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
};

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
  const [copied, setCopied] = useState<"url" | "hash" | null>(null);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

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

      // Log a public download view for admin analytics.
      void supabase.from("app_downloads").insert({
        platform: detectPlatform(),
        app_version: ((data?.value as any)?.version) || null,
        device_info: typeof navigator !== "undefined" ? navigator.userAgent : null,
      }).then(() => {/* swallow */}, () => {/* swallow */});
    })();
    return () => { cancelled = true; };
  }, []);

  const apkUrl = cfg?.android_apk_url;
  const version = cfg?.version || "1.0.0";

  // Security: reject non-https URLs (only allow file:, https:, or our own
  // origin). Android refuses to install from http on most modern devices,
  // and we don't want to send users to an insecure download.
  const isSafeUrl = useMemo(() => {
    if (!apkUrl) return false;
    try {
      const u = new URL(apkUrl, window.location.origin);
      return u.protocol === "https:" || u.protocol === "file:";
    } catch { return false; }
  }, [apkUrl]);

  const isReady = !loading && !!apkUrl && cfg?.enabled !== false && isSafeUrl;
  const insecure = !!apkUrl && !isSafeUrl;

  // Encode the EXACT version-pinned URL so the QR opens the build the user is
  // currently looking at, not whatever happens to be live tomorrow.
  const versionPinnedUrl = apkUrl && isSafeUrl
    ? (apkUrl.includes("?") ? `${apkUrl}&v=${encodeURIComponent(version)}` : `${apkUrl}?v=${encodeURIComponent(version)}`)
    : "";
  const qrSrc = versionPinnedUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(versionPinnedUrl)}`
    : "";

  const copy = async (kind: "url" | "hash", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast({ title: "Copied", description: kind === "url" ? "Download link copied." : "Checksum copied." });
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast({ title: "Copy failed", description: "Long-press to copy manually.", variant: "destructive" });
    }
  };

  // Split changelog by lines, fall back to release_notes if no changelog set.
  const changelogLines = (cfg?.changelog || cfg?.release_notes || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  // ---- iOS-specific: PWA install via "Add to Home Screen" ----
  const handleAddToHomeScreen = async () => {
    // Try the BeforeInstallPrompt path (Android Chrome, desktop). For iOS the
    // user must use Safari's Share menu — show explicit instructions.
    const prompt = (window as any).__pwaInstallPrompt;
    if (prompt?.prompt) {
      try {
        prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice?.outcome === "accepted") {
          toast({ title: "Installing app…" });
        }
      } catch {/* ignore */}
    } else {
      toast({
        title: platform === "ios" ? "Install on iPhone" : "Install instructions",
        description: platform === "ios"
          ? "Tap the Share button (⬆️) then 'Add to Home Screen'."
          : "Use your browser menu → Install app.",
      });
    }
  };

  return (
    <>
      <SEOHead
        title="Download Custom Caricature Club App"
        description="Install the official Android APK or add to your iPhone home screen for fast caricature ordering, event booking and offline browsing."
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
              {platform === "ios" ? "iPhone-friendly install" : platform === "android" ? "Android APK ready" : "Available for Android & iPhone"}
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

        {/* Insecure URL warning */}
        {insecure && (
          <section className="px-4">
            <div className="max-w-2xl mx-auto">
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex gap-3">
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <div className="font-semibold text-destructive">Download blocked for your safety</div>
                  <p className="text-muted-foreground mt-1">
                    The current APK link isn't served over HTTPS. Please ask the team to publish a secure
                    download link, or come back shortly.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* iOS user → PWA install card */}
        {platform === "ios" && (
          <section className="px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start gap-3 mb-4">
                    <Apple className="w-6 h-6 text-foreground shrink-0" />
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Install on iPhone</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Apple doesn't allow APK files. Install the web app to your home screen
                        — it works offline and feels just like a native app.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mt-5">
                    <InstallStep
                      n={1}
                      title="Open this page in Safari"
                      body="Add-to-Home-Screen only works in Safari (not Chrome on iPhone)."
                    />
                    <InstallStep
                      n={2}
                      title="Tap the Share button"
                      body="The square with an arrow — at the bottom of the screen."
                    />
                    <InstallStep
                      n={3}
                      title="Tap 'Add to Home Screen'"
                      body="Scroll down in the share sheet if you don't see it."
                    />
                    <InstallStep
                      n={4}
                      title="Tap 'Add'"
                      body="The Custom Caricature Club icon will appear on your home screen."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-6">
                    <Button onClick={handleAddToHomeScreen}>
                      <Plus className="w-4 h-4 mr-2" />
                      Try install
                    </Button>
                    {cfg?.ios_testflight_url && (
                      <a href={cfg.ios_testflight_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">
                          <Apple className="w-4 h-4 mr-2" />
                          Get TestFlight build
                        </Button>
                      </a>
                    )}
                    {cfg?.ios_app_url && (
                      <a href={cfg.ios_app_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open App Store
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Android download card (also shown to desktop users so they can scan the QR) */}
        {platform !== "ios" && (
          <section className="px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-start">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          v{version}
                        </span>
                        {cfg?.size_mb && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <FileDown className="w-3 h-3" /> {cfg.size_mb} MB
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">Android 7.0+</span>
                        {isReady && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                            <ShieldCheck className="w-3 h-3" /> HTTPS verified
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">Custom Caricature Club</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Free • No ads • Signed APK
                      </p>

                      {isReady ? (
                        <a href={versionPinnedUrl} download rel="noopener">
                          <Button size="lg" className="mt-5 w-full sm:w-auto">
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Download APK ({version})
                          </Button>
                        </a>
                      ) : (
                        <Button size="lg" disabled className="mt-5 w-full sm:w-auto">
                          {loading ? "Loading…" : insecure ? "Insecure URL — blocked" : "Coming soon"}
                        </Button>
                      )}

                      {/* Copyable URL */}
                      {isReady && (
                        <div className="mt-4">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Direct link
                          </label>
                          <div className="mt-1 flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2">
                            <code className="flex-1 text-xs font-mono text-foreground truncate">
                              {versionPinnedUrl}
                            </code>
                            <button
                              type="button"
                              onClick={() => copy("url", versionPinnedUrl)}
                              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              aria-label="Copy download URL"
                            >
                              {copied === "url" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied === "url" ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SHA-256 checksum */}
                      {isReady && cfg?.sha256 && (
                        <div className="mt-3">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                            <Hash className="w-3 h-3" /> SHA-256 checksum
                          </label>
                          <div className="mt-1 flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2">
                            <code className="flex-1 text-[10px] font-mono text-muted-foreground break-all">
                              {cfg.sha256}
                            </code>
                            <button
                              type="button"
                              onClick={() => copy("hash", cfg.sha256!)}
                              className="shrink-0 inline-flex items-center text-xs font-medium text-primary hover:underline"
                              aria-label="Copy checksum"
                            >
                              {copied === "hash" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Verify after download with <code className="font-mono">sha256sum app.apk</code>.
                          </p>
                        </div>
                      )}

                      {!cfg?.sha256 && isReady && (
                        <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>No checksum published for this build. Ask the team to add one for extra safety.</span>
                        </div>
                      )}
                    </div>

                    {/* Version-pinned QR */}
                    {isReady && (
                      <div className="hidden sm:flex flex-col items-center gap-2 pt-1">
                        <img
                          src={qrSrc}
                          alt={`QR code to download Custom Caricature Club v${version}`}
                          className="w-32 h-32 rounded-lg border border-border bg-background p-1"
                          loading="lazy"
                          width={128}
                          height={128}
                        />
                        <span className="text-[10px] text-muted-foreground">v{version} · scan with phone</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Changelog */}
              {isReady && changelogLines.length > 0 && (
                <Card className="mt-4">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpenCheck className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">What's new in v{version}</h3>
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {changelogLines.map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* iPhone slot for non-iOS visitors */}
              <Card className="mt-4 bg-muted/40 border-dashed">
                <CardContent className="p-4 flex items-center gap-3">
                  <Apple className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium text-foreground">On an iPhone?</span>
                    <span className="text-muted-foreground"> — open this page in Safari and use “Add to Home Screen”.</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setPlatform("ios")}>
                    Show steps <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Android install steps — only for Android & desktop */}
        {platform !== "ios" && (
          <section className="px-4 mt-10">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Install on Android in 4 steps</h2>
              <div className="space-y-5">
                <InstallStep n={1} title="Tap Download APK" body="Your phone will save the file to Downloads." />
                <InstallStep n={2} title="Allow installs from this source" body="Android may ask for permission once — tap Settings → enable Install from unknown sources for your browser." />
                <InstallStep n={3} title="Open the file" body="Find Custom-Caricature-Club.apk in your Downloads folder and tap it." />
                <InstallStep n={4} title="Install & open" body="That's it — sign in with your existing account or create a new one." />
              </div>
            </div>
          </section>
        )}

        {/* Why install */}
        <section className="px-4 mt-12">
          <div className="max-w-2xl mx-auto grid sm:grid-cols-3 gap-3">
            {[
              { icon: Wifi,         title: "Works offline",  body: "Browse, sign up & queue orders without internet." },
              { icon: Smartphone,   title: "Native speed",   body: "Instant loads, no browser tabs, push alerts." },
              { icon: ShieldCheck,  title: "Same login",     body: "Your existing email & password just work." },
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

        {/* Web fallback CTA */}
        <section className="px-4 mt-10">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Globe className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium text-foreground">Don't want to install? </span>
                  <span className="text-muted-foreground">Use the website — it has every feature too.</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/")}>
                  Open website <Share2 className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
};

export default Download;
