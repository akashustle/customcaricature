import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Award, Download, Eye } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/50 border border-purple-100/30 rounded-2xl p-5 shadow-sm ${className}`}>
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

  const handleDownload = async (cert: any) => {
    try {
      const { data } = await supabase.storage.from("workshop-files").download(cert.storage_path);
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = cert.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Fallback to signed URL
      const { data } = await supabase.storage.from("workshop-files").createSignedUrl(cert.storage_path, 3600);
      if (data?.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = cert.file_name;
        a.click();
      }
    }
  };

  const handleView = async (cert: any) => {
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(cert.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (!settings?.enabled && certificates.length === 0) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-purple-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Certificate Not Available Yet</p>
          <p className="text-gray-300 text-xs mt-1">Your certificate will appear here after workshop completion.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-purple-500" /> My Certificates
      </h2>
      {certificates.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-purple-200 mx-auto mb-3" />
          <p className="text-gray-400">No certificate uploaded yet</p>
          <p className="text-gray-300 text-xs mt-1">Your certificate will appear here once issued.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert: any) => (
            <div key={cert.id} className="flex items-center justify-between p-4 rounded-xl bg-purple-50/60 border border-purple-100/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-200/60 to-pink-200/60 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-700 text-sm font-medium truncate">{cert.file_name}</p>
                  <p className="text-gray-400 text-xs">
                    Issued: {new Date(cert.uploaded_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleView(cert)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 rounded-lg">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => handleDownload(cert)} className="bg-purple-500 hover:bg-purple-400 rounded-lg">
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
