import { useEffect, useMemo, useState } from "react";
import { Bell, MapPin, Mic, ShieldCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { requestBrowserNotificationPermission } from "@/lib/webpush";
import { motion, AnimatePresence } from "framer-motion";

const GATE_KEY = "ccc_permissions_gate_v3";
const DELAY_MS = 2500; // Reduced from 5s to 2.5s for faster UX

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
    }
    if (typeof Notification !== "undefined") {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const done = localStorage.getItem(GATE_KEY) === "done";
    if (done) return;

    // If all already granted, skip
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      requestBrowserNotificationPermission(user?.id);
      return;
    }

    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const completeGate = () => {
    localStorage.setItem(GATE_KEY, "done");
    setVisible(false);
  };

  const handleAllow = async () => {
    setRequesting(true);

    // Request all permissions in parallel where possible
    const locationPromise = new Promise<void>((resolve) => {
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
        { timeout: 5000, enableHighAccuracy: false } // Faster with lower accuracy
      );
    });

    await locationPromise;

    // Notifications
    setCurrentStep("notifications");
    try {
      const perm = await requestBrowserNotificationPermission(user?.id);
      setNotificationStatus(perm === "unsupported" ? "unsupported" : perm);
    } catch {}

    // Microphone
    setCurrentStep("microphone");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus("granted");
      stream.getTracks().forEach(t => t.stop());
    } catch {
      setMicStatus("denied");
    }

    setCurrentStep(null);
    setRequesting(false);
    completeGate();
  };

  const statuses = useMemo(
    () => [
      { label: "Location", value: locationStatus, icon: MapPin, step: "location" },
      { label: "Notifications", value: notificationStatus, icon: Bell, step: "notifications" },
      { label: "Microphone", value: micStatus, icon: Mic, step: "microphone" },
    ],
    [locationStatus, notificationStatus, micStatus]
  );

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
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
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-border">
                  <img src="/logo.png" alt="CCC logo" className="h-10 w-10 object-contain" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">CCC Access Setup</p>
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
                  Allow
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PermissionGate;
