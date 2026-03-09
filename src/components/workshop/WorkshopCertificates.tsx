import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Award, Download, Eye } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

const WorkshopCertificates = ({ user }: { user: any }) => {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetchCertificates();
    fetchSettings();
  }, []);

  const fetchCertificates = async () => {
    const { data } = await supabase.from("workshop_certificates" as any).select("*").eq("user_id", user.id);
    if (data) setCertificates((data as any[]).filter((c: any) => c.visible !== false));
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*").eq("id", "certificate_visibility").single();
    if (data) setSettings((data as any).value);
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const handleView = async (cert: any) => {
    const url = await getSignedUrl(cert.storage_path);
    if (url) window.open(url, "_blank");
  };

  const handleDownload = async (cert: any) => {
    const url = await getSignedUrl(cert.storage_path);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = cert.file_name;
      a.click();
    }
  };

  if (!settings?.enabled && certificates.length === 0) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-white/10 mx-auto mb-3" />
          <p className="text-white/50 font-medium">Certificate Not Available Yet</p>
          <p className="text-white/30 text-xs mt-1">Your certificate will appear here after workshop completion.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-purple-400" /> My Certificates
      </h2>
      {certificates.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-white/10 mx-auto mb-3" />
          <p className="text-white/50">No certificate uploaded yet</p>
          <p className="text-white/30 text-xs mt-1">Your certificate will appear here once issued.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert: any) => (
            <div key={cert.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{cert.file_name}</p>
                  <p className="text-white/40 text-xs">
                    Issued: {new Date(cert.uploaded_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleView(cert)} className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => handleDownload(cert)} className="bg-purple-600 hover:bg-purple-500 rounded-lg">
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
