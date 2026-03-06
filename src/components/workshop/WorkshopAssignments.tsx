import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle, Clock, Star } from "lucide-react";

const WorkshopAssignments = ({ user }: { user: any }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    const { data } = await supabase.from("workshop_assignments" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setAssignments(data as any[]);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const path = `assignments/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("workshop-files").upload(path, file);
      if (uploadErr) throw uploadErr;

      await supabase.from("workshop_assignments" as any).insert({
        user_id: user.id,
        file_name: file.name,
        storage_path: path,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      } as any);

      toast({ title: "Assignment Submitted! ✅" });
      fetchAssignments();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge className="bg-blue-100 text-blue-800 border-none text-xs"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
      case "graded": return <Badge className="bg-green-100 text-green-800 border-none text-xs"><CheckCircle className="w-3 h-3 mr-1" />Graded</Badge>;
      default: return <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Assignments
          </CardTitle>
          <label>
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.zip" />
            <Button asChild size="sm" disabled={uploading} className="font-sans cursor-pointer">
              <span><Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading..." : "Submit"}</span>
            </Button>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-sans">No assignments submitted yet</p>
            <p className="text-xs text-muted-foreground font-sans mt-1">Upload your assignment file above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium text-sm truncate">{a.file_name || "Assignment"}</p>
                  <p className="text-xs text-muted-foreground font-sans">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-IN") : "—"}
                  </p>
                  {a.status === "graded" && a.marks !== null && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-sans font-bold text-amber-700">{a.marks} marks</span>
                    </div>
                  )}
                  {a.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-1 font-sans italic">"{a.admin_notes}"</p>
                  )}
                </div>
                <div className="flex-shrink-0 ml-2">{statusBadge(a.status)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkshopAssignments;
