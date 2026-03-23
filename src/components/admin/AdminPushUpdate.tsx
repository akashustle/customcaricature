import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Rocket, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sendPushPilotNotification } from "@/lib/pushpilot";

const AdminPushUpdate = () => {
  const [version, setVersion] = useState("");
  const [message, setMessage] = useState("A new update is available!");
  const [active, setActive] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "app_update_push")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as any;
        setVersion(v.version || "");
        setMessage(v.message || "A new update is available!");
        setActive(v.active || false);
      }
    };
    fetch();
  }, []);

  const handlePush = async () => {
    if (!version.trim()) {
      toast({ title: "Enter a version number", variant: "destructive" });
      return;
    }
    setPushing(true);
    try {
      await supabase.from("admin_site_settings" as any).upsert({
        id: "app_update_push",
        value: { active: true, version: version.trim(), message: message.trim(), pushed_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      } as any);

      // Send push notification to all users about the update
      if (notifyUsers) {
        try {
          await sendPushPilotNotification({
            title: "🚀 App Updated!",
            message: message.trim() || `Version ${version.trim()} is live!`,
            click_url: "https://customcaricature.lovable.app/",
          });
        } catch {}
      }

      setActive(true);
      toast({ title: `✅ Update v${version.trim()} pushed to all users!` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setPushing(false);
  };

  const handleDeactivate = async () => {
    await supabase.from("admin_site_settings" as any).upsert({
      id: "app_update_push",
      value: { active: false, version, message },
      updated_at: new Date().toISOString(),
    } as any);
    setActive(false);
    toast({ title: "Update prompt deactivated" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          Push App Update
          {active && <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs ml-2">Live</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground font-body">
          Push an update prompt to all active users. They'll see a banner to update the app.
        </p>
        <div>
          <Label className="text-sm font-body">Version Number *</Label>
          <Input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g. 2.1.0"
            className="font-mono"
          />
        </div>
        <div>
          <Label className="text-sm font-body">Update Message</Label>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="A new update is available!"
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={notifyUsers} onCheckedChange={setNotifyUsers} />
          <Label className="text-sm font-body">Send push notification to users</Label>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePush} disabled={pushing || !version.trim()} className="rounded-full font-body gap-1.5">
            <Rocket className="w-4 h-4" />
            {pushing ? "Pushing..." : "Push Update"}
          </Button>
          {active && (
            <Button variant="outline" onClick={handleDeactivate} className="rounded-full font-body">
              Deactivate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPushUpdate;
