import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Smartphone, Key, Shield, Save, ExternalLink } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "@/hooks/use-toast";

const AdminIntegrations = () => {
  const { settings, updateSetting } = useSiteSettings();

  // OneSignal
  const [onesignalAppId, setOnesignalAppId] = useState((settings as any)?.onesignal_config?.app_id || "");
  const [onesignalEnabled, setOnesignalEnabled] = useState((settings as any)?.onesignal_config?.enabled || false);

  // OTP
  const [otpEnabled, setOtpEnabled] = useState((settings as any)?.otp_config?.enabled || false);
  const [otpApiKey, setOtpApiKey] = useState((settings as any)?.otp_config?.api_key || "");
  const [otpProvider, setOtpProvider] = useState((settings as any)?.otp_config?.provider || "twilio");

  const saveOneSignal = async () => {
    await updateSetting("onesignal_config", {
      enabled: onesignalEnabled,
      app_id: onesignalAppId,
    });
    toast({ title: "OneSignal settings saved ✅" });
  };

  const saveOTP = async () => {
    await updateSetting("otp_config", {
      enabled: otpEnabled,
      api_key: otpApiKey,
      provider: otpProvider,
    });
    toast({ title: "OTP settings saved ✅" });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display flex items-center gap-2">
        <Shield className="w-5 h-5 text-accent" />
        Integrations & Security
      </h2>

      {/* OneSignal Push Notifications */}
      <Card className="admin-card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-accent" />
            OneSignal Push Notifications
            {onesignalEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-2">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect OneSignal for advanced push notifications across web and mobile.
          </p>
          <div className="flex items-center gap-3">
            <Switch checked={onesignalEnabled} onCheckedChange={setOnesignalEnabled} />
            <Label className="text-sm font-medium">Enable OneSignal</Label>
          </div>
          {onesignalEnabled && (
            <div className="space-y-3 pl-1">
              <div>
                <Label className="text-sm">OneSignal App ID</Label>
                <Input
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={onesignalAppId}
                  onChange={(e) => setOnesignalAppId(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in your{" "}
                  <a href="https://app.onesignal.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                    OneSignal Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
              <Button size="sm" onClick={saveOneSignal} className="gap-1">
                <Save className="w-4 h-4" /> Save OneSignal Config
              </Button>
            </div>
          )}
          {!onesignalEnabled && (
            <Button size="sm" variant="outline" onClick={saveOneSignal}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Mobile OTP Verification */}
      <Card className="admin-card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="w-5 h-5 text-accent" />
            Mobile OTP Verification
            {otpEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-2">Active</Badge>
            ) : (
              <Badge variant="outline" className="text-xs ml-2">Disabled</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable mobile number verification via OTP during registration & login.
          </p>
          <div className="flex items-center gap-3">
            <Switch checked={otpEnabled} onCheckedChange={setOtpEnabled} />
            <Label className="text-sm font-medium">Enable OTP Verification</Label>
          </div>
          {otpEnabled && (
            <div className="space-y-3 pl-1">
              <div>
                <Label className="text-sm">SMS Provider</Label>
                <select
                  value={otpProvider}
                  onChange={(e) => setOtpProvider(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="twilio">Twilio</option>
                  <option value="msg91">MSG91</option>
                  <option value="2factor">2Factor</option>
                  <option value="textlocal">TextLocal</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">API Key / Auth Token</Label>
                <Input
                  type="password"
                  placeholder="Enter your SMS provider API key"
                  value={otpApiKey}
                  onChange={(e) => setOtpApiKey(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <Button size="sm" onClick={saveOTP} className="gap-1">
                <Key className="w-4 h-4" /> Save OTP Config
              </Button>
            </div>
          )}
          {!otpEnabled && (
            <Button size="sm" variant="outline" onClick={saveOTP}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminIntegrations;
