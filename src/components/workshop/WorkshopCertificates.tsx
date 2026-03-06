import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, Eye } from "lucide-react";

const WorkshopCertificates = ({ user }: { user: any }) => {
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    const { data } = await supabase.from("workshop_certificates" as any).select("*").eq("user_id", user.id);
    if (data) setCertificates(data as any[]);
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

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> My Certificate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-sans">No certificate uploaded yet</p>
            <p className="text-xs text-muted-foreground font-sans mt-1">Your certificate will appear here once issued by the admin</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.map((cert: any) => (
              <div key={cert.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-sans font-medium text-sm">{cert.file_name}</p>
                    <p className="text-xs text-muted-foreground font-sans">
                      Issued: {new Date(cert.uploaded_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleView(cert)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => handleDownload(cert)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkshopCertificates;
