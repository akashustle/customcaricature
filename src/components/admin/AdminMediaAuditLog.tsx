import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Image, Camera, Trash2, Shield } from "lucide-react";

type AuditEntry = {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  target_order_id: string | null;
  details: string | null;
  created_at: string;
};

const ACTION_ICONS: Record<string, any> = {
  view_photo: Eye,
  view_camera: Camera,
  delete_photo: Trash2,
  view_gallery: Image,
};

const ACTION_COLORS: Record<string, string> = {
  view_photo: "bg-blue-100 text-blue-800",
  view_camera: "bg-purple-100 text-purple-800",
  delete_photo: "bg-red-100 text-red-800",
  view_gallery: "bg-green-100 text-green-800",
};

const AdminMediaAuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEntries();
    fetchProfiles();
    const ch = supabase
      .channel("admin-audit-log")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_media_audit_log" }, () => fetchEntries())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchEntries = async () => {
    const { data } = await supabase.from("admin_media_audit_log").select("*").order("created_at", { ascending: false }).limit(100) as any;
    if (data) setEntries(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p: any) => { map[p.user_id] = p.full_name; });
      setProfiles(map);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Media Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-4 text-sm">No audit entries yet</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {entries.map(entry => {
              const Icon = ACTION_ICONS[entry.action] || Eye;
              return (
                <div key={entry.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs font-sans">
                  <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium">{profiles[entry.admin_user_id] || "Admin"}</span>
                      <Badge className={`text-[9px] border-none ${ACTION_COLORS[entry.action] || "bg-muted text-muted-foreground"}`}>
                        {entry.action.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {entry.details && <p className="text-muted-foreground truncate">{entry.details}</p>}
                    {entry.target_user_id && <p className="text-muted-foreground">User: {profiles[entry.target_user_id] || entry.target_user_id.slice(0, 8)}</p>}
                  </div>
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMediaAuditLog;

// Helper to log media actions
export const logMediaAction = async (action: string, targetUserId?: string, targetOrderId?: string, details?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_media_audit_log").insert({
    admin_user_id: user.id,
    action,
    target_user_id: targetUserId || null,
    target_order_id: targetOrderId || null,
    details: details || null,
  } as any);
};
