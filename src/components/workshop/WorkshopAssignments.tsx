import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle, Clock, Star, XCircle, Trash2, RefreshCw, Eye } from "lucide-react";
import { motion } from "framer-motion";

const WorkshopAssignments = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [assignments, setAssignments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<any>({});

  const cardBg = dm ? "bg-[#241f33]/80 border-[#3a3150]/50" : "bg-white/50 border-purple-100/30";
  const textPrimary = dm ? "text-white font-bold" : "text-[#3a2e22] font-bold";
  const textSecondary = dm ? "text-white/60 font-medium" : "text-[#5a4a3a] font-medium";
  const textMuted = dm ? "text-white/40" : "text-[#8a7a6a]";

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
  const workshopEnded = settings.workshop_ended?.enabled;
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
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${textPrimary} text-lg flex items-center gap-2`}>
          <FileText className="w-5 h-5 text-purple-500" /> Assignments
        </h2>
        {canUpload && (
          <label>
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" multiple />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button asChild size="sm" disabled={uploading} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl cursor-pointer font-bold">
                <span><Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading..." : "Submit"}</span>
              </Button>
            </motion.div>
          </label>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className={`w-16 h-16 ${dm ? "text-white/20" : "text-purple-200"} mx-auto mb-3`} />
          <p className={textSecondary}>No assignments submitted yet</p>
          {canUpload && <p className={`${textMuted} text-xs mt-1`}>Upload your assignment file above</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: any) => (
            <div key={a.id} className={`p-4 rounded-xl ${dm ? "bg-purple-900/20 border-purple-700/30" : "bg-purple-50/40 border-purple-100/30"} border`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`${textPrimary} text-sm truncate`}>{a.file_name || "Assignment"}</p>
                  <p className={`${textMuted} text-xs`}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-IN") : "—"}</p>
                  
                  {a.status === "graded" && (
                    <div className="mt-2 space-y-1">
                      {a.marks !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className={`text-sm font-bold ${dm ? "text-amber-400" : "text-amber-500"}`}>{a.marks} / {a.total_marks || 100}</span>
                        </div>
                      )}
                      {a.pass_status && (
                        <Badge className={`text-xs font-bold ${a.pass_status === "pass" ? "bg-green-100 text-green-600 border-green-200" : "bg-red-100 text-red-500 border-red-200"}`}>
                          {a.pass_status === "pass" ? <><CheckCircle className="w-3 h-3 mr-1" />Pass</> : <><XCircle className="w-3 h-3 mr-1" />Fail</>}
                        </Badge>
                      )}
                      {a.graded_by_artist && <p className={`text-xs ${dm ? "text-purple-400" : "text-purple-500"} font-bold`}>Graded by: {a.graded_by_artist}</p>}
                      {a.admin_notes && <p className={`text-xs ${textSecondary} italic`}>"{a.admin_notes}"</p>}
                      {a.pass_status === "fail" && canUpload && (
                        <div className={`mt-2 ${dm ? "bg-amber-900/20 border-amber-700/30" : "bg-amber-50/80 border-amber-200/30"} border rounded-lg p-2`}>
                          <p className={`${dm ? "text-amber-400" : "text-amber-600"} text-xs font-bold flex items-center gap-1`}>
                            <RefreshCw className="w-3 h-3" /> Don't give up! You can re-upload and try again.
                          </p>
                          <label className="mt-1 block">
                            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" multiple />
                            <Button asChild size="sm" variant="outline" className="text-xs h-7 cursor-pointer border-amber-300 text-amber-600 hover:bg-amber-50 font-bold">
                              <span><Upload className="w-3 h-3 mr-1" /> Re-upload</span>
                            </Button>
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
                    <Button variant="ghost" size="sm" onClick={() => handleView(a)} className={`${textMuted} hover:${textSecondary} rounded-lg h-7 px-2`}>
                      <Eye className="w-3.5 h-3.5 mr-0.5" /><span className="text-[10px]">View</span>
                    </Button>
                    {a.status !== "graded" && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(a)} className="text-red-400 hover:text-red-500 hover:bg-red-50/60 rounded-lg h-7 px-2">
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