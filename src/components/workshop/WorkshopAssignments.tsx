import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle, Clock, Star, XCircle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

const WorkshopAssignments = ({ user }: { user: any }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetchAssignments();
    fetchSettings();
  }, []);

  const fetchAssignments = async () => {
    const { data } = await supabase.from("workshop_assignments" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setAssignments(data as any[]);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) {
      const map: any = {};
      (data as any[]).forEach((s: any) => { map[s.id] = s.value; });
      setSettings(map);
    }
  };

  const isSubmissionEnabled = settings.assignment_submission_enabled?.enabled !== false;

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
        user_id: user.id, file_name: file.name, storage_path: path,
        status: "submitted", submitted_at: new Date().toISOString(),
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

  const handleDelete = async (a: any) => {
    if (a.status === "graded") {
      toast({ title: "Cannot delete graded assignments", variant: "destructive" });
      return;
    }
    if (a.storage_path) {
      await supabase.storage.from("workshop-files").remove([a.storage_path]);
    }
    await supabase.from("workshop_assignments" as any).delete().eq("id", a.id);
    toast({ title: "Assignment Deleted" });
    fetchAssignments();
  };

  const handleView = async (a: any) => {
    if (!a.storage_path) return;
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(a.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" /> Assignments
        </h2>
        {isSubmissionEnabled && (
          <label>
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button asChild size="sm" disabled={uploading} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl cursor-pointer">
                <span><Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading..." : "Submit"}</span>
              </Button>
            </motion.div>
          </label>
        )}
      </div>

      {!isSubmissionEnabled && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4 text-yellow-400 text-xs">
          Assignment submission is currently disabled.
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-white/10 mx-auto mb-3" />
          <p className="text-white/50">No assignments submitted yet</p>
          <p className="text-white/30 text-xs mt-1">Upload your assignment file above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: any) => (
            <div key={a.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{a.file_name || "Assignment"}</p>
                  <p className="text-white/40 text-xs">{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-IN") : "—"}</p>
                  
                  {a.status === "graded" && (
                    <div className="mt-2 space-y-1">
                      {a.marks !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-amber-400">{a.marks} / {a.total_marks || 100}</span>
                        </div>
                      )}
                      {a.pass_status && (
                        <Badge className={`text-xs ${a.pass_status === "pass" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                          {a.pass_status === "pass" ? <><CheckCircle className="w-3 h-3 mr-1" />Pass</> : <><XCircle className="w-3 h-3 mr-1" />Fail</>}
                        </Badge>
                      )}
                      {a.admin_notes && <p className="text-xs text-white/40 italic">"{a.admin_notes}"</p>}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Badge className={`text-[10px] ${
                    a.status === "submitted" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                    a.status === "graded" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                    "bg-white/10 text-white/40 border-white/10"
                  }`}>
                    {a.status === "submitted" ? <><Clock className="w-3 h-3 mr-1" />Submitted</> :
                     a.status === "graded" ? <><CheckCircle className="w-3 h-3 mr-1" />Graded</> : "Pending"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleView(a)} className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg h-7 px-2 text-[10px]">
                      View
                    </Button>
                    {a.status !== "graded" && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(a)} className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-7 px-2">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

export default WorkshopAssignments;
