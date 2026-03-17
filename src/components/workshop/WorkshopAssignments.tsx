import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle, Clock, Star, XCircle, Trash2, RefreshCw, Eye, CloudUpload } from "lucide-react";
import { motion } from "framer-motion";

const WorkshopAssignments = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [assignments, setAssignments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<any>({});

  const cardBg = dm ? "bg-[#1e1b16]/80 border-[#3a3428]/50" : "bg-card/50 border-border/30";
  const textPrimary = dm ? "text-white font-bold" : "text-foreground font-bold";
  const textSecondary = dm ? "text-white/60 font-medium" : "text-muted-foreground font-medium";
  const textMuted = dm ? "text-white/40" : "text-muted-foreground/70";

  useEffect(() => {
    fetchAssignments(); fetchSettings();
    const ch = supabase.channel("ws-assignments-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_assignments" }, fetchAssignments)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings" }, fetchSettings)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
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
  const workshopEnded = settings.workshop_ended?.enabled === true;
  const canUpload = isSubmissionEnabled && !workshopEnded;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: `${file.name} too large`, description: "Max 20MB per file", variant: "destructive" });
          continue;
        }
        const path = `assignments/${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("workshop-files").upload(path, file);
        if (uploadErr) throw uploadErr;
        await supabase.from("workshop_assignments" as any).insert({
          user_id: user.id, file_name: file.name, storage_path: path,
          status: "submitted", submitted_at: new Date().toISOString(),
        } as any);
      }
      toast({ title: `${files.length > 1 ? `${files.length} assignments` : "Assignment"} submitted! ✅` });
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

  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>
  );

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${textPrimary} text-lg flex items-center gap-2`}>
            <FileText className="w-5 h-5 text-accent" /> Assignments
          </h2>
          {canUpload && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" multiple disabled={uploading} />
                <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-primary-foreground bg-primary ${uploading ? "opacity-60 pointer-events-none" : "hover:opacity-90"} transition-all shadow-md`}>
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Submit Assignment"}
                </div>
              </label>
            </motion.div>
          )}
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className={`w-16 h-16 ${dm ? "text-white/20" : "text-primary/20"} mx-auto mb-3`} />
            <p className={textSecondary}>No assignments submitted yet</p>
            {canUpload && <p className={`${textMuted} text-xs mt-1`}>Upload your assignment file using the button above or below</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a: any) => (
              <motion.div 
                key={a.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl ${dm ? "bg-white/5 border-white/10" : "bg-secondary/50 border-border/30"} border`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`${textPrimary} text-sm truncate`}>{a.file_name || "Assignment"}</p>
                    <p className={`${textMuted} text-xs`}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-IN") : "—"}</p>
                    
                    {a.status === "graded" && (
                      <div className="mt-2 space-y-1">
                        {a.marks !== null && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                            <span className={`text-sm font-bold ${dm ? "text-amber-400" : "text-accent"}`}>{a.marks} / {a.total_marks || 100}</span>
                          </div>
                        )}
                        {a.pass_status && (
                          <Badge className={`text-xs font-bold ${a.pass_status === "pass" ? "bg-green-100 text-green-600 border-green-200" : "bg-red-100 text-red-500 border-red-200"}`}>
                            {a.pass_status === "pass" ? <><CheckCircle className="w-3 h-3 mr-1" />Pass</> : <><XCircle className="w-3 h-3 mr-1" />Fail</>}
                          </Badge>
                        )}
                        {a.graded_by_artist && <p className={`text-xs ${dm ? "text-accent" : "text-primary"} font-bold`}>Graded by: {a.graded_by_artist}</p>}
                        {a.admin_notes && <p className={`text-xs ${textSecondary} italic`}>"{a.admin_notes}"</p>}
                        {a.pass_status === "fail" && canUpload && (
                          <div className={`mt-2 ${dm ? "bg-amber-900/20 border-amber-700/30" : "bg-warning/10 border-warning/20"} border rounded-lg p-2`}>
                            <p className={`${dm ? "text-amber-400" : "text-amber-600"} text-xs font-bold flex items-center gap-1`}>
                              <RefreshCw className="w-3 h-3" /> Don't give up! You can re-upload and try again.
                            </p>
                            <label className="mt-1 block cursor-pointer">
                              <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" multiple />
                              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border border-amber-300 text-amber-600 hover:bg-amber-50 transition-colors">
                                <Upload className="w-3 h-3" /> Re-upload
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Badge className={`text-[10px] font-bold ${
                      a.status === "submitted" ? "bg-blue-100 text-blue-500 border-blue-200" :
                      a.status === "graded" ? "bg-green-100 text-green-600 border-green-200" :
                      "bg-gray-100 text-gray-400 border-gray-200"
                    }`}>
                      {a.status === "submitted" ? <><Clock className="w-3 h-3 mr-1" />Submitted</> :
                       a.status === "graded" ? <><CheckCircle className="w-3 h-3 mr-1" />Graded</> : "Pending"}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleView(a)} className="rounded-lg h-7 px-2">
                        <Eye className="w-3.5 h-3.5 mr-0.5" /><span className="text-[10px]">View</span>
                      </Button>
                      {a.status !== "graded" && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(a)} className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg h-7 px-2">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Always-visible submit section at bottom */}
      {canUpload && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="text-center">
            <CloudUpload className={`w-12 h-12 mx-auto mb-3 ${dm ? "text-white/30" : "text-primary/30"}`} />
            <p className={`${textPrimary} text-base mb-1`}>Submit Your Assignment</p>
            <p className={`${textMuted} text-xs mb-4`}>Upload PDF, JPG, JPEG or PNG files (Max 20MB each)</p>
            <label className="cursor-pointer inline-block">
              <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" multiple disabled={uploading} />
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.95 }}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-primary-foreground bg-primary ${uploading ? "opacity-60 pointer-events-none" : ""} transition-all shadow-lg btn-3d`}
              >
                <Upload className="w-5 h-5" />
                {uploading ? "Uploading..." : "Choose Files & Submit"}
              </motion.div>
            </label>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
};

export default WorkshopAssignments;
