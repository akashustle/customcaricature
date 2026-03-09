import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Award, Download, Eye } from "lucide-react";

const WorkshopCertificates = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [certificates, setCertificates] = useState<any[]>([]);
  const [settingsEnabled, setSettingsEnabled] = useState(false);

  const cardBg = dm ? "bg-[#241f33]/80 border-[#3a3150]/50" : "bg-white/50 border-purple-100/30";
  const textPrimary = dm ? "text-white font-bold" : "text-[#3a2e22] font-bold";
  const textSecondary = dm ? "text-white/60 font-medium" : "text-[#5a4a3a] font-medium";
  const textMuted = dm ? "text-white/40" : "text-[#8a7a6a]";

  useEffect(() => {
    fetchCertificates(); fetchSettings();
    const ch = supabase.channel("ws-certs-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_certificates" }, fetchCertificates)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings" }, fetchSettings)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchCertificates = async () => {
    const { data } = await supabase.from("workshop_certificates" as any).select("*").eq("user_id", user.id);
    if (data) setCertificates((data as any[]).filter((c: any) => c.visible !== false));
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*").eq("id", "certificate_visibility").single();
    if (data) setSettingsEnabled((data as any).value?.enabled ?? false);
  };

  const handleDownload = async (cert: any) => {
    try {
      const { data } = await supabase.storage.from("workshop-files").download(cert.storage_path);
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url; a.download = cert.file_name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      const { data } = await supabase.storage.from("workshop-files").createSignedUrl(cert.storage_path, 3600);
      if (data?.signedUrl) { const a = document.createElement("a"); a.href = data.signedUrl; a.download = cert.file_name; a.click(); }
    }
  };

  const handleView = async (cert: any) => {
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(cert.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>
  );

  // If admin disabled certificate visibility, don't show certificates even if uploaded
  if (!settingsEnabled) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <Award className={`w-16 h-16 ${dm ? "text-white/20" : "text-purple-200"} mx-auto mb-3`} />
          <p className={`${textPrimary} text-base`}>Certificates</p>
          <p className={`${textSecondary} text-sm mt-2`}>After completing your assignment submission, you will receive your certificate here. 🎓</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h2 className={`${textPrimary} text-lg flex items-center gap-2 mb-4`}>
        <Award className="w-5 h-5 text-purple-500" /> My Certificates
      </h2>
      {certificates.length === 0 ? (
        <div className="text-center py-12">
          <Award className={`w-16 h-16 ${dm ? "text-white/20" : "text-purple-200"} mx-auto mb-3`} />
          <p className={textSecondary}>Your certificate will appear here once issued</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert: any) => (
            <div key={cert.id} className={`flex items-center justify-between p-4 rounded-xl ${dm ? "bg-purple-900/20 border-purple-700/30" : "bg-purple-50/60 border-purple-100/40"} border`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-lg ${dm ? "bg-purple-500/20" : "bg-gradient-to-br from-purple-200/60 to-pink-200/60"} flex items-center justify-center flex-shrink-0`}>
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className={`${textPrimary} text-sm truncate`}>{cert.file_name}</p>
                  <p className={`${textMuted} text-xs`}>Issued: {new Date(cert.uploaded_at || cert.created_at).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleView(cert)} className={`${textMuted} hover:${textSecondary} rounded-lg`}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => handleDownload(cert)} className="bg-purple-500 hover:bg-purple-400 rounded-lg font-bold">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

export default WorkshopCertificates;