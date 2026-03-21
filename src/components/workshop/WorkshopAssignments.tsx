import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle, Clock, Star, XCircle, Trash2, RefreshCw, Eye, CloudUpload, ArrowUpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const isSubmissionEnabled = settings.assignment_submission_enabled ? settings.assignment_submission_enabled.enabled !== false : true;
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
    if (!confirm("Delete this assignment?")) return;
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
      {/* PROMINENT SUBMIT BUTTON - Always at the top when uploads are allowed */}
      {canUpload && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center ${
            dm ? "border-amber-500/40 bg-amber-900/10" : "border-primary/30 bg-primary/5"
          }`}>
            {/* Animated background pulse */}
            <motion.div
              className="absolute inset-0 opacity-10"
              style={{ background: dm ? "radial-gradient(circle, #f59e0b, transparent)" : "radial-gradient(circle, hsl(var(--primary)), transparent)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.12, 0.05] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            <div className="relative z-10">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ArrowUpCircle className={`w-14 h-14 mx-auto mb-3 ${dm ? "text-amber-400" : "text-primary"}`} />
              </motion.div>
              
              <h3 className={`${textPrimary} text-lg mb-1`}>Submit Your Assignment</h3>
              <p className={`${textMuted} text-xs mb-5`}>Upload PDF, JPG, JPEG, PNG, DOC files (Max 20MB each)</p>
              
              <label className="cursor-pointer inline-block">
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleUpload} 
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" 
                  multiple 
                  disabled={uploading} 
                />
                <motion.div 
                  whileHover={{ scale: 1.06, y: -3 }} 
                  whileTap={{ scale: 0.95 }}
                  className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold text-white shadow-xl ${
                    uploading ? "opacity-60 pointer-events-none" : ""
                  } transition-all`}
                  style={{
                    background: dm 
                      ? "linear-gradient(135deg, #f59e0b, #d97706)" 
                      : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                    boxShadow: dm 
                      ? "0 6px 0 #92400e, 0 8px 20px rgba(245,158,11,0.3)" 
                      : "0 6px 0 hsl(var(--primary) / 0.6), 0 8px 20px hsl(var(--primary) / 0.2)",
                  }}
                >
                  <Upload className="w-6 h-6" />
                  {uploading ? "Uploading..." : "📎 Choose Files & Submit"}
                </motion.div>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {!canUpload && workshopEnded && (
        <GlassCard className="text-center">
          <p className={`${textSecondary} text-sm`}>Assignment submissions are closed.</p>
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${textPrimary} text-lg flex items-center gap-2`}>
            <FileText className="w-5 h-5 text-accent" /> My Assignments
          </h2>
          {canUpload && (
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple disabled={uploading} />
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white ${
                  uploading ? "opacity-60 pointer-events-none" : ""
                } transition-all shadow-md`}
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Submit More"}
              </motion.div>
            </label>
          )}
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className={`w-16 h-16 ${dm ? "text-white/20" : "text-primary/20"} mx-auto mb-3`} />
            <p className={textSecondary}>No assignments submitted yet</p>
            {canUpload && <p className={`${textMuted} text-xs mt-1`}>Upload your assignment file using the button above ☝️</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {assignments.map((a: any, i: number) => (
                <motion.div 
                  key={a.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 rounded-xl ${dm ? "bg-white/5 border-white/10" : "bg-secondary/50 border-border/30"} border`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`${textPrimary} text-sm truncate`}>{a.file_name || "Assignment"}</p>
                      <p className={`${textMuted} text-xs`}>
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-IN") : "—"}
                        {a.added_by_admin && <span className="ml-1 text-accent">(Added by Admin)</span>}
                      </p>
                      
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
                            <div className={`mt-2 ${dm ? "bg-amber-900/20 border-amber-700/30" : "bg-accent/10 border-accent/20"} border rounded-lg p-2`}>
                              <p className={`${dm ? "text-amber-400" : "text-accent"} text-xs font-bold flex items-center gap-1`}>
                                <RefreshCw className="w-3 h-3" /> Don't give up! You can re-upload and try again.
                              </p>
                              <label className="mt-1 block cursor-pointer">
                                <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
                                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border border-accent/40 text-accent hover:bg-accent/10 transition-colors">
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
                        <button onClick={() => handleView(a)} className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-secondary transition-colors">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button onClick={() => handleDelete(a)} className="flex items-center px-2 py-1 rounded-lg text-[10px] text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default WorkshopAssignments;
