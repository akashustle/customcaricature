import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Smartphone, Key, Shield, Save, ExternalLink, Zap, Radio } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminIntegrations = () => {
  const { settings, loading, updateSetting } = useSiteSettings();

  // Built-in Web Push
  const [webpushEnabled, setWebpushEnabled] = useState(true);
  const [pushSubCount, setPushSubCount] = useState(0);

  // OneSignal (optional secondary)
  const [onesignalAppId, setOnesignalAppId] = useState("");
  const [onesignalRestApiKey, setOnesignalRestApiKey] = useState("");
  const [onesignalEnabled, setOnesignalEnabled] = useState(false);

  // OTP
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpApiKey, setOtpApiKey] = useState("");
  const [otpProvider, setOtpProvider] = useState("twilio");

  useEffect(() => {
    if (loading) return;
    const fetchSettings = async () => {
      const { data } = await supabase.from("admin_site_settings").select("id, value").in("id", ["onesignal_config", "otp_config", "webpush_config"]);
      if (data) {
        data.forEach((row: any) => {
          if (row.id === "onesignal_config" && row.value) {
            setOnesignalEnabled(row.value.enabled || false);
            setOnesignalAppId(row.value.app_id || "");
            setOnesignalRestApiKey(row.value.rest_api_key || "");
          }
          if (row.id === "otp_config" && row.value) {
            setOtpEnabled(row.value.enabled || false);
            setOtpApiKey(row.value.api_key || "");
            setOtpProvider(row.value.provider || "twilio");
          }
          if (row.id === "webpush_config" && row.value) {
            setWebpushEnabled(row.value.enabled !== false);
          }
        });
      }

      // Get subscriber count
      const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true });
      setPushSubCount(count || 0);
    };
    fetchSettings();
  }, [loading]);

  const saveWebPush = async () => {
    await updateSetting("webpush_config", { enabled: webpushEnabled });
    toast({ title: "Web Push settings saved ✅" });
  };

  const saveOneSignal = async () => {
    await updateSetting("onesignal_config", { enabled: onesignalEnabled, app_id: onesignalAppId, rest_api_key: onesignalRestApiKey });
    toast({ title: "OneSignal settings saved ✅" });
  };

  const saveOTP = async () => {
    await updateSetting("otp_config", { enabled: otpEnabled, api_key: otpApiKey, provider: otpProvider });
    toast({ title: "OTP settings saved ✅" });
  };

  if (loading) return <p className="text-center text-muted-foreground py-10">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display flex items-center gap-2">
        <Shield className="w-5 h-5 text-accent" />
        Integrations & Security
      </h2>

      {/* Built-in Web Push (Primary) */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="w-5 h-5 text-primary" />
            Built-in Web Push
            {webpushEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs ml-2">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>
            )}
            <Badge variant="outline" className="text-[10px] ml-auto">{pushSubCount} subscribers</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Self-hosted push notifications using VAPID keys — no third-party dependency. Works across all modern browsers. Notifications are sent automatically when in-app notifications are created.
          </p>
          <div className="flex items-center gap-3">
            <Switch checked={webpushEnabled} onCheckedChange={setWebpushEnabled} />
            <Label className="text-sm font-medium">Enable Built-in Web Push</Label>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-foreground">How it works:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Users are prompted for notification permission on first visit</li>
              <li>Push subscriptions are stored in your own database</li>
              <li>Every in-app notification triggers a real web push via VAPID</li>
              <li>Works even when the browser is closed (on supported devices)</li>
            </ul>
          </div>
          <Button size="sm" onClick={saveWebPush} className="gap-1">
            <Save className="w-4 h-4" /> Save Web Push Config
          </Button>
        </CardContent>
      </Card>

      {/* OneSignal (Optional Secondary) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-accent" />
            OneSignal (Optional Secondary)
            {onesignalEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs ml-2">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Optional: Connect OneSignal as a secondary push channel for additional reach.
          </p>
          <div className="flex items-center gap-3">
            <Switch checked={onesignalEnabled} onCheckedChange={setOnesignalEnabled} />
            <Label className="text-sm font-medium">Enable OneSignal</Label>
          </div>
          {onesignalEnabled && (
            <div className="space-y-3 pl-1">
              <div>
                <Label className="text-sm">OneSignal App ID</Label>
                <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={onesignalAppId} onChange={(e) => setOnesignalAppId(e.target.value)} className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-sm">OneSignal REST API Key</Label>
                <Input type="password" placeholder="Your OneSignal REST API Key" value={onesignalRestApiKey} onChange={(e) => setOnesignalRestApiKey(e.target.value)} className="font-mono text-sm" />
              </div>
              <Button size="sm" onClick={saveOneSignal} className="gap-1">
                <Save className="w-4 h-4" /> Save OneSignal Config
              </Button>
            </div>
          )}
          {!onesignalEnabled && (
            <Button size="sm" variant="outline" onClick={saveOneSignal}><Save className="w-4 h-4 mr-1" /> Save</Button>
          )}
        </CardContent>
      </Card>

      {/* Mobile OTP */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="w-5 h-5 text-accent" />
            Mobile OTP Verification
            {otpEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs ml-2">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Enable mobile number verification via OTP during registration & login.</p>
          <div className="flex items-center gap-3">
            <Switch checked={otpEnabled} onCheckedChange={setOtpEnabled} />
            <Label className="text-sm font-medium">Enable OTP Verification</Label>
          </div>
          {otpEnabled && (
            <div className="space-y-3 pl-1">
              <div>
                <Label className="text-sm">SMS Provider</Label>
                <select value={otpProvider} onChange={(e) => setOtpProvider(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="twilio">Twilio</option>
                  <option value="msg91">MSG91</option>
                  <option value="2factor">2Factor</option>
                  <option value="textlocal">TextLocal</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">API Key / Auth Token</Label>
                <Input type="password" placeholder="Enter your SMS provider API key" value={otpApiKey} onChange={(e) => setOtpApiKey(e.target.value)} className="font-mono text-sm" />
              </div>
              <Button size="sm" onClick={saveOTP} className="gap-1"><Key className="w-4 h-4" /> Save OTP Config</Button>
            </div>
          )}
          {!otpEnabled && (
            <Button size="sm" variant="outline" onClick={saveOTP}><Save className="w-4 h-4 mr-1" /> Save</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminIntegrations;
