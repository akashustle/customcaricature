import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  LayoutDashboard, Users, UserPlus, Video, Award, FileText, MessageSquare,
  Settings, Calendar, LogOut, Plus, Edit2, Trash2, Save, X, Upload, Eye,
  EyeOff, Clock, CheckCircle, XCircle, Star, Link2, Radio,
  MapPin, History, Shield, BarChart3, ChevronDown, ChevronUp, TrendingUp,
  PieChart, Activity, Moon, Sun, ChevronLeft, ChevronRight, AlertTriangle,
  ExternalLink, UsersRound, Download, RefreshCw,
} from "lucide-react";
import ExportButton from "@/components/admin/ExportButton";
import { BarChart, Bar, XAxis, YAxis, PieChart as RPieChart, Pie, Cell, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";

const CHART_COLORS = ["#b08d57", "#d4a574", "#8b6f47", "#c9a96e", "#7c9885", "#d98c8c", "#8fa3bf", "#a8c0a0"];

const sidebarItems = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "analytics", icon: BarChart3, label: "Analytics" },
  { key: "all-users", icon: UsersRound, label: "All Users" },
  { key: "registered", icon: Users, label: "Registered" },
  { key: "manual", icon: UserPlus, label: "Manual Users" },
  { key: "live", icon: Radio, label: "Live Sessions" },
  { key: "videos", icon: Video, label: "Videos" },
  { key: "assignments", icon: FileText, label: "Assignments" },
  { key: "certificates", icon: Award, label: "Certificates" },
  { key: "attendance", icon: Calendar, label: "Attendance" },
  { key: "locations", icon: MapPin, label: "Locations" },
  { key: "feedback", icon: MessageSquare, label: "Feedback" },
  { key: "settings", icon: Settings, label: "Settings" },
];

