import { useEffect, useMemo, useState } from "react";
import { Bell, MapPin, Mic, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { requestBrowserNotificationPermission } from "@/lib/webpush";

const GATE_KEY = "ccc_permissions_gate_v2";

const PermissionGate = () => {
  const { user } = useAuth();
  const { location, microphone, requestLocation, requestMicrophone } = usePermissions(false);
  const [visible, setVisible] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(GATE_KEY) === "done";
    setVisible(!done);
  }, []);

  const statuses = useMemo(
    () => [
      { label: "Notifications", value: notificationStatus, icon: Bell },
      { label: "Microphone", value: microphone, icon: Mic },
      { label: "Location", value: location, icon: MapPin },
    ],
    [notificationStatus, microphone, location]
  );

  const completeGate = () => {
    localStorage.setItem(GATE_KEY, "done");
    setVisible(false);
  };

  const handleContinue = async () => {
    setRequesting(true);
    const notif = await requestBrowserNotificationPermission(user?.id);
    setNotificationStatus(notif);
    const mic = await requestMicrophone();
    const geo = await requestLocation();
    setRequesting(false);

    if (notif === "granted" && mic && geo) {
      completeGate();
    }
  };

  if (!visible) return null;

  const allGranted = notificationStatus === "granted" && microphone === "granted" && location === "granted";
  const anyDenied = [notificationStatus, microphone, location].some((status) => status === "denied");

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-background/90 px-4 backdrop-blur-md">
      <Card className="w-full max-w-xl border-border bg-card shadow-2xl">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-border">
              <img src="/logo.png" alt="CCC logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">CCC Access Setup</p>
              <h2 className="font-display text-2xl font-bold text-foreground">Allow permissions to continue</h2>
              <p className="mt-1 text-sm text-muted-foreground">We’ll ask for notifications, microphone, and location so updates and live features work properly.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {statuses.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background ring-1 ring-border">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <Badge variant="outline" className="capitalize">
                  {item.value}
                </Badge>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            {allGranted ? (
              <span className="flex items-center gap-2 text-foreground"><ShieldCheck className="h-4 w-4 text-primary" />All permissions granted — you’re good to go.</span>
            ) : anyDenied ? (
              <span>Please enable any blocked permission from your browser site settings, then continue again.</span>
            ) : (
              <span>Tap continue and approve all 3 prompts when your browser asks.</span>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={completeGate}>
              Continue later
            </Button>
            <Button className="rounded-full" onClick={handleContinue} disabled={requesting}>
              {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Enable now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionGate;