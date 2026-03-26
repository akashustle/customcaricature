import { useEffect, useMemo, useState } from "react";
import { Bell, MapPin, Mic, ShieldCheck, Loader2, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { requestBrowserNotificationPermission } from "@/lib/webpush";
import { motion, AnimatePresence } from "framer-motion";

const GATE_KEY = "ccc_permissions_gate_v3";
const ADMIN_ROUTES = ["/customcad75", "/admin-panel", "/admin-login", "/cccworkshop2006", "/workshop-admin-panel"];

const PermissionGate = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const [locationStatus, setLocationStatus] = useState<string>("prompt");
  const [notificationStatus, setNotificationStatus] = useState<string>(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [micStatus, setMicStatus] = useState<string>("prompt");
  const [cameraStatus, setCameraStatus] = useState<string>("prompt");

  const isAdminRoute = typeof window !== "undefined" && ADMIN_ROUTES.some(r => window.location.pathname.startsWith(r));
  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true);

  // Check existing permissions immediately on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then(r => {
        setLocationStatus(r.state);
        r.addEventListener("change", () => setLocationStatus(r.state));
      }).catch(() => {});
      navigator.permissions.query({ name: "microphone" as PermissionName }).then(r => {
        setMicStatus(r.state);
        r.addEventListener("change", () => setMicStatus(r.state));
      }).catch(() => {});
      navigator.permissions.query({ name: "camera" as PermissionName }).then(r => {
        setCameraStatus(r.state);
        r.addEventListener("change", () => setCameraStatus(r.state));
      }).catch(() => {});
    }
    if (typeof Notification !== "undefined") {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const done = localStorage.getItem(GATE_KEY) === "done";

    // Always re-init web push if notification permission is granted (even if gate was completed)
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      requestBrowserNotificationPermission(user?.id);
    }

    if (done) return;

    // If all already granted, mark done and skip — do NOT re-show
    const allGranted = (typeof Notification !== "undefined" && Notification.permission === "granted") && locationStatus === "granted";
    if (allGranted) {
      localStorage.setItem(GATE_KEY, "done");
      setVisible(false);
      return;
    }

    // Shorter delay for admin PWA (3s), normal delay for website (20s)
    const delayMs = (isAdminRoute || isStandalone) ? 3000 : 20000;
    const timer = setTimeout(() => {
      // Double-check gate wasn't completed in the meantime
      if (localStorage.getItem(GATE_KEY) === "done") return;
      setVisible(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [user?.id, isAdminRoute, isStandalone, locationStatus]);

  const completeGate = () => {
    localStorage.setItem(GATE_KEY, "done");
    setVisible(false);
  };

  const handleAllow = async () => {
    setRequesting(true);

    // Request all permissions in parallel for speed
    await Promise.allSettled([
      // Location
      new Promise<void>((resolve) => {
        setCurrentStep("location");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocationStatus("granted");
            try {
              localStorage.setItem("ccc_user_location", JSON.stringify({
                lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now()
              }));
            } catch {}
            resolve();
          },
          () => { setLocationStatus("denied"); resolve(); },
          { timeout: 5000, enableHighAccuracy: false }
        );
      }),
      // Notifications
      (async () => {
        setCurrentStep("notifications");
        try {
          const perm = await requestBrowserNotificationPermission(user?.id);
          setNotificationStatus(perm === "unsupported" ? "unsupported" : perm);
        } catch {}
      })(),
      // Microphone
      (async () => {
        setCurrentStep("microphone");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicStatus("granted");
          stream.getTracks().forEach(t => t.stop());
        } catch {
          setMicStatus("denied");
        }
      })(),
      // Camera
      (async () => {
        setCurrentStep("camera");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStatus("granted");
          stream.getTracks().forEach(t => t.stop());
        } catch {
          setCameraStatus("denied");
        }
      })(),
    ]);

    setCurrentStep(null);
    setRequesting(false);
    // Small delay to let state settle before hiding
    setTimeout(() => {
      completeGate();
    }, 300);
  };

  const statuses = useMemo(
    () => [
      { label: "Location", value: locationStatus, icon: MapPin, step: "location" },
      { label: "Notifications", value: notificationStatus, icon: Bell, step: "notifications" },
      { label: "Microphone", value: micStatus, icon: Mic, step: "microphone" },
      { label: "Camera", value: cameraStatus, icon: Camera, step: "camera" },
    ],
    [locationStatus, notificationStatus, micStatus, cameraStatus]
  );

  return (
    <AnimatePresence>
      {visible && (
      <motion.div
        key="permission-gate"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100001] flex items-center justify-center bg-background/90 px-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <Card className="w-full max-w-xl border-border bg-card shadow-2xl">
            <CardContent className="space-y-6 p-6 md:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 overflow-hidden flex-shrink-0">
                  <img src="/logo.png" alt="CCC" className="h-14 w-14 object-cover rounded-full" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    {isAdminRoute ? "Admin App Setup" : "CCC Access Setup"}
                  </p>
                  <h2 className="font-display text-2xl font-bold text-foreground">For a better experience</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Allow permissions for updates, live features, and location services.</p>
                </div>
                <button onClick={completeGate} className="self-start p-1 rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid gap-3">
                {statuses.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-border transition-colors ${
                        currentStep === item.step ? "bg-primary/20 animate-pulse" : "bg-background"
                      }`}>
                        {currentStep === item.step ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : (
                          <item.icon className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                    <Badge variant="outline" className={`capitalize ${
                      item.value === "granted" ? "border-success text-success" :
                      item.value === "denied" ? "border-destructive text-destructive" : ""
                    }`}>
                      {item.value}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                {requesting ? (
                  <span className="flex items-center gap-2 text-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Requesting permissions... Please approve the browser prompts.
                  </span>
                ) : (
                  <span>Tap "Allow" to enable all permissions at once, or continue without them.</span>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" className="rounded-full" onClick={completeGate} disabled={requesting}>
                  Continue without allowing
                </Button>
                <Button className="rounded-full" onClick={handleAllow} disabled={requesting}>
                  {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Allow All
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PermissionGate;