const WorkshopAdmin = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [locations, setLocations] = useState<any[]>([]);
  const [adminLog, setAdminLog] = useState<any[]>([]);
  const [workshopAdmins, setWorkshopAdmins] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certUserId, setCertUserId] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ws_dark") === "true");
  const [hardResetStep, setHardResetStep] = useState(0);
  const [hardResetCode, setHardResetCode] = useState("");
  const [feedbackReply, setFeedbackReply] = useState<{ [key: string]: string }>({});

  const [newUser, setNewUser] = useState({ name: "", mobile: "", email: "", instagram_id: "", age: "", gender: "", occupation: "", why_join: "", workshop_date: "2026-03-14", slot: "12pm-3pm", student_type: "manually_added", payment_screenshot: null as File | null });
  const [newVideo, setNewVideo] = useState({ title: "", video_url: "", video_type: "link", workshop_date: "2026-03-14", slot: "", target_type: "all", expiry_date: "", global_download_allowed: false });
  const [newSession, setNewSession] = useState({ title: "", session_date: "2026-03-14", slot: "6pm-9pm", artist_name: "", artist_portfolio_link: "", requirements: "", what_students_learn: "", meet_link: "" });
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    localStorage.setItem("ws_dark", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_admin");
    if (!stored) { navigate("/cccworkshop2006"); return; }
    setAdminInfo(JSON.parse(stored));
    fetchAll();
    const ch = supabase.channel("ws-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_users" }, fetchUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_videos" }, fetchVideos)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_feedback" }, fetchFeedbacks)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_assignments" }, fetchAssignments)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_live_sessions" }, fetchLiveSessions)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_attendance" }, fetchAttendance)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_user_locations" }, fetchLocations)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_admin_log" }, fetchAdminLog)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAll = () => { fetchUsers(); fetchVideos(); fetchFeedbacks(); fetchAssignments(); fetchLiveSessions(); fetchAttendance(); fetchSettings(); fetchLocations(); fetchAdminLog(); fetchWorkshopAdmins(); };
  const fetchUsers = async () => { const { data } = await supabase.from("workshop_users" as any).select("*").order("created_at", { ascending: false }); if (data) setUsers(data as any[]); };
  const fetchVideos = async () => { const { data } = await supabase.from("workshop_videos" as any).select("*").order("created_at", { ascending: false }); if (data) setVideos(data as any[]); };
  const fetchFeedbacks = async () => { const { data } = await supabase.from("workshop_feedback" as any).select("*, workshop_users(name)").order("created_at", { ascending: false }); if (data) setFeedbacks(data as any[]); };
  const fetchAssignments = async () => { const { data } = await supabase.from("workshop_assignments" as any).select("*, workshop_users(name)").order("created_at", { ascending: false }); if (data) setAssignments(data as any[]); };
  const fetchLiveSessions = async () => { const { data } = await supabase.from("workshop_live_sessions" as any).select("*").order("session_date"); if (data) setLiveSessions(data as any[]); };
  const fetchAttendance = async () => { const { data } = await supabase.from("workshop_attendance" as any).select("*"); if (data) setAttendance(data as any[]); };
  const fetchLocations = async () => { const { data } = await supabase.from("workshop_user_locations" as any).select("*"); if (data) setLocations(data as any[]); };
  const fetchAdminLog = async () => { const { data } = await supabase.from("workshop_admin_log" as any).select("*").order("created_at", { ascending: false }).limit(100); if (data) setAdminLog(data as any[]); };
  const fetchWorkshopAdmins = async () => { const { data } = await supabase.from("workshop_admins" as any).select("*").order("created_at"); if (data) setWorkshopAdmins(data as any[]); };
  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) { const map: any = {}; (data as any[]).forEach((s: any) => { map[s.id] = s.value; }); setSettings(map); }
  };

  const logAction = async (action: string, details: string) => {
    const info = JSON.parse(localStorage.getItem("workshop_admin") || "{}");
    await supabase.from("workshop_admin_log" as any).insert({ admin_id: info.id, admin_name: info.name || info.email, action, details } as any);
  };

  const handleLogout = async () => {
    await logAction("logout", "Logged out of Workshop Admin Panel");
    localStorage.removeItem("workshop_admin");
    navigate("/cccworkshop2006");
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning ☀️";
    if (h < 17) return "Good Afternoon 🌤️";
    return "Good Evening 🌙";
  };

  // User CRUD
  const addUser = async () => {
    if (!newUser.name || !newUser.mobile || !newUser.slot || !newUser.student_type) { toast({ title: "Name, Mobile, Slot & Registration Type are mandatory", variant: "destructive" }); return; }
    let paymentPath = null;
    if (newUser.payment_screenshot && newUser.student_type === "manually_added") {
      const path = `payments/${Date.now()}_${newUser.payment_screenshot.name}`;
      await supabase.storage.from("workshop-files").upload(path, newUser.payment_screenshot);
      paymentPath = path;
    }
    const { error } = await supabase.from("workshop_users" as any).insert({
      name: newUser.name, mobile: newUser.mobile, email: newUser.email || null,
      instagram_id: newUser.instagram_id || null, age: newUser.age ? parseInt(newUser.age) : null,
      gender: newUser.gender || null, occupation: newUser.occupation || null,
      why_join: newUser.why_join || null, workshop_date: newUser.workshop_date,
      slot: newUser.slot, student_type: newUser.student_type,
      payment_screenshot_path: paymentPath,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logAction("add_user", `Added workshop user: ${newUser.name}`);
    toast({ title: "User Added! ✅" });
    setShowAddUser(false);
    setNewUser({ name: "", mobile: "", email: "", instagram_id: "", age: "", gender: "", occupation: "", why_join: "", workshop_date: "2026-03-14", slot: "12pm-3pm", student_type: "manually_added", payment_screenshot: null });
    fetchUsers();
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;
    const { error } = await supabase.from("workshop_users" as any).update({
      name: editData.name, mobile: editData.mobile, email: editData.email,
      instagram_id: editData.instagram_id, age: editData.age ? parseInt(editData.age) : null,
      gender: editData.gender || null, occupation: editData.occupation,
      workshop_date: editData.workshop_date, slot: editData.slot,
      student_type: editData.student_type, video_access_enabled: editData.video_access_enabled,
      video_download_allowed: editData.video_download_allowed, is_enabled: editData.is_enabled,
    } as any).eq("id", editingUser);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logAction("edit_user", `Edited user: ${editData.name}`);
    toast({ title: "User Updated!" });
    setEditingUser(null);
    fetchUsers();
  };

  const deleteUser = async (id: string, name: string) => {
    await supabase.from("workshop_users" as any).delete().eq("id", id);
    await logAction("delete_user", `Deleted user: ${name}`);
    toast({ title: "User Deleted" }); fetchUsers();
  };

  const toggleUserEnabled = async (id: string, enabled: boolean, name: string) => {
    await supabase.from("workshop_users" as any).update({ is_enabled: enabled } as any).eq("id", id);
    await logAction(enabled ? "enable_user" : "disable_user", `${enabled ? "Enabled" : "Disabled"} user: ${name}`);
    toast({ title: enabled ? "User Enabled" : "User Disabled" }); fetchUsers();
  };

  // Video CRUD
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
        target_type: newVideo.target_type, expiry_date: newVideo.expiry_date || null,
        global_download_allowed: newVideo.global_download_allowed,
      } as any);
      await logAction("add_video", `Added video: ${newVideo.title}`);
      toast({ title: "Video Added! ✅" });
      setShowAddVideo(false);
      setNewVideo({ title: "", video_url: "", video_type: "link", workshop_date: "2026-03-14", slot: "", target_type: "all", expiry_date: "", global_download_allowed: false });
      setVideoFile(null); fetchVideos();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const deleteVideo = async (id: string, title: string) => {
    await supabase.from("workshop_videos" as any).delete().eq("id", id);
    await logAction("delete_video", `Deleted video: ${title}`);
    toast({ title: "Video Deleted" }); fetchVideos();
  };

  const toggleVideoField = async (id: string, field: string, val: any) => {
    await supabase.from("workshop_videos" as any).update({ [field]: val } as any).eq("id", id);
    await logAction("edit_video", `Updated video ${field}`);
    toast({ title: "Video Updated" }); fetchVideos();
  };

  // Live Session CRUD
  const addLiveSession = async () => {
    if (!newSession.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    await supabase.from("workshop_live_sessions" as any).insert(newSession as any);
    await logAction("add_session", `Created live session: ${newSession.title}`);
    toast({ title: "Live Session Created! ✅" });
    setShowAddSession(false);
    setNewSession({ title: "", session_date: "2026-03-14", slot: "6pm-9pm", artist_name: "", artist_portfolio_link: "", requirements: "", what_students_learn: "", meet_link: "" });
    fetchLiveSessions();
  };

  const updateSessionStatus = async (id: string, status: string) => {
    await supabase.from("workshop_live_sessions" as any).update({ status } as any).eq("id", id);
    await logAction("update_session", `Session status → ${status}`);
    toast({ title: `Session: ${status}` }); fetchLiveSessions();
  };

  const toggleSessionLink = async (id: string, enabled: boolean) => {
    await supabase.from("workshop_live_sessions" as any).update({ link_enabled: enabled } as any).eq("id", id);
    await logAction("toggle_session_link", `Session link ${enabled ? "enabled" : "disabled"}`);
    toast({ title: enabled ? "Link Enabled" : "Link Disabled" }); fetchLiveSessions();
  };

  const deleteSession = async (id: string) => {
    await supabase.from("workshop_live_sessions" as any).delete().eq("id", id);
    await logAction("delete_session", "Deleted live session"); toast({ title: "Session Deleted" }); fetchLiveSessions();
  };

  // Certificate
  const uploadCertificate = async (userId: string) => {
    if (!certFile) return;
    setUploading(true);
    try {
      const path = `certificates/${userId}/${Date.now()}_${certFile.name}`;
      const { error } = await supabase.storage.from("workshop-files").upload(path, certFile);
      if (error) throw error;
      await supabase.from("workshop_certificates" as any).insert({ user_id: userId, file_name: certFile.name, storage_path: path, visible: true } as any);
      await logAction("upload_cert", `Uploaded certificate for user ${userId}`);
      toast({ title: "Certificate Uploaded! ✅" }); setCertFile(null); setCertUserId(null);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  // Assignment grading
  const gradeAssignment = async (id: string, marks: number, notes: string, totalMarks: number, passStatus: string, gradedByArtist: string) => {
    await supabase.from("workshop_assignments" as any).update({
      marks, status: "graded", graded_at: new Date().toISOString(),
      admin_notes: notes, total_marks: totalMarks, pass_status: passStatus,
      graded_by_artist: gradedByArtist || null,
    } as any).eq("id", id);
    await logAction("grade_assignment", `Graded assignment: ${marks}/${totalMarks}`);
    toast({ title: "Assignment Graded! ✅" }); fetchAssignments();
  };

  // Attendance
  const markAttendance = async (userId: string, date: string, status: string) => {
    const info = JSON.parse(localStorage.getItem("workshop_admin") || "{}");
    await supabase.from("workshop_attendance" as any).upsert({
      user_id: userId, session_date: date, status, marked_by: info.id,
    } as any, { onConflict: "user_id,session_date" });
    await logAction("mark_attendance", `Marked ${status} for ${date}`);
    toast({ title: `Marked ${status}` }); fetchAttendance();
  };

  // Settings
  const toggleSetting = async (key: string, enabled: boolean) => {
    await supabase.from("workshop_settings" as any).upsert({ id: key, value: { enabled }, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    await logAction("toggle_setting", `${key} → ${enabled ? "enabled" : "disabled"}`); fetchSettings();
    toast({ title: `${key.replace(/_/g, " ")} ${enabled ? "Enabled" : "Disabled"}` });
  };

  // Toggle workshop navbar button
  const toggleWorkshopNavbar = async (enabled: boolean) => {
    await supabase.from("admin_site_settings").upsert({ id: "show_workshop", value: { enabled }, updated_at: new Date().toISOString() }, { onConflict: "id" });
    await logAction("toggle_workshop_navbar", `Workshop navbar button ${enabled ? "shown" : "hidden"}`);
    toast({ title: `Workshop button ${enabled ? "shown" : "hidden"} on main website` });
  };

  // Add Admin
  const addAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: newAdmin.email, password: newAdmin.password, full_name: newAdmin.name, mobile: "0000000000", make_admin: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await logAction("add_admin", `Added new admin: ${newAdmin.name} (${newAdmin.email})`);
      toast({ title: "Admin Added! ✅" }); setShowAddAdmin(false); setNewAdmin({ name: "", email: "", password: "" }); fetchWorkshopAdmins();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const deleteAdmin = async (userId: string, name: string) => {
    await supabase.from("user_roles" as any).delete().eq("user_id", userId).eq("role", "admin");
    await supabase.from("workshop_admins" as any).delete().eq("user_id", userId);
    await logAction("delete_admin", `Removed admin: ${name}`);
    toast({ title: "Admin Removed" }); fetchWorkshopAdmins();
  };

  const deleteLocation = async (userId: string) => {
    await supabase.from("workshop_user_locations" as any).delete().eq("user_id", userId);
    await logAction("delete_location", `Deleted location for user ${userId}`);
    toast({ title: "Location Deleted" }); fetchLocations();
  };

  const deleteLogEntry = async (id: string) => {
    await supabase.from("workshop_admin_log" as any).delete().eq("id", id);
    toast({ title: "Log entry deleted" }); fetchAdminLog();
  };

  // Reply to feedback
  const replyFeedback = async (feedbackId: string) => {
    const reply = feedbackReply[feedbackId];
    if (!reply?.trim()) return;
    await supabase.from("workshop_feedback" as any).update({ admin_reply: reply } as any).eq("id", feedbackId);
    await logAction("reply_feedback", `Replied to feedback`);
    toast({ title: "Reply sent!" }); setFeedbackReply(prev => ({ ...prev, [feedbackId]: "" })); fetchFeedbacks();
  };

  // Hard Reset
  const handleHardReset = async () => {
    if (hardResetCode !== "01022006") {
      toast({ title: "Invalid code!", variant: "destructive" }); return;
    }
    try {
      await supabase.from("workshop_feedback" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("workshop_assignments" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("workshop_certificates" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("workshop_attendance" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("workshop_user_locations" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("workshop_live_sessions" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("workshop_videos" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("workshop_users" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("workshop_admin_log" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await logAction("hard_reset", "Complete workshop data reset performed");
      toast({ title: "🔴 Hard Reset Complete", description: "All workshop data has been permanently deleted." });
      setHardResetStep(0); setHardResetCode(""); fetchAll();
    } catch (err: any) { toast({ title: "Reset Error", description: err.message, variant: "destructive" }); }
  };

  const registeredOnline = users.filter((u: any) => u.student_type === "registered_online");
  const manuallyAdded = users.filter((u: any) => u.student_type === "manually_added");

  const getAttendanceStatus = (userId: string, date: string) => {
    const a = attendance.find((att: any) => att.user_id === userId && att.session_date === date);
    return a?.status || "not_marked";
  };

  // Analytics data
  const slotData = [
    { name: "12–3 PM", value: users.filter(u => u.slot === "12pm-3pm").length },
    { name: "6–9 PM", value: users.filter(u => u.slot === "6pm-9pm").length },
  ];
  const typeData = [
    { name: "Online", value: registeredOnline.length },
    { name: "Manual", value: manuallyAdded.length },
  ];
  const genderData = [
    { name: "Male", value: users.filter(u => u.gender === "male").length },
    { name: "Female", value: users.filter(u => u.gender === "female").length },
    { name: "Other", value: users.filter(u => u.gender && u.gender !== "male" && u.gender !== "female").length },
  ].filter(d => d.value > 0);
  const ageGroups = [
    { name: "<18", value: users.filter(u => u.age && u.age < 18).length },
    { name: "18-25", value: users.filter(u => u.age && u.age >= 18 && u.age <= 25).length },
    { name: "26-35", value: users.filter(u => u.age && u.age >= 26 && u.age <= 35).length },
    { name: "36+", value: users.filter(u => u.age && u.age > 35).length },
  ].filter(d => d.value > 0);
  const day1Present = attendance.filter(a => a.session_date === "2026-03-14" && a.status === "present").length;
  const day1Absent = attendance.filter(a => a.session_date === "2026-03-14" && a.status === "absent").length;
  const day2Present = attendance.filter(a => a.session_date === "2026-03-15" && a.status === "present").length;
  const day2Absent = attendance.filter(a => a.session_date === "2026-03-15" && a.status === "absent").length;
  const attendanceData = [
    { name: "Day 1", Present: day1Present, Absent: day1Absent },
    { name: "Day 2", Present: day2Present, Absent: day2Absent },
  ];
  const assignmentStatusData = [
    { name: "Submitted", value: assignments.filter(a => a.status === "submitted").length },
    { name: "Graded", value: assignments.filter(a => a.status === "graded").length },
    { name: "Pending", value: assignments.filter(a => a.status === "pending").length },
  ].filter(d => d.value > 0);
  const passFailData = [
    { name: "Pass", value: assignments.filter(a => a.pass_status === "pass").length },
    { name: "Fail", value: assignments.filter(a => a.pass_status === "fail").length },
  ].filter(d => d.value > 0);
  const feedbackRatings = [1,2,3,4,5].map(r => ({ name: `${r}★`, value: feedbacks.filter(f => f.rating === r).length }));
  const locationAllowed = locations.filter(l => l.location_allowed).length;
  const locationDenied = users.length - locationAllowed;
  const topRankers = [...assignments].filter(a => a.status === "graded" && a.marks != null).sort((a, b) => (b.marks / (b.total_marks || 100)) - (a.marks / (a.total_marks || 100)));

  // Theme classes
  const dm = darkMode;
  const bg = dm ? "bg-[#1a1625]" : "bg-gradient-to-br from-[#fdf8f3] via-[#f5efe6] to-[#faf5ef]";
  const cardBg = dm ? "bg-[#241f33]/90 border-[#3a3150]/60" : "bg-white/80 border-[#e8ddd0]/60";
  const textPrimary = dm ? "text-white" : "text-[#5a4a3a]";
  const textSecondary = dm ? "text-white/50" : "text-[#8b7b6a]";
  const textMuted = dm ? "text-white/30" : "text-[#b0a090]";
  const sidebarBg = dm ? "bg-[#16111f]/95 border-[#2a2040]" : "bg-white/90 border-[#e8ddd0]/60";
  const activeTabClass = dm ? "bg-gradient-to-r from-[#b08d57] to-[#c9a96e] text-white shadow-lg" : "bg-gradient-to-r from-[#b08d57] to-[#c9a96e] text-white shadow-md shadow-[#b08d57]/20";
  const inactiveTab = dm ? "text-white/40 hover:text-white hover:bg-white/5" : "text-[#8b7b6a] hover:text-[#5a4a3a] hover:bg-[#f0e6da]/60";
  const btnPrimary = "bg-gradient-to-r from-[#b08d57] to-[#c9a96e] hover:from-[#9e7d4a] hover:to-[#b89560] text-white shadow-md";
  const inputClass = dm ? "bg-white/5 border-white/10 text-white" : "bg-[#faf5ef] border-[#e0d4c4] text-[#5a4a3a]";

  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm transition-all ${className}`}>
      {children}
    </div>
  );

  const renderUsersList = (usersList: any[], showType = false) => (
    <>
      {usersList.map((u: any) => (
        <UserCard key={u.id} u={u} expandedUser={expandedUser} setExpandedUser={setExpandedUser}
          editingUser={editingUser} setEditingUser={setEditingUser} editData={editData} setEditData={setEditData}
          saveUserEdit={saveUserEdit} deleteUser={deleteUser} toggleUserEnabled={toggleUserEnabled}
          certUserId={certUserId} setCertUserId={setCertUserId} certFile={certFile} setCertFile={setCertFile}
          uploadCertificate={uploadCertificate} uploading={uploading}
          dm={dm} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}
          inputClass={inputClass} cardBg={cardBg} showType={showType} />
      ))}
      {usersList.length === 0 && <GlassCard><p className={`text-center ${textSecondary} py-8`}>No users found</p></GlassCard>}
    </>
  );

  return (
    <div className={`min-h-screen flex ${bg} transition-colors duration-300`}>
      {/* Sidebar - Desktop */}
      <div className={`hidden lg:flex flex-col ${sidebarBg} backdrop-blur-xl border-r sticky top-0 h-screen overflow-y-auto scrollbar-thin transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[250px]"}`}>
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CCC" className="w-10 h-10 rounded-xl border-2 border-[#b08d57]/30 shadow-sm flex-shrink-0" />
            {!collapsed && <div><h2 className={`font-bold text-sm ${textPrimary}`}>Workshop Admin</h2><p className={`text-[10px] ${textMuted}`}>Creative Caricature Club</p></div>}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${inactiveTab} flex-shrink-0`}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {sidebarItems.map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)} title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${tab === item.key ? activeTabClass : inactiveTab}`}>
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-inherit space-y-1">
          <button onClick={() => setDarkMode(!darkMode)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${inactiveTab}`} title={collapsed ? "Toggle Theme" : undefined}>
            {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          {!collapsed && <p className={`${textMuted} text-[10px] px-3`}>{getGreeting()} {adminInfo?.name?.split(" ")[0]}</p>}
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/10`} title={collapsed ? "Logout" : undefined}>
            <LogOut className="w-[18px] h-[18px]" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile Header + Scrollable Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex flex-col">
        <div className={`backdrop-blur-xl ${dm ? "bg-[#1a1625]/95" : "bg-white/90"} border-b ${dm ? "border-white/10" : "border-[#e8ddd0]"}`}>
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="CCC" className="w-8 h-8 rounded-lg border border-[#b08d57]/30" />
              <span className={`font-bold text-sm ${textPrimary}`}>Workshop Admin</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)} className={textSecondary}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500"><LogOut className="w-4 h-4" /></Button>
            </div>
          </div>
          {/* Scrollable tabs */}
          <div className="flex overflow-x-auto scrollbar-thin px-2 pb-2 gap-1">
            {sidebarItems.map((item) => (
              <button key={item.key} onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap transition-all flex-shrink-0 ${tab === item.key ? activeTabClass : inactiveTab}`}>
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 lg:p-6 pt-[100px] lg:pt-6 pb-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* DASHBOARD */}
              {tab === "dashboard" && (
                <div className="space-y-4">
                  <h1 className={`text-2xl font-bold ${textPrimary}`}>{getGreeting()} {adminInfo?.name?.split(" ")[0]}</h1>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Total Users", value: users.length, icon: Users, color: "from-[#b08d57] to-[#c9a96e]" },
                      { label: "Online Reg", value: registeredOnline.length, icon: Users, color: "from-[#7c9885] to-[#a8c0a0]" },
                      { label: "Manual Added", value: manuallyAdded.length, icon: UserPlus, color: "from-[#d4a574] to-[#e8c9a8]" },
                      { label: "Assignments", value: assignments.length, icon: FileText, color: "from-[#c9a96e] to-[#e0c590]" },
                      { label: "Videos", value: videos.length, icon: Video, color: "from-[#7c9885] to-[#9bb5a5]" },
                      { label: "Live Sessions", value: liveSessions.length, icon: Radio, color: "from-[#d98c8c] to-[#e8a8a8]" },
                      { label: "Feedbacks", value: feedbacks.filter(f => (f as any).message !== "[Google Review Click]").length, icon: MessageSquare, color: "from-[#8fa3bf] to-[#b0c4d8]" },
                      { label: "Disabled", value: users.filter(u => !u.is_enabled).length, icon: EyeOff, color: "from-[#a09080] to-[#c0b0a0]" },
                    ].map((s) => (
                      <GlassCard key={s.label} className="!p-4">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
                          <s.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className={`text-2xl font-bold ${textPrimary}`}>{s.value}</p>
                        <p className={`${textSecondary} text-xs`}>{s.label}</p>
                      </GlassCard>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <GlassCard>
                      <h3 className={`${textPrimary} font-semibold text-sm mb-3`}>📊 Slot Distribution</h3>
                      <div className="h-48"><ResponsiveContainer width="100%" height="100%"><RPieChart><Pie data={slotData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`}>{slotData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie></RPieChart></ResponsiveContainer></div>
                    </GlassCard>
                    <GlassCard>
                      <h3 className={`${textPrimary} font-semibold text-sm mb-3`}>📅 Attendance</h3>
                      <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceData}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 12 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 12 }} /><Bar dataKey="Present" fill="#7c9885" radius={[4,4,0,0]} /><Bar dataKey="Absent" fill="#d98c8c" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
                    </GlassCard>
                  </div>
                </div>
              )}

              {/* ANALYTICS */}
              {tab === "analytics" && (
                <div className="space-y-4">
                  <h1 className={`text-2xl font-bold ${textPrimary} flex items-center gap-2`}><BarChart3 className="w-6 h-6 text-[#b08d57]" /> Analytics</h1>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: "📊 Slot Distribution", chart: <RPieChart><Pie data={slotData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>{slotData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie></RPieChart> },
                      { title: "📋 Registration Type", chart: <RPieChart><Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>{typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 2]} />)}</Pie></RPieChart> },
                      { title: "👤 Gender", chart: <RPieChart><Pie data={genderData.length ? genderData : [{ name: "N/A", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{(genderData.length ? genderData : [{ name: "N/A", value: 1 }]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie></RPieChart> },
                      { title: "🎂 Age Groups", chart: <BarChart data={ageGroups.length ? ageGroups : [{ name: "N/A", value: 0 }]}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 11 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 11 }} /><Bar dataKey="value" fill="#b08d57" radius={[6,6,0,0]} /></BarChart> },
                      { title: "📅 Attendance", chart: <BarChart data={attendanceData}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 12 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 12 }} /><Bar dataKey="Present" fill="#7c9885" radius={[4,4,0,0]} /><Bar dataKey="Absent" fill="#d98c8c" radius={[4,4,0,0]} /></BarChart> },
                      { title: "📝 Assignment Status", chart: <RPieChart><Pie data={assignmentStatusData.length ? assignmentStatusData : [{ name: "N/A", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{(assignmentStatusData.length ? assignmentStatusData : [{ name: "N/A", value: 1 }]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 4]} />)}</Pie></RPieChart> },
                      { title: "✅ Pass / Fail", chart: <RPieChart><Pie data={passFailData.length ? passFailData : [{ name: "N/A", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} label>{(passFailData.length ? passFailData : [{ name: "N/A", value: 1 }]).map((_, i) => <Cell key={i} fill={i === 0 ? "#7c9885" : "#d98c8c"} />)}</Pie></RPieChart> },
                      { title: "⭐ Feedback Ratings", chart: <BarChart data={feedbackRatings}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 12 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 12 }} /><Bar dataKey="value" fill="#c9a96e" radius={[6,6,0,0]} /></BarChart> },
                      { title: "📍 Location Access", chart: <RPieChart><Pie data={[{ name: "Allowed", value: locationAllowed }, { name: "Denied", value: locationDenied }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label><Cell fill="#7c9885" /><Cell fill="#a09080" /></Pie></RPieChart> },
                      { title: "🔒 User Status", chart: <RPieChart><Pie data={[{ name: "Enabled", value: users.filter(u => u.is_enabled).length }, { name: "Disabled", value: users.filter(u => !u.is_enabled).length }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} label><Cell fill="#7c9885" /><Cell fill="#d98c8c" /></Pie></RPieChart> },
                    ].map((c, i) => (
                      <GlassCard key={i}>
                        <h3 className={`${textPrimary} font-semibold text-sm mb-3`}>{c.title}</h3>
                        <div className="h-52"><ResponsiveContainer width="100%" height="100%">{c.chart}</ResponsiveContainer></div>
                      </GlassCard>
                    ))}

                    <GlassCard>
                      <h3 className={`${textPrimary} font-semibold text-sm mb-3`}>🔗 Google Review Clicks</h3>
                      <div className="flex items-center justify-center h-52">
                        <div className="text-center">
                          <p className="text-5xl font-bold text-[#b08d57]">{feedbacks.filter(f => (f as any).google_review_clicked).length}</p>
                          <p className={`${textSecondary} text-sm mt-2`}>Total clicks</p>
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h3 className={`${textPrimary} font-semibold text-sm mb-3`}>📊 Admin Activity (7 Days)</h3>
                      <div className="h-52"><ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={(() => { const days: any[] = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().split("T")[0]; days.push({ name: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), actions: adminLog.filter(l => l.created_at?.startsWith(ds)).length }); } return days; })()}>
                          <CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} />
                          <XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 10 }} />
                          <YAxis tick={{ fill: dm ? "rgba(255,255,255,0.5)" : "#8b7b6a", fontSize: 10 }} />
                          <Area type="monotone" dataKey="actions" stroke="#b08d57" fill="rgba(176,141,87,0.2)" />
                        </AreaChart>
                      </ResponsiveContainer></div>
                    </GlassCard>

                    {/* Top Rankers */}
                    <GlassCard className="md:col-span-2">
                      <h3 className={`${textPrimary} font-semibold text-sm mb-3`}>🏆 Top Rankers</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {topRankers.length === 0 && <p className={`${textSecondary} text-sm text-center py-4`}>No graded assignments yet</p>}
                        {topRankers.map((a, i) => (
                          <div key={a.id} className={`flex items-center gap-3 ${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-xl p-3`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? "bg-[#c9a96e] text-white" : i === 1 ? "bg-[#a09080] text-white" : i === 2 ? "bg-[#8b6f47] text-white" : `${dm ? "bg-white/10 text-white/60" : "bg-[#e8ddd0] text-[#8b7b6a]"}`}`}>{i + 1}</div>
                            <div className="flex-1"><p className={`${textPrimary} font-medium text-sm`}>{a.workshop_users?.name || "User"}</p></div>
                            <div className="text-right">
                              <p className={`font-bold text-sm ${textPrimary}`}>{a.marks}/{a.total_marks || 100}</p>
                              <Badge className={`text-[9px] ${a.pass_status === "pass" ? "bg-[#7c9885]/20 text-[#5a7a65]" : "bg-[#d98c8c]/20 text-[#b06060]"}`}>{a.pass_status || "—"}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              )}

              {/* ALL USERS */}
              {tab === "all-users" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl font-bold ${textPrimary}`}>All Users ({users.length})</h1>
                    <div className="flex gap-2">
                      <ExportButton data={users.map((u: any) => ({ Name: u.name, Email: u.email, Mobile: u.mobile, Gender: u.gender || "—", Age: u.age || "—", Slot: u.slot, Type: u.student_type, Enabled: u.is_enabled }))} sheetName="Users" fileName="CCC_Workshop_Users" />
                      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                        <DialogTrigger asChild><Button size="sm" className={`${btnPrimary} rounded-xl`}><Plus className="w-4 h-4 mr-1" />Add User</Button></DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>Add Workshop User</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div><Label>Name *</Label><Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} /></div>
                            <div><Label>Mobile *</Label><Input value={newUser.mobile} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setNewUser({...newUser, mobile: d}); }} maxLength={10} /></div>
                            <div><Label>Email</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
                            <div><Label>Instagram ID</Label><Input value={newUser.instagram_id} onChange={e => setNewUser({...newUser, instagram_id: e.target.value})} /></div>
                            <div className="grid grid-cols-3 gap-3">
                              <div><Label>Age</Label><Input type="number" value={newUser.age} onChange={e => setNewUser({...newUser, age: e.target.value})} /></div>
                              <div><Label>Gender</Label><Select value={newUser.gender} onValueChange={v => setNewUser({...newUser, gender: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                              <div><Label>Profession</Label><Input value={newUser.occupation} onChange={e => setNewUser({...newUser, occupation: e.target.value})} /></div>
                            </div>
                            <div><Label>Why do they want to join?</Label><Textarea value={newUser.why_join} onChange={e => setNewUser({...newUser, why_join: e.target.value})} rows={2} /></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label>Slot *</Label><Select value={newUser.slot} onValueChange={v => setNewUser({...newUser, slot: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12 PM – 3 PM</SelectItem><SelectItem value="6pm-9pm">6 PM – 9 PM</SelectItem></SelectContent></Select></div>
                              <div><Label>Date</Label><Select value={newUser.workshop_date} onValueChange={v => setNewUser({...newUser, workshop_date: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026-03-14">14 March 2026</SelectItem><SelectItem value="2026-03-15">15 March 2026</SelectItem></SelectContent></Select></div>
                            </div>
                            <div><Label>Registration Type *</Label><Select value={newUser.student_type} onValueChange={v => setNewUser({...newUser, student_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="registered_online">Online</SelectItem><SelectItem value="manually_added">Manual</SelectItem></SelectContent></Select></div>
                            {newUser.student_type === "manually_added" && (
                              <div><Label>Payment Screenshot (optional)</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setNewUser({...newUser, payment_screenshot: e.target.files?.[0] || null})} /></div>
                            )}
                            <Button onClick={addUser} className={`w-full ${btnPrimary}`}>Add User</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  {renderUsersList(users, true)}
                </div>
              )}

              {/* REGISTERED / MANUAL USERS */}
              {(tab === "registered" || tab === "manual") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl font-bold ${textPrimary}`}>{tab === "registered" ? `Registered Users (${registeredOnline.length})` : `Manual Users (${manuallyAdded.length})`}</h1>
                    <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                      <DialogTrigger asChild><Button size="sm" className={`${btnPrimary} rounded-xl`}><Plus className="w-4 h-4 mr-1" />Add User</Button></DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Add Workshop User</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Name *</Label><Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} /></div>
                          <div><Label>Mobile *</Label><Input value={newUser.mobile} onChange={e => { const d = e.target.value.replace(/\D/g,""); if(d.length<=10) setNewUser({...newUser, mobile: d}); }} maxLength={10} /></div>
                          <div><Label>Email</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Slot *</Label><Select value={newUser.slot} onValueChange={v => setNewUser({...newUser, slot: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12–3 PM</SelectItem><SelectItem value="6pm-9pm">6–9 PM</SelectItem></SelectContent></Select></div>
                            <div><Label>Registration *</Label><Select value={newUser.student_type} onValueChange={v => setNewUser({...newUser, student_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="registered_online">Online</SelectItem><SelectItem value="manually_added">Manual</SelectItem></SelectContent></Select></div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label>Age</Label><Input type="number" value={newUser.age} onChange={e => setNewUser({...newUser, age: e.target.value})} /></div>
                            <div><Label>Gender</Label><Select value={newUser.gender} onValueChange={v => setNewUser({...newUser, gender: v})}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                            <div><Label>Profession</Label><Input value={newUser.occupation} onChange={e => setNewUser({...newUser, occupation: e.target.value})} /></div>
                          </div>
                          {newUser.student_type === "manually_added" && (
                            <div><Label>Payment Screenshot</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setNewUser({...newUser, payment_screenshot: e.target.files?.[0] || null})} /></div>
                          )}
                          <Button onClick={addUser} className={`w-full ${btnPrimary}`}>Add User</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {renderUsersList(tab === "registered" ? registeredOnline : manuallyAdded)}
                </div>
              )}

              {/* LIVE SESSIONS */}
              {tab === "live" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h1 className={`text-xl font-bold ${textPrimary}`}>Live Sessions</h1>
                    <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
                      <DialogTrigger asChild><Button size="sm" className={`${btnPrimary} rounded-xl`}><Plus className="w-4 h-4 mr-1" />Add Session</Button></DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Create Live Session</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Title *</Label><Input value={newSession.title} onChange={e => setNewSession({...newSession, title: e.target.value})} /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Date</Label><Select value={newSession.session_date} onValueChange={v => setNewSession({...newSession, session_date: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026-03-14">14 March</SelectItem><SelectItem value="2026-03-15">15 March</SelectItem></SelectContent></Select></div>
                            <div><Label>Slot</Label><Select value={newSession.slot} onValueChange={v => setNewSession({...newSession, slot: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12–3 PM</SelectItem><SelectItem value="6pm-9pm">6–9 PM</SelectItem></SelectContent></Select></div>
                          </div>
                          <div><Label>Artist Name</Label><Input value={newSession.artist_name} onChange={e => setNewSession({...newSession, artist_name: e.target.value})} /></div>
                          <div><Label>Artist Portfolio Link</Label><Input value={newSession.artist_portfolio_link} onChange={e => setNewSession({...newSession, artist_portfolio_link: e.target.value})} /></div>
                          <div><Label>Requirements</Label><Textarea value={newSession.requirements} onChange={e => setNewSession({...newSession, requirements: e.target.value})} rows={2} /></div>
                          <div><Label>What Students Learn</Label><Textarea value={newSession.what_students_learn} onChange={e => setNewSession({...newSession, what_students_learn: e.target.value})} rows={2} /></div>
                          <div><Label>Google Meet Link</Label><Input value={newSession.meet_link} onChange={e => setNewSession({...newSession, meet_link: e.target.value})} /></div>
                          <Button onClick={addLiveSession} className={`w-full ${btnPrimary}`}>Create Session</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {liveSessions.map((s: any) => (
                    <GlassCard key={s.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className={`${textPrimary} font-semibold`}>{s.title}</h3>
                            <Badge className={`text-[10px] ${s.status === "live" ? "bg-red-500 text-white animate-pulse" : s.status === "completed" ? "bg-[#7c9885]/20 text-[#5a7a65]" : `${dm ? "bg-white/10 text-white/40" : "bg-[#e8ddd0] text-[#8b7b6a]"}`}`}>{s.status}</Badge>
                            {s.link_enabled && <Badge className="text-[10px] bg-[#8fa3bf]/20 text-[#6a8aaa]">Link ON</Badge>}
                          </div>
                          <p className={`${textSecondary} text-xs`}>{new Date(s.session_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {s.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}</p>
                          {s.artist_name && <p className={`${textSecondary} text-xs mt-1`}>Artist: {s.artist_name}</p>}
                          {s.meet_link && <p className="text-[#b08d57] text-xs mt-1 truncate">{s.meet_link}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1">
                            {["upcoming", "live", "completed"].map(st => (
                              <Button key={st} size="sm" variant="ghost" onClick={() => updateSessionStatus(s.id, st)}
                                className={`h-7 px-2 text-[10px] ${s.status === st ? "bg-[#b08d57]/20 text-[#b08d57]" : textSecondary}`}>
                                {st === "upcoming" ? "⏳" : st === "live" ? "🔴" : "✅"} {st}
                              </Button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => toggleSessionLink(s.id, !s.link_enabled)}
                              className={`h-7 px-2 text-[10px] ${s.link_enabled ? "text-[#8fa3bf]" : textMuted}`}>
                              <Link2 className="w-3 h-3 mr-1" />{s.link_enabled ? "Disable" : "Enable"}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-400 h-7 px-2"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete session?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteSession(s.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                  {liveSessions.length === 0 && <GlassCard><p className={`text-center ${textSecondary} py-8`}>No live sessions</p></GlassCard>}
                </div>
              )}

              {/* VIDEOS */}
              {tab === "videos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h1 className={`text-xl font-bold ${textPrimary}`}>Video Sessions ({videos.length})</h1>
                    <Dialog open={showAddVideo} onOpenChange={setShowAddVideo}>
                      <DialogTrigger asChild><Button size="sm" className={`${btnPrimary} rounded-xl`}><Plus className="w-4 h-4 mr-1" />Add Video</Button></DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Upload Video</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Title *</Label><Input value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} /></div>
                          <div><Label>Upload Type</Label><Select value={newVideo.video_type} onValueChange={v => setNewVideo({...newVideo, video_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="link">Video Link (YouTube etc.)</SelectItem><SelectItem value="file">Upload File (Max 10GB)</SelectItem><SelectItem value="external_link">External Link</SelectItem></SelectContent></Select></div>
                          {newVideo.video_type === "file" ? (
                            <div><Label>Video File</Label><Input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} /></div>
                          ) : (
                            <div><Label>{newVideo.video_type === "external_link" ? "External URL" : "Video URL"}</Label><Input value={newVideo.video_url} onChange={e => setNewVideo({...newVideo, video_url: e.target.value})} placeholder="https://..." /></div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Date</Label><Select value={newVideo.workshop_date} onValueChange={v => setNewVideo({...newVideo, workshop_date: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026-03-14">14 March</SelectItem><SelectItem value="2026-03-15">15 March</SelectItem></SelectContent></Select></div>
                            <div><Label>Slot</Label><Select value={newVideo.slot} onValueChange={v => setNewVideo({...newVideo, slot: v})}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="12pm-3pm">12–3 PM</SelectItem><SelectItem value="6pm-9pm">6–9 PM</SelectItem></SelectContent></Select></div>
                          </div>
                          <div><Label>Expiry</Label><Input type="datetime-local" value={newVideo.expiry_date} onChange={e => setNewVideo({...newVideo, expiry_date: e.target.value})} /></div>
                          <div className="flex items-center justify-between"><Label>Allow Download</Label><Switch checked={newVideo.global_download_allowed} onCheckedChange={v => setNewVideo({...newVideo, global_download_allowed: v})} /></div>
                          <Button onClick={addVideo} disabled={uploading} className={`w-full ${btnPrimary}`}>{uploading ? "Uploading..." : "Add Video"}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {videos.map((v: any) => (
                    <GlassCard key={v.id}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`${textPrimary} font-semibold text-sm`}>{v.title}</p>
                          <p className={`${textSecondary} text-xs`}>{new Date(v.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} {v.slot && `· ${v.slot}`}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge className={`text-[9px] ${dm ? "bg-white/10 text-white/50" : "bg-[#e8ddd0] text-[#8b7b6a]"}`}>{v.video_type || "link"}</Badge>
                            {v.global_download_allowed && <Badge className="text-[9px] bg-[#7c9885]/20 text-[#5a7a65]"><Download className="w-2.5 h-2.5 mr-0.5" />Download ON</Badge>}
                          </div>
                          {v.expiry_date && <p className="text-[#c9a96e] text-xs mt-1"><Clock className="w-3 h-3 inline mr-1" />Expires: {new Date(v.expiry_date).toLocaleString("en-IN")}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => toggleVideoField(v.id, "global_download_allowed", !v.global_download_allowed)} className={`h-7 px-2 text-[10px] ${textSecondary}`}>
                              <Download className="w-3 h-3 mr-1" />{v.global_download_allowed ? "Disable DL" : "Enable DL"}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete video?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteVideo(v.id, v.title)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                  {videos.length === 0 && <GlassCard><p className={`text-center ${textSecondary} py-8`}>No videos</p></GlassCard>}
                </div>
              )}

              {/* ASSIGNMENTS */}
              {tab === "assignments" && (
                <div className="space-y-4">
                  <h1 className={`text-xl font-bold ${textPrimary}`}>Assignments ({assignments.length})</h1>
                  {assignments.map((a: any) => (
                    <AssignmentAdminCard key={a.id} assignment={a} onGrade={gradeAssignment} dm={dm} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} inputClass={inputClass} cardBg={cardBg} />
                  ))}
                  {assignments.length === 0 && <GlassCard><p className={`text-center ${textSecondary} py-8`}>No assignments</p></GlassCard>}
                </div>
              )}

              {/* CERTIFICATES */}
              {tab === "certificates" && (
                <div className="space-y-4">
                  <h1 className={`text-xl font-bold ${textPrimary}`}>Certificates</h1>
                  <GlassCard>
                    <p className={`${textSecondary} text-sm mb-3`}>Upload certificates per user from the Users tab (expand a user → Certificate button).</p>
                    <div className="flex items-center justify-between">
                      <div><p className={`${textPrimary} font-medium text-sm`}>Certificate Visibility</p><p className={`${textMuted} text-xs`}>Allow students to see certificates</p></div>
                      <Switch checked={settings.certificate_visibility?.enabled ?? false} onCheckedChange={v => toggleSetting("certificate_visibility", v)} />
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* ATTENDANCE */}
              {tab === "attendance" && (
                <div className="space-y-4">
                  <h1 className={`text-xl font-bold ${textPrimary}`}>Attendance</h1>
                  {users.map((u: any) => (
                    <GlassCard key={u.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div><p className={`${textPrimary} font-medium text-sm`}>{u.name}</p><p className={`${textSecondary} text-xs`}>{u.mobile} · {u.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}</p></div>
                        {!u.is_enabled && <Badge className="bg-[#d98c8c]/20 text-[#b06060] text-[10px]">Disabled</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {["2026-03-14", "2026-03-15"].map((date, i) => {
                          const status = getAttendanceStatus(u.id, date);
                          return (
                            <div key={date} className={`flex items-center justify-between ${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-lg p-2`}>
                              <span className={`${textSecondary} text-xs`}>Day {i+1}</span>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => markAttendance(u.id, date, "present")}
                                  className={`h-6 px-2 text-[10px] rounded ${status === "present" ? "bg-[#7c9885]/20 text-[#5a7a65]" : textMuted}`}><CheckCircle className="w-3 h-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => markAttendance(u.id, date, "absent")}
                                  className={`h-6 px-2 text-[10px] rounded ${status === "absent" ? "bg-[#d98c8c]/20 text-[#b06060]" : textMuted}`}><XCircle className="w-3 h-3" /></Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* LOCATIONS */}
              {tab === "locations" && (
                <div className="space-y-4">
                  <h1 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}><MapPin className="w-5 h-5 text-[#b08d57]" /> Locations</h1>
                  <div className="grid grid-cols-2 gap-3">
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Allowed</p><p className="text-2xl font-bold text-[#7c9885]">{locationAllowed}</p></GlassCard>
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Denied / N/A</p><p className={`text-2xl font-bold ${textMuted}`}>{locationDenied}</p></GlassCard>
                  </div>
                  {users.map((u: any) => {
                    const loc = locations.find((l: any) => l.user_id === u.id);
                    return (
                      <GlassCard key={u.id} className="!p-4">
                        <div className="flex items-center justify-between">
                          <div><p className={`${textPrimary} font-medium text-sm`}>{u.name}</p><p className={`${textSecondary} text-xs`}>{u.mobile}</p></div>
                          <div className="flex items-center gap-2">
                            {loc ? (
                              <div className="text-right">
                                <Badge className={`text-[10px] ${loc.location_allowed ? "bg-[#7c9885]/20 text-[#5a7a65]" : "bg-[#d98c8c]/20 text-[#b06060]"}`}>{loc.location_allowed ? "Allowed" : "Denied"}</Badge>
                                <p className={`${textMuted} text-[10px] mt-1`}>{loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}</p>
                                {loc.location_allowed && <a href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`} target="_blank" rel="noopener noreferrer" className="text-[#b08d57] text-[10px] flex items-center gap-0.5 justify-end mt-0.5"><Eye className="w-3 h-3" />View</a>}
                              </div>
                            ) : <Badge className={`${dm ? "bg-white/10 text-white/40" : "bg-[#e8ddd0] text-[#8b7b6a]"} text-[10px]`}>No Data</Badge>}
                            {loc && <Button variant="ghost" size="sm" className="text-red-400 h-7 px-2" onClick={() => deleteLocation(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}

              {/* FEEDBACK */}
              {tab === "feedback" && (
                <div className="space-y-4">
                  <h1 className={`text-xl font-bold ${textPrimary}`}>Feedback ({feedbacks.filter(f => f.message !== "[Google Review Click]").length})</h1>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Total Feedback</p><p className={`text-2xl font-bold ${textPrimary}`}>{feedbacks.filter(f => f.message !== "[Google Review Click]").length}</p></GlassCard>
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Google Clicks</p><p className={`text-2xl font-bold ${textPrimary}`}>{feedbacks.filter(f => f.google_review_clicked).length}</p></GlassCard>
                  </div>
                  {feedbacks.filter(f => f.message !== "[Google Review Click]").map((f: any) => (
                    <GlassCard key={f.id}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`${textPrimary} font-medium text-sm`}>{f.workshop_users?.name || "User"}</p>
                          {f.rating && <div className="flex gap-0.5 my-1">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= f.rating ? "text-[#c9a96e] fill-[#c9a96e]" : textMuted}`} />)}</div>}
                          <p className={`${dm ? "text-white/70" : "text-[#6a5a4a]"} text-sm`}>{f.message}</p>
                          <p className={`${textMuted} text-[10px] mt-1`}>{new Date(f.created_at).toLocaleString("en-IN")}</p>
                          {f.admin_reply && <div className={`mt-2 p-2 rounded-lg ${dm ? "bg-white/5" : "bg-[#faf5ef]"} border ${dm ? "border-white/10" : "border-[#e8ddd0]"}`}><p className={`${textSecondary} text-xs`}>↩️ Admin: {f.admin_reply}</p></div>}
                          <div className="mt-2 flex gap-2">
                            <Input placeholder="Reply..." value={feedbackReply[f.id] || ""} onChange={e => setFeedbackReply(prev => ({ ...prev, [f.id]: e.target.value }))} className={`${inputClass} h-8 text-xs flex-1`} />
                            <Button size="sm" onClick={() => replyFeedback(f.id)} className={`${btnPrimary} h-8 px-3 text-xs`}>Reply</Button>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete feedback?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { await supabase.from("workshop_feedback" as any).delete().eq("id", f.id); await logAction("delete_feedback", "Deleted feedback"); fetchFeedbacks(); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* SETTINGS */}
              {tab === "settings" && (
                <div className="space-y-4">
                  <h1 className={`text-xl font-bold ${textPrimary}`}>Workshop Settings</h1>

                  <GlassCard>
                    <h3 className={`${textPrimary} font-semibold text-sm mb-4`}>⚙️ General Settings</h3>
                    <div className="space-y-5">
                      {[
                        { key: "global_video_access", label: "Enable Video Access", desc: "Toggle video access for all users" },
                        { key: "global_video_download", label: "Enable Video Download", desc: "Toggle download for all users" },
                        { key: "assignment_submission_enabled", label: "Assignment Submission", desc: "Allow students to submit assignments" },
                        { key: "certificate_visibility", label: "Certificate Visibility", desc: "Show certificates to students" },
                        { key: "live_session_enabled", label: "Live Sessions", desc: "Enable live session system" },
                        { key: "feedback_visibility", label: "Feedback Page", desc: "Show feedback page to users" },
                        { key: "workshop_ended", label: "Workshop Ended", desc: "Mark workshop as complete" },
                      ].map((s) => (
                        <div key={s.key} className="flex items-center justify-between">
                          <div><p className={`${textPrimary} font-medium text-sm`}>{s.label}</p><p className={`${textMuted} text-xs`}>{s.desc}</p></div>
                          <Switch checked={settings[s.key]?.enabled ?? false} onCheckedChange={v => toggleSetting(s.key, v)} />
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Workshop Navbar Toggle */}
                  <GlassCard>
                    <h3 className={`${textPrimary} font-semibold text-sm mb-3`}>🌐 Main Website Integration</h3>
                    <div className="flex items-center justify-between">
                      <div><p className={`${textPrimary} font-medium text-sm`}>Show Workshop Button</p><p className={`${textMuted} text-xs`}>Show workshop button on main website navbar</p></div>
                      <Switch checked={settings.show_workshop_navbar?.enabled ?? false} onCheckedChange={async v => {
                        await toggleWorkshopNavbar(v);
                        await toggleSetting("show_workshop_navbar", v);
                      }} />
                    </div>
                  </GlassCard>

                  {/* Admin Management */}
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`${textPrimary} font-semibold text-sm flex items-center gap-2`}><Shield className="w-4 h-4 text-[#b08d57]" /> Admin Management</h3>
                      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
                        <DialogTrigger asChild><Button size="sm" className={`${btnPrimary} rounded-xl`}><Plus className="w-4 h-4 mr-1" />Add Admin</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Add New Admin</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div><Label>Full Name *</Label><Input value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} /></div>
                            <div><Label>Email *</Label><Input type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} /></div>
                            <div><Label>Password *</Label><Input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} /></div>
                            <Button onClick={addAdmin} className={`w-full ${btnPrimary}`}>Create Admin</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2">
                      {workshopAdmins.map((a: any) => (
                        <div key={a.id} className={`flex items-center justify-between ${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-xl p-3`}>
                          <div><p className={`${textPrimary} font-medium text-sm`}>{a.name}</p><p className={`${textSecondary} text-xs`}>{a.email}</p></div>
                          {a.user_id !== adminInfo?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove admin {a.name}?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAdmin(a.user_id, a.name)}>Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Activity History */}
                  <GlassCard>
                    <h3 className={`${textPrimary} font-semibold text-sm mb-4 flex items-center gap-2`}><History className="w-4 h-4 text-[#b08d57]" /> Activity History</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {adminLog.map((log: any) => (
                        <div key={log.id} className={`flex items-start gap-3 ${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-lg p-3`}>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b08d57]/30 to-[#c9a96e]/30 flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4 text-[#b08d57]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`${textPrimary} font-medium text-xs`}>{log.admin_name}</span>
                              <Badge className={`${dm ? "bg-white/10 text-white/60" : "bg-[#e8ddd0] text-[#8b7b6a]"} text-[9px]`}>{log.action}</Badge>
                            </div>
                            {log.details && <p className={`${textSecondary} text-xs mt-0.5`}>{log.details}</p>}
                            <p className={`${textMuted} text-[10px]`}>{new Date(log.created_at).toLocaleString("en-IN")}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="text-red-400 h-6 px-1" onClick={() => deleteLogEntry(log.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                      {adminLog.length === 0 && <p className={`${textSecondary} text-sm text-center py-4`}>No activity yet</p>}
                    </div>
                  </GlassCard>

                  {/* Hard Reset */}
                  <GlassCard className="border-red-200/50">
                    <h3 className="text-red-500 font-semibold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Danger Zone</h3>
                    {hardResetStep === 0 && (
                      <Button variant="outline" className="border-red-300 text-red-500 hover:bg-red-50" onClick={() => setHardResetStep(1)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Hard Reset - Delete All Workshop Data
                      </Button>
                    )}
                    {hardResetStep === 1 && (
                      <div className="space-y-3">
                        <p className="text-red-500 text-sm font-medium">⚠️ This will permanently delete ALL workshop data including users, videos, assignments, certificates, attendance, feedback, and admin logs.</p>
                        <p className={`${textSecondary} text-xs`}>This action cannot be undone. Are you sure?</p>
                        <div className="flex gap-2">
                          <Button variant="destructive" onClick={() => setHardResetStep(2)}>Yes, Continue</Button>
                          <Button variant="outline" onClick={() => setHardResetStep(0)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    {hardResetStep === 2 && (
                      <div className="space-y-3">
                        <p className="text-red-500 text-sm font-medium">Enter the reset code to proceed:</p>
                        <Input value={hardResetCode} onChange={e => setHardResetCode(e.target.value)} placeholder="Enter code..." className="border-red-300" maxLength={8} />
                        <div className="flex gap-2">
                          <Button variant="destructive" onClick={handleHardReset}>Execute Hard Reset</Button>
                          <Button variant="outline" onClick={() => { setHardResetStep(0); setHardResetCode(""); }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub Components ─── */

const UserCard = ({ u, expandedUser, setExpandedUser, editingUser, setEditingUser, editData, setEditData, saveUserEdit, deleteUser, toggleUserEnabled, certUserId, setCertUserId, certFile, setCertFile, uploadCertificate, uploading, dm, textPrimary, textSecondary, textMuted, inputClass, cardBg, showType }: any) => {
  const isExpanded = expandedUser === u.id;
  const isEditing = editingUser === u.id;

  const viewPaymentScreenshot = async () => {
    if (!u.payment_screenshot_path) return;
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(u.payment_screenshot_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-4 shadow-sm transition-all`}>
      {isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className={`${textSecondary} text-xs`}>Name</Label><Input value={editData.name || ""} onChange={e => setEditData({...editData, name: e.target.value})} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Email</Label><Input value={editData.email || ""} onChange={e => setEditData({...editData, email: e.target.value})} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className={`${textSecondary} text-xs`}>Mobile</Label><Input value={editData.mobile || ""} onChange={e => setEditData({...editData, mobile: e.target.value})} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Instagram</Label><Input value={editData.instagram_id || ""} onChange={e => setEditData({...editData, instagram_id: e.target.value})} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className={`${textSecondary} text-xs`}>Age</Label><Input type="number" value={editData.age || ""} onChange={e => setEditData({...editData, age: e.target.value})} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Gender</Label><Select value={editData.gender || ""} onValueChange={v => setEditData({...editData, gender: v})}><SelectTrigger className={inputClass}><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div><Label className={`${textSecondary} text-xs`}>Slot</Label><Select value={editData.slot} onValueChange={v => setEditData({...editData, slot: v})}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12–3</SelectItem><SelectItem value="6pm-9pm">6–9</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className={`${textSecondary} text-xs`}>Type</Label><Select value={editData.student_type} onValueChange={v => setEditData({...editData, student_type: v})}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="registered_online">Online</SelectItem><SelectItem value="manually_added">Manual</SelectItem></SelectContent></Select></div>
            <div><Label className={`${textSecondary} text-xs`}>Date</Label><Select value={editData.workshop_date} onValueChange={v => setEditData({...editData, workshop_date: v})}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026-03-14">14 March</SelectItem><SelectItem value="2026-03-15">15 March</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex items-center justify-between"><Label className={`${textSecondary} text-xs`}>Enabled</Label><Switch checked={editData.is_enabled ?? true} onCheckedChange={v => setEditData({...editData, is_enabled: v})} /></div>
          <div className="flex items-center justify-between"><Label className={`${textSecondary} text-xs`}>Video Download</Label><Switch checked={editData.video_download_allowed ?? false} onCheckedChange={v => setEditData({...editData, video_download_allowed: v})} /></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveUserEdit} className="bg-[#b08d57] hover:bg-[#9e7d4a] text-white"><Save className="w-4 h-4 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)} className={textSecondary}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`${textPrimary} font-semibold text-sm`}>{u.name}</p>
                {!u.is_enabled && <Badge className="bg-[#d98c8c]/20 text-[#b06060] text-[10px]">Disabled</Badge>}
                {u.gender && <Badge className={`${dm ? "bg-white/10 text-white/50" : "bg-[#e8ddd0] text-[#8b7b6a]"} text-[10px]`}>{u.gender}</Badge>}
                {showType && <Badge className={`text-[10px] ${u.student_type === "registered_online" ? "bg-[#7c9885]/20 text-[#5a7a65]" : "bg-[#c9a96e]/20 text-[#8b6f47]"}`}>{u.student_type === "registered_online" ? "Online" : "Manual"}</Badge>}
              </div>
              <p className={`${textSecondary} text-xs`}>{u.email} · {u.mobile}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge className={`${dm ? "bg-white/10 text-white/50 border-white/10" : "bg-[#e8ddd0] text-[#8b7b6a]"} text-[10px]`}>{u.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}</Badge>
                {u.age && <Badge className={`${dm ? "bg-white/10 text-white/50" : "bg-[#e8ddd0] text-[#8b7b6a]"} text-[10px]`}>Age: {u.age}</Badge>}
              </div>
            </div>
            {isExpanded ? <ChevronUp className={`w-4 h-4 ${textMuted}`} /> : <ChevronDown className={`w-4 h-4 ${textMuted}`} />}
          </div>
          {isExpanded && (
            <div className={`mt-3 pt-3 border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"} space-y-2`}>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={textSecondary}>Instagram: <span className={textPrimary}>{u.instagram_id || "—"}</span></div>
                <div className={textSecondary}>Occupation: <span className={textPrimary}>{u.occupation || "—"}</span></div>
              </div>
              {u.why_join && <p className={`${textSecondary} text-xs`}>Why join: <span className={`${dm ? "text-white/60" : "text-[#6a5a4a]"}`}>{u.why_join}</span></p>}
              {u.payment_screenshot_path && (
                <Button size="sm" variant="ghost" className="text-[#b08d57] h-7 text-xs" onClick={viewPaymentScreenshot}><Eye className="w-3 h-3 mr-1" />View Payment Screenshot</Button>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="ghost" className={`${textSecondary} hover:${textPrimary} h-7 text-xs`} onClick={() => { setEditingUser(u.id); setEditData(u); }}><Edit2 className="w-3 h-3 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" className="text-[#b08d57] h-7 text-xs" onClick={() => setCertUserId(u.id)}><Award className="w-3 h-3 mr-1" />Certificate</Button>
                <Button size="sm" variant="ghost" className={`h-7 text-xs ${u.is_enabled ? "text-[#c9a96e]" : "text-[#7c9885]"}`} onClick={() => toggleUserEnabled(u.id, !u.is_enabled, u.name)}>
                  {u.is_enabled ? <><EyeOff className="w-3 h-3 mr-1" />Disable</> : <><Eye className="w-3 h-3 mr-1" />Enable</>}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-400 h-7 text-xs"><Trash2 className="w-3 h-3 mr-1" />Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {u.name}?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteUser(u.id, u.name)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
              </div>
              {certUserId === u.id && (
                <div className={`mt-2 p-3 ${dm ? "bg-white/5 border-white/10" : "bg-[#faf5ef] border-[#e8ddd0]"} rounded-lg space-y-2 border`}>
                  <Label className={`${textSecondary} text-xs`}>Upload Certificate (PDF/Image)</Label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCertFile(e.target.files?.[0] || null)} className={inputClass} />
                  <Button size="sm" onClick={() => uploadCertificate(u.id)} disabled={!certFile || uploading} className="bg-[#b08d57] hover:bg-[#9e7d4a] text-white">
                    <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AssignmentAdminCard = ({ assignment, onGrade, dm, textPrimary, textSecondary, textMuted, inputClass, cardBg }: any) => {
  const [marks, setMarks] = useState(assignment.marks?.toString() || "");
  const [totalMarks, setTotalMarks] = useState(assignment.total_marks?.toString() || "100");
  const [notes, setNotes] = useState(assignment.admin_notes || "");
  const [passStatus, setPassStatus] = useState(assignment.pass_status || "");
  const [gradedBy, setGradedBy] = useState(assignment.graded_by_artist || "");
  const [grading, setGrading] = useState(false);

  const viewFile = async () => {
    if (!assignment.storage_path) return;
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(assignment.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`${textPrimary} font-medium text-sm`}>{assignment.workshop_users?.name || "User"}</p>
          <p className={`${textSecondary} text-xs`}>{assignment.file_name}</p>
          <p className={`${textMuted} text-[10px]`}>{assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString("en-IN") : "—"}</p>
          {assignment.graded_by_artist && <p className={`${textSecondary} text-[10px] mt-1`}>Graded by: {assignment.graded_by_artist}</p>}
        </div>
        <div className="flex gap-1 items-center">
          <Badge className={`text-[10px] ${assignment.status === "graded" ? "bg-[#7c9885]/20 text-[#5a7a65]" : "bg-[#8fa3bf]/20 text-[#6a8aaa]"}`}>{assignment.status}</Badge>
          <Button variant="ghost" size="sm" onClick={viewFile} className={textSecondary}><Eye className="w-4 h-4" /></Button>
        </div>
      </div>
      {!grading && assignment.status !== "graded" && (
        <Button size="sm" variant="ghost" onClick={() => setGrading(true)} className="mt-2 text-[#b08d57] text-xs">Grade Assignment</Button>
      )}
      {(grading || assignment.status === "graded") && (
        <div className={`space-y-2 pt-2 mt-2 border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"}`}>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className={`${textSecondary} text-xs`}>Marks</Label><Input type="number" value={marks} onChange={e => setMarks(e.target.value)} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Out of</Label><Input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Status</Label><Select value={passStatus} onValueChange={setPassStatus}><SelectTrigger className={inputClass}><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label className={`${textSecondary} text-xs`}>Graded By (Artist Name)</Label><Input value={gradedBy} onChange={e => setGradedBy(e.target.value)} className={inputClass} placeholder="Artist name" /></div>
          <div><Label className={`${textSecondary} text-xs`}>Notes / Suggestions</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} /></div>
          <Button size="sm" onClick={() => onGrade(assignment.id, parseInt(marks) || 0, notes, parseInt(totalMarks) || 100, passStatus, gradedBy)} className="bg-[#b08d57] hover:bg-[#9e7d4a] text-white">
            <Save className="w-4 h-4 mr-1" />Save Grade
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkshopAdmin;
