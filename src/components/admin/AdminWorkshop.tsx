import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Save, X, Upload, Users, Video, Award, MessageSquare, Settings, Eye, EyeOff, Download, Clock, ChevronDown, ChevronUp } from "lucide-react";
import ExportButton from "./ExportButton";

const AdminWorkshop = () => {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: "", mobile: "", email: "", instagram_id: "", age: "", occupation: "", workshop_date: "2026-03-14", slot: "12pm-3pm", student_type: "manually_added" });
  const [newVideo, setNewVideo] = useState({ title: "", video_url: "", video_type: "link", workshop_date: "2026-03-14", slot: "", target_type: "all", expiry_date: "", global_download_allowed: false });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certUserId, setCertUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("admin-workshop")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_users" }, fetchUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_videos" }, fetchVideos)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_feedback" }, fetchFeedbacks)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_assignments" }, fetchAssignments)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAll = () => { fetchUsers(); fetchVideos(); fetchFeedbacks(); fetchAssignments(); fetchSettings(); };

  const fetchUsers = async () => {
    const { data } = await supabase.from("workshop_users" as any).select("*").order("created_at", { ascending: false });
    if (data) setUsers(data as any[]);
  };
  const fetchVideos = async () => {
    const { data } = await supabase.from("workshop_videos" as any).select("*").order("created_at", { ascending: false });
    if (data) setVideos(data as any[]);
  };
  const fetchFeedbacks = async () => {
    const { data } = await supabase.from("workshop_feedback" as any).select("*, workshop_users(name)").order("created_at", { ascending: false });
    if (data) setFeedbacks(data as any[]);
  };
  const fetchAssignments = async () => {
    const { data } = await supabase.from("workshop_assignments" as any).select("*, workshop_users(name)").order("created_at", { ascending: false });
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

  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.mobile) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    const { error } = await supabase.from("workshop_users" as any).insert({
      ...newUser,
      age: newUser.age ? parseInt(newUser.age) : null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Workshop User Added! ✅" });
    setShowAddUser(false);
    setNewUser({ name: "", mobile: "", email: "", instagram_id: "", age: "", occupation: "", workshop_date: "2026-03-14", slot: "12pm-3pm", student_type: "manually_added" });
    fetchUsers();
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;
    const { error } = await supabase.from("workshop_users" as any).update({
      name: editData.name, mobile: editData.mobile, email: editData.email,
      instagram_id: editData.instagram_id, age: editData.age ? parseInt(editData.age) : null,
      occupation: editData.occupation, workshop_date: editData.workshop_date,
      slot: editData.slot, student_type: editData.student_type,
      video_access_enabled: editData.video_access_enabled,
      video_download_allowed: editData.video_download_allowed,
    } as any).eq("id", editingUser);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "User Updated!" });
    setEditingUser(null);
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    await supabase.from("workshop_users" as any).delete().eq("id", id);
    toast({ title: "User Deleted" });
    fetchUsers();
  };

  const addVideo = async () => {
    if (!newVideo.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    setUploading(true);
    try {
      let videoUrl = newVideo.video_url;
      if (newVideo.video_type === "file" && videoFile) {
        const path = `videos/${Date.now()}_${videoFile.name}`;
        const { error } = await supabase.storage.from("workshop-files").upload(path, videoFile);
        if (error) throw error;
        const { data: urlData } = await supabase.storage.from("workshop-files").createSignedUrl(path, 86400 * 365);
        videoUrl = urlData?.signedUrl || path;
      }
      await supabase.from("workshop_videos" as any).insert({
        title: newVideo.title, video_url: videoUrl, video_type: newVideo.video_type,
        workshop_date: newVideo.workshop_date, slot: newVideo.slot || null,
        target_type: newVideo.target_type,
        expiry_date: newVideo.expiry_date || null,
        global_download_allowed: newVideo.global_download_allowed,
      } as any);
      toast({ title: "Video Added! ✅" });
      setShowAddVideo(false);
      setNewVideo({ title: "", video_url: "", video_type: "link", workshop_date: "2026-03-14", slot: "", target_type: "all", expiry_date: "", global_download_allowed: false });
      setVideoFile(null);
      fetchVideos();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteVideo = async (id: string) => {
    await supabase.from("workshop_videos" as any).delete().eq("id", id);
    toast({ title: "Video Deleted" });
    fetchVideos();
  };

  const updateVideoExpiry = async (videoId: string, newExpiry: string) => {
    await supabase.from("workshop_videos" as any).update({ expiry_date: newExpiry || null } as any).eq("id", videoId);
    toast({ title: "Expiry Updated" });
    fetchVideos();
  };

  const uploadCertificate = async (userId: string) => {
    if (!certFile) return;
    setUploading(true);
    try {
      const path = `certificates/${userId}/${Date.now()}_${certFile.name}`;
      const { error } = await supabase.storage.from("workshop-files").upload(path, certFile);
      if (error) throw error;
      await supabase.from("workshop_certificates" as any).insert({
        user_id: userId, file_name: certFile.name, storage_path: path,
      } as any);
      toast({ title: "Certificate Uploaded! ✅" });
      setCertFile(null);
      setCertUserId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const gradeAssignment = async (assignmentId: string, marks: number, notes: string) => {
    await supabase.from("workshop_assignments" as any).update({
      marks, status: "graded", graded_at: new Date().toISOString(), admin_notes: notes,
    } as any).eq("id", assignmentId);
    toast({ title: "Assignment Graded! ✅" });
    fetchAssignments();
  };

  const toggleGlobalSetting = async (key: string, enabled: boolean) => {
    await supabase.from("workshop_settings" as any).update({ value: { enabled }, updated_at: new Date().toISOString() } as any).eq("id", key);
    fetchSettings();
    toast({ title: `${key.replace(/_/g, " ")} ${enabled ? "Enabled" : "Disabled"}` });
  };

  const registeredOnline = users.filter((u: any) => u.student_type === "registered_online");
  const manuallyAdded = users.filter((u: any) => u.student_type === "manually_added");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-card border border-border rounded-2xl p-1.5">
          <TabsTrigger value="users" className="font-sans rounded-full text-xs"><Users className="w-3.5 h-3.5 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="videos" className="font-sans rounded-full text-xs"><Video className="w-3.5 h-3.5 mr-1" />Videos</TabsTrigger>
          <TabsTrigger value="assignments" className="font-sans rounded-full text-xs"><Award className="w-3.5 h-3.5 mr-1" />Assignments</TabsTrigger>
          <TabsTrigger value="feedback" className="font-sans rounded-full text-xs"><MessageSquare className="w-3.5 h-3.5 mr-1" />Feedback</TabsTrigger>
          <TabsTrigger value="settings" className="font-sans rounded-full text-xs"><Settings className="w-3.5 h-3.5 mr-1" />Controls</TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Workshop Users ({users.length})</h2>
            <div className="flex gap-2">
              <ExportButton
                data={users.map((u: any) => ({ Name: u.name, Email: u.email, Mobile: u.mobile, Instagram: u.instagram_id || "", Age: u.age || "", Occupation: u.occupation || "", Date: u.workshop_date, Slot: u.slot, Type: u.student_type }))}
                sheetName="Workshop Users" fileName="CCC_Workshop_Users"
              />
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild><Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add User</Button></DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Add Workshop User</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name *</Label><Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} /></div>
                    <div><Label>Email *</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
                    <div><Label>Mobile *</Label><Input value={newUser.mobile} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setNewUser({...newUser, mobile: d}); }} maxLength={10} /></div>
                    <div><Label>Instagram ID</Label><Input value={newUser.instagram_id} onChange={e => setNewUser({...newUser, instagram_id: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Age</Label><Input type="number" value={newUser.age} onChange={e => setNewUser({...newUser, age: e.target.value})} /></div>
                      <div><Label>Occupation</Label><Input value={newUser.occupation} onChange={e => setNewUser({...newUser, occupation: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Workshop Date</Label>
                        <Select value={newUser.workshop_date} onValueChange={v => setNewUser({...newUser, workshop_date: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="2026-03-14">14 March 2026</SelectItem><SelectItem value="2026-03-15">15 March 2026</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label>Slot</Label>
                        <Select value={newUser.slot} onValueChange={v => setNewUser({...newUser, slot: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="12pm-3pm">12 PM – 3 PM</SelectItem><SelectItem value="6pm-9pm">6 PM – 9 PM</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Student Type</Label>
                      <Select value={newUser.student_type} onValueChange={v => setNewUser({...newUser, student_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="registered_online">Registered Online</SelectItem><SelectItem value="manually_added">Manually Added</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addUser} className="w-full font-sans">Add User</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Registered Online */}
          <div>
            <h3 className="font-sans font-semibold text-sm text-muted-foreground mb-2">📝 Registered Online ({registeredOnline.length})</h3>
            {registeredOnline.length === 0 ? <p className="text-xs text-muted-foreground">No online registrations</p> :
              registeredOnline.map((u: any) => <UserCard key={u.id} u={u} expandedUser={expandedUser} setExpandedUser={setExpandedUser} editingUser={editingUser} setEditingUser={setEditingUser} editData={editData} setEditData={setEditData} saveUserEdit={saveUserEdit} deleteUser={deleteUser} certUserId={certUserId} setCertUserId={setCertUserId} certFile={certFile} setCertFile={setCertFile} uploadCertificate={uploadCertificate} uploading={uploading} />)
            }
          </div>

          {/* Manually Added */}
          <div>
            <h3 className="font-sans font-semibold text-sm text-muted-foreground mb-2">✋ Manually Added ({manuallyAdded.length})</h3>
            {manuallyAdded.length === 0 ? <p className="text-xs text-muted-foreground">No manually added users</p> :
              manuallyAdded.map((u: any) => <UserCard key={u.id} u={u} expandedUser={expandedUser} setExpandedUser={setExpandedUser} editingUser={editingUser} setEditingUser={setEditingUser} editData={editData} setEditData={setEditData} saveUserEdit={saveUserEdit} deleteUser={deleteUser} certUserId={certUserId} setCertUserId={setCertUserId} certFile={certFile} setCertFile={setCertFile} uploadCertificate={uploadCertificate} uploading={uploading} />)
            }
          </div>
        </TabsContent>

        {/* VIDEOS TAB */}
        <TabsContent value="videos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Workshop Videos ({videos.length})</h2>
            <Dialog open={showAddVideo} onOpenChange={setShowAddVideo}>
              <DialogTrigger asChild><Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add Video</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Upload Video</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Title *</Label><Input value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} /></div>
                  <div><Label>Upload Type</Label>
                    <Select value={newVideo.video_type} onValueChange={v => setNewVideo({...newVideo, video_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="link">Video Link</SelectItem><SelectItem value="file">Upload File</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {newVideo.video_type === "link" ? (
                    <div><Label>Video URL</Label><Input value={newVideo.video_url} onChange={e => setNewVideo({...newVideo, video_url: e.target.value})} placeholder="https://..." /></div>
                  ) : (
                    <div><Label>Video File</Label><Input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} /></div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Workshop Date</Label>
                      <Select value={newVideo.workshop_date} onValueChange={v => setNewVideo({...newVideo, workshop_date: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="2026-03-14">14 March</SelectItem><SelectItem value="2026-03-15">15 March</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Slot (optional)</Label>
                      <Select value={newVideo.slot} onValueChange={v => setNewVideo({...newVideo, slot: v})}>
                        <SelectTrigger><SelectValue placeholder="All Slots" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Slots</SelectItem><SelectItem value="12pm-3pm">12 PM – 3 PM</SelectItem><SelectItem value="6pm-9pm">6 PM – 9 PM</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Access For</Label>
                    <Select value={newVideo.target_type} onValueChange={v => setNewVideo({...newVideo, target_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All Users</SelectItem><SelectItem value="selected">Selected Users</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Expiry Date & Time</Label><Input type="datetime-local" value={newVideo.expiry_date} onChange={e => setNewVideo({...newVideo, expiry_date: e.target.value})} /></div>
                  <div className="flex items-center justify-between">
                    <Label>Allow Download</Label>
                    <Switch checked={newVideo.global_download_allowed} onCheckedChange={v => setNewVideo({...newVideo, global_download_allowed: v})} />
                  </div>
                  <Button onClick={addVideo} disabled={uploading} className="w-full font-sans">{uploading ? "Uploading..." : "Add Video"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {videos.map((v: any) => (
            <VideoCard key={v.id} video={v} onDelete={() => deleteVideo(v.id)} onUpdateExpiry={(exp: string) => updateVideoExpiry(v.id, exp)} />
          ))}
          {videos.length === 0 && <p className="text-center text-muted-foreground py-8 font-sans">No videos yet</p>}
        </TabsContent>

        {/* ASSIGNMENTS TAB */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Assignments ({assignments.length})</h2>
            <ManualAssignmentUpload users={users} onUploaded={fetchAssignments} />
          </div>
          {assignments.map((a: any) => (
            <AssignmentCard key={a.id} assignment={a} onGrade={gradeAssignment} onDelete={async (id: string) => {
              await supabase.from("workshop_assignments" as any).delete().eq("id", id);
              toast({ title: "Assignment Deleted" });
              fetchAssignments();
            }} onEdit={async (id: string, updates: any) => {
              await supabase.from("workshop_assignments" as any).update(updates as any).eq("id", id);
              toast({ title: "Assignment Updated ✅" });
              fetchAssignments();
            }} />
          ))}
          {assignments.length === 0 && <p className="text-center text-muted-foreground py-8 font-sans">No assignments submitted</p>}
        </TabsContent>

        {/* FEEDBACK TAB */}
        <TabsContent value="feedback" className="space-y-4">
          <h2 className="font-display text-lg font-bold">Feedback ({feedbacks.length})</h2>
          {feedbacks.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans font-semibold text-sm">{(f as any).workshop_users?.name || "User"}</p>
                    <p className="font-sans text-sm mt-1">{f.message}</p>
                    <p className="text-[10px] text-muted-foreground font-sans mt-1">{new Date(f.created_at).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {feedbacks.length === 0 && <p className="text-center text-muted-foreground py-8 font-sans">No feedback yet</p>}
        </TabsContent>

        {/* SETTINGS/CONTROLS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <h2 className="font-display text-lg font-bold">Global Controls</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans font-semibold text-sm">Enable Workshop Registration</p>
                  <p className="text-xs text-muted-foreground font-sans">Allow new users to register from the workshop page</p>
                </div>
                <Switch checked={settings.registration_enabled?.enabled ?? false} onCheckedChange={v => toggleGlobalSetting("registration_enabled", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans font-semibold text-sm">Assignments Deletable</p>
                  <p className="text-xs text-muted-foreground font-sans">Allow deleting assignments from admin</p>
                </div>
                <Switch checked={settings.assignments_deletable?.enabled ?? true} onCheckedChange={v => toggleGlobalSetting("assignments_deletable", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans font-semibold text-sm">Assignments Editable</p>
                  <p className="text-xs text-muted-foreground font-sans">Allow editing assignments from admin</p>
                </div>
                <Switch checked={settings.assignments_editable?.enabled ?? true} onCheckedChange={v => toggleGlobalSetting("assignments_editable", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans font-semibold text-sm">Enable Video Access for Everyone</p>
                  <p className="text-xs text-muted-foreground font-sans">Toggle ON/OFF video access globally</p>
                </div>
                <Switch checked={settings.global_video_access?.enabled ?? true} onCheckedChange={v => toggleGlobalSetting("global_video_access", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans font-semibold text-sm">Enable Video Download for Everyone</p>
                  <p className="text-xs text-muted-foreground font-sans">Toggle ON/OFF download globally</p>
                </div>
                <Switch checked={settings.global_video_download?.enabled ?? false} onCheckedChange={v => toggleGlobalSetting("global_video_download", v)} />
              </div>
            </CardContent>
          </Card>

          {/* Workshop Management */}
          <h2 className="font-display text-lg font-bold pt-4">Workshop Details</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-sans">Workshop Title</Label>
                <Input
                  value={settings.workshop_details?.title || ""}
                  onChange={async (e) => {
                    await supabase.from("workshop_settings" as any).update({
                      value: { ...settings.workshop_details, title: e.target.value },
                      updated_at: new Date().toISOString(),
                    } as any).eq("id", "workshop_details");
                    fetchSettings();
                  }}
                  placeholder="Caricature Masterclass Workshop"
                />
              </div>
              <div>
                <Label className="text-sm font-sans">Description</Label>
                <Textarea
                  value={settings.workshop_details?.description || ""}
                  onChange={async (e) => {
                    await supabase.from("workshop_settings" as any).update({
                      value: { ...settings.workshop_details, description: e.target.value },
                      updated_at: new Date().toISOString(),
                    } as any).eq("id", "workshop_details");
                    fetchSettings();
                  }}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-sans">Dates</Label>
                  <Input
                    value={settings.workshop_details?.dates || ""}
                    onChange={async (e) => {
                      await supabase.from("workshop_settings" as any).update({
                        value: { ...settings.workshop_details, dates: e.target.value },
                        updated_at: new Date().toISOString(),
                      } as any).eq("id", "workshop_details");
                      fetchSettings();
                    }}
                    placeholder="14 & 15 March 2026"
                  />
                </div>
                <div>
                  <Label className="text-sm font-sans">Duration</Label>
                  <Input
                    value={settings.workshop_details?.duration || ""}
                    onChange={async (e) => {
                      await supabase.from("workshop_settings" as any).update({
                        value: { ...settings.workshop_details, duration: e.target.value },
                        updated_at: new Date().toISOString(),
                      } as any).eq("id", "workshop_details");
                      fetchSettings();
                    }}
                    placeholder="3 hours per session"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-sans">Price</Label>
                  <Input
                    value={settings.workshop_details?.price || ""}
                    onChange={async (e) => {
                      await supabase.from("workshop_settings" as any).update({
                        value: { ...settings.workshop_details, price: e.target.value },
                        updated_at: new Date().toISOString(),
                      } as any).eq("id", "workshop_details");
                      fetchSettings();
                    }}
                    placeholder="₹2,999"
                  />
                </div>
                <div>
                  <Label className="text-sm font-sans">WhatsApp Contact</Label>
                  <Input
                    value={settings.workshop_details?.contact_whatsapp || ""}
                    onChange={async (e) => {
                      await supabase.from("workshop_settings" as any).update({
                        value: { ...settings.workshop_details, contact_whatsapp: e.target.value },
                        updated_at: new Date().toISOString(),
                      } as any).eq("id", "workshop_details");
                      fetchSettings();
                    }}
                    placeholder="8433843725"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-sans">Highlights (comma-separated)</Label>
                <Input
                  value={(settings.workshop_details?.highlights || []).join(", ")}
                  onChange={async (e) => {
                    const highlights = e.target.value.split(",").map((h: string) => h.trim()).filter(Boolean);
                    await supabase.from("workshop_settings" as any).update({
                      value: { ...settings.workshop_details, highlights },
                      updated_at: new Date().toISOString(),
                    } as any).eq("id", "workshop_details");
                    fetchSettings();
                  }}
                  placeholder="Live demonstrations, Hands-on practice, Certificate"
                />
              </div>
            </CardContent>
          </Card>

          {/* Available Slots */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-sans font-semibold text-sm">Available Slots</h3>
              <p className="text-xs text-muted-foreground font-sans">Comma-separated time slots for registration</p>
              <Input
                value={(settings.registration_slots?.slots || []).join(", ")}
                onChange={async (e) => {
                  const slots = e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean);
                  await supabase.from("workshop_settings" as any).update({
                    value: { slots },
                    updated_at: new Date().toISOString(),
                  } as any).eq("id", "registration_slots");
                  fetchSettings();
                }}
                placeholder="12pm-3pm, 6pm-9pm"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ─── Sub-components ─── */

const UserCard = ({ u, expandedUser, setExpandedUser, editingUser, setEditingUser, editData, setEditData, saveUserEdit, deleteUser, certUserId, setCertUserId, certFile, setCertFile, uploadCertificate, uploading }: any) => {
  const isExpanded = expandedUser === u.id;
  const isEditing = editingUser === u.id;

  return (
    <Card className="mb-2">
      <CardContent className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name</Label><Input value={editData.name || ""} onChange={e => setEditData({...editData, name: e.target.value})} /></div>
              <div><Label className="text-xs">Email</Label><Input value={editData.email || ""} onChange={e => setEditData({...editData, email: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Mobile</Label><Input value={editData.mobile || ""} onChange={e => setEditData({...editData, mobile: e.target.value})} /></div>
              <div><Label className="text-xs">Instagram</Label><Input value={editData.instagram_id || ""} onChange={e => setEditData({...editData, instagram_id: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Age</Label><Input type="number" value={editData.age || ""} onChange={e => setEditData({...editData, age: e.target.value})} /></div>
              <div><Label className="text-xs">Occupation</Label><Input value={editData.occupation || ""} onChange={e => setEditData({...editData, occupation: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date</Label>
                <Select value={editData.workshop_date} onValueChange={v => setEditData({...editData, workshop_date: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="2026-03-14">14 March</SelectItem><SelectItem value="2026-03-15">15 March</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Slot</Label>
                <Select value={editData.slot} onValueChange={v => setEditData({...editData, slot: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="12pm-3pm">12 PM – 3 PM</SelectItem><SelectItem value="6pm-9pm">6 PM – 9 PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Video Access</Label>
              <Switch checked={editData.video_access_enabled ?? true} onCheckedChange={v => setEditData({...editData, video_access_enabled: v})} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Allow Download</Label>
              <Switch checked={editData.video_download_allowed ?? false} onCheckedChange={v => setEditData({...editData, video_download_allowed: v})} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveUserEdit}><Save className="w-4 h-4 mr-1" />Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                <p className="font-sans font-semibold">{u.name}</p>
                <p className="text-xs text-muted-foreground font-sans">{u.email} · {u.mobile}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px]">{u.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{new Date(u.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</Badge>
                  {!u.video_access_enabled && <Badge variant="destructive" className="text-[10px]"><EyeOff className="w-2.5 h-2.5 mr-0.5" />No Access</Badge>}
                  {u.video_download_allowed && <Badge className="text-[10px] bg-green-100 text-green-800 border-none"><Download className="w-2.5 h-2.5 mr-0.5" />DL</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                  <div><span className="text-muted-foreground">Instagram:</span> {u.instagram_id || "—"}</div>
                  <div><span className="text-muted-foreground">Age:</span> {u.age || "—"}</div>
                  <div><span className="text-muted-foreground">Occupation:</span> {u.occupation || "—"}</div>
                  <div><span className="text-muted-foreground">Type:</span> {u.student_type}</div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingUser(u.id); setEditData(u); }}><Edit2 className="w-3.5 h-3.5 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setCertUserId(u.id)}><Award className="w-3.5 h-3.5 mr-1" />Certificate</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="w-3.5 h-3.5 mr-1" />Delete</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete {u.name}?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteUser(u.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {certUserId === u.id && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
                    <Label className="text-xs">Upload Certificate</Label>
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCertFile(e.target.files?.[0] || null)} />
                    <Button size="sm" onClick={() => uploadCertificate(u.id)} disabled={!certFile || uploading}>
                      <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const VideoCard = ({ video, onDelete, onUpdateExpiry }: { video: any; onDelete: () => void; onUpdateExpiry: (exp: string) => void }) => {
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiry, setExpiry] = useState(video.expiry_date ? new Date(video.expiry_date).toISOString().slice(0, 16) : "");

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-sans font-semibold">{video.title}</p>
            <p className="text-xs text-muted-foreground font-sans">
              {new Date(video.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              {video.slot && ` · ${video.slot}`} · {video.target_type}
            </p>
            {video.expiry_date && (
              <p className="text-xs text-amber-600 font-sans mt-1">
                <Clock className="w-3 h-3 inline mr-1" />Expires: {new Date(video.expiry_date).toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setShowExpiry(!showExpiry)}><Clock className="w-4 h-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete Video?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {showExpiry && (
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Expiry Date & Time</Label><Input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} /></div>
            <Button size="sm" onClick={() => { onUpdateExpiry(expiry); setShowExpiry(false); }}><Save className="w-4 h-4" /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ManualAssignmentUpload = ({ users, onUploaded }: { users: any[]; onUploaded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);

  const filteredUsers = users.filter((u: any) =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mobile?.includes(searchTerm)
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedUserId) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: `${file.name} too large`, description: "Max 20MB", variant: "destructive" });
          continue;
        }
        const path = `assignments/${selectedUserId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("workshop-files").upload(path, file);
        if (uploadErr) throw uploadErr;
        await supabase.from("workshop_assignments" as any).insert({
          user_id: selectedUserId, file_name: file.name, storage_path: path,
          status: "submitted", submitted_at: new Date().toISOString(),
          added_by_admin: true,
        } as any);
      }
      toast({ title: "Assignment added for user ✅" });
      onUploaded();
      setOpen(false);
      setSelectedUserId("");
      setSearchTerm("");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="font-sans rounded-full"><Plus className="w-4 h-4 mr-1" />Add Assignment</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Add Assignment for Student</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Search Student</Label>
            <Input placeholder="Search by name, email, mobile..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          {searchTerm && (
            <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">No users found</p>
              ) : filteredUsers.slice(0, 10).map((u: any) => (
                <div
                  key={u.id}
                  className={`p-2 cursor-pointer hover:bg-muted text-sm font-sans ${selectedUserId === u.id ? "bg-primary/10 font-semibold" : ""}`}
                  onClick={() => { setSelectedUserId(u.id); setSearchTerm(u.name); }}
                >
                  {u.name} <span className="text-xs text-muted-foreground">({u.email})</span>
                </div>
              ))}
            </div>
          )}
          {selectedUserId && (
            <div>
              <Label>Upload File (PDF, Image, Docs)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple onChange={handleUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AssignmentCard = ({ assignment, onGrade, onDelete, onEdit }: { assignment: any; onGrade: (id: string, marks: number, notes: string) => void; onDelete?: (id: string) => void; onEdit?: (id: string, updates: any) => void }) => {
  const [marks, setMarks] = useState(assignment.marks?.toString() || "");
  const [notes, setNotes] = useState(assignment.admin_notes || "");
  const [grading, setGrading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(assignment.status);

  const viewFile = async () => {
    if (!assignment.storage_path) return;
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(assignment.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-sans font-semibold text-sm">{(assignment as any).workshop_users?.name || "User"}</p>
            <p className="text-xs text-muted-foreground font-sans">{assignment.file_name}</p>
            <p className="text-[10px] text-muted-foreground font-sans">{assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString("en-IN") : "—"}</p>
          </div>
          <div className="flex gap-1 items-center">
            <Badge className={`text-xs ${assignment.status === "graded" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"} border-none`}>
              {assignment.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={viewFile}><Eye className="w-4 h-4" /></Button>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditingStatus(!editingStatus)}><Edit2 className="w-4 h-4" /></Button>
            )}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete Assignment?</AlertDialogTitle></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(assignment.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        {editingStatus && onEdit && (
          <div className="flex gap-2 items-end pt-2 border-t border-border">
            <div className="flex-1">
              <Label className="text-xs">Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="retry">Retry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => { onEdit(assignment.id, { status: newStatus }); setEditingStatus(false); }}><Save className="w-4 h-4 mr-1" />Update</Button>
          </div>
        )}
        {!grading && assignment.status !== "graded" && (
          <Button size="sm" variant="outline" onClick={() => setGrading(true)} className="font-sans">Grade Assignment</Button>
        )}
        {(grading || assignment.status === "graded") && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Marks</Label><Input type="number" value={marks} onChange={e => setMarks(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            <Button size="sm" onClick={() => onGrade(assignment.id, parseInt(marks) || 0, notes)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save Grade</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminWorkshop;
