import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, Smartphone, ExternalLink, Loader2 } from "lucide-react";

/**
 * Admin panel: configure the public /download page.
 *
 * Stores the APK URL, version, release notes and visibility flag in
 * `admin_site_settings` under the `app_download` row.
 */

interface AppDownloadConfig {
  android_apk_url?: string;
  ios_app_url?: string;
  version?: string;
  release_notes?: string;
  changelog?: string;
  size_mb?: number;
  sha256?: string;
  enabled?: boolean;
}

const AdminAppDownload = () => {
  const [cfg, setCfg] = useState<AppDownloadConfig>({ enabled: true, version: "1.0.0" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_site_settings")
        .select("value")
        .eq("id", "app_download")
        .maybeSingle();
      if (data?.value) setCfg(data.value as AppDownloadConfig);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_site_settings")
        .upsert({ id: "app_download", value: cfg as any }, { onConflict: "id" });
      if (error) throw error;
      toast({ title: "Saved", description: "Download page updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            App Download Page
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Controls the public <code className="text-primary">/download</code> page where users get the Android APK.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Show download page</div>
              <div className="text-xs text-muted-foreground">Disable while preparing a new build.</div>
            </div>
            <Switch
              checked={cfg.enabled !== false}
              onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Version</Label>
              <Input
                value={cfg.version || ""}
                onChange={(e) => setCfg({ ...cfg, version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
            <div>
              <Label>Size (MB)</Label>
              <Input
                type="number"
                value={cfg.size_mb || ""}
                onChange={(e) => setCfg({ ...cfg, size_mb: Number(e.target.value) || undefined })}
                placeholder="12"
              />
            </div>
          </div>

          <div>
            <Label>Android APK URL</Label>
            <Input
              value={cfg.android_apk_url || ""}
              onChange={(e) => setCfg({ ...cfg, android_apk_url: e.target.value })}
              placeholder="https://github.com/.../releases/download/v1.0.0/app.apk"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste the public URL of your signed APK (GitHub Releases, Supabase Storage, etc.).
            </p>
          </div>

          <div>
            <Label>iOS App URL (optional)</Label>
            <Input
              value={cfg.ios_app_url || ""}
              onChange={(e) => setCfg({ ...cfg, ios_app_url: e.target.value })}
              placeholder="https://apps.apple.com/..."
            />
          </div>

          <div>
            <Label>SHA-256 checksum (optional)</Label>
            <Input
              value={cfg.sha256 || ""}
              onChange={(e) => setCfg({ ...cfg, sha256: e.target.value.trim() })}
              placeholder="e.g. 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Run <code>sha256sum app.apk</code> after building and paste the hash so users can verify integrity.
            </p>
          </div>

          <div>
            <Label>Release notes (one-liner)</Label>
            <Textarea
              rows={2}
              value={cfg.release_notes || ""}
              onChange={(e) => setCfg({ ...cfg, release_notes: e.target.value })}
              placeholder="Short summary shown in the in-app update prompt."
            />
          </div>

          <div>
            <Label>Full changelog</Label>
            <Textarea
              rows={5}
              value={cfg.changelog || ""}
              onChange={(e) => setCfg({ ...cfg, changelog: e.target.value })}
              placeholder={"One bullet per line, e.g.\n- Offline order queue\n- Faster image upload\n- Bug fixes"}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Open public page <ExternalLink className="w-3 h-3" />
            </a>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAppDownload;
