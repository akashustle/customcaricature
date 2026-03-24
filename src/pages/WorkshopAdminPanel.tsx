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
  ExternalLink, UsersRound, Download, RefreshCw, Search, Hash, MonitorPlay,
  Bell, Send, Lock, Reply, Monitor, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ExportButton from "@/components/admin/ExportButton";
import AdminOnlineAttendance from "@/components/admin/AdminOnlineAttendance";
import AdminWorkshopCountdown from "@/components/admin/AdminWorkshopCountdown";
import { BarChart, Bar, XAxis, YAxis, PieChart as RPieChart, Pie, Cell, CartesianGrid, ResponsiveContainer, AreaChart, Area, LineChart, Line, Tooltip, Legend, RadialBarChart, RadialBar } from "recharts";
import AdminSmartSearch from "@/components/admin/AdminSmartSearch";

const CHART_COLORS = ["#7c3aed", "#a855f7", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#6366f1"];

const sidebarItems = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "workshops", icon: GraduationCap, label: "Workshops" },
  { key: "analytics", icon: BarChart3, label: "Analytics" },
  { key: "all-users", icon: UsersRound, label: "All Users" },
  { key: "registered", icon: Users, label: "Registered" },
  { key: "manual", icon: UserPlus, label: "Manual Users" },
  { key: "live", icon: Radio, label: "Live Sessions" },
  { key: "live-requests", icon: MonitorPlay, label: "Live Requests" },
  { key: "videos", icon: Video, label: "Videos" },
  { key: "assignments", icon: FileText, label: "Assignments" },
  { key: "certificates", icon: Award, label: "Certificates" },
  { key: "attendance", icon: Calendar, label: "Attendance" },
  { key: "online-attendance", icon: Monitor, label: "Online Attendance" },
  { key: "countdown", icon: Clock, label: "Countdown" },
  { key: "locations", icon: MapPin, label: "Locations" },
  { key: "feedback", icon: MessageSquare, label: "Feedback" },
  { key: "notifications", icon: Bell, label: "Notifications" },
  { key: "log", icon: History, label: "Activity Log" },
  { key: "settings", icon: Settings, label: "Settings" },
];

const WorkshopAdmin = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [users, setUsers] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [locations, setLocations] = useState<any[]>([]);
  const [adminLog, setAdminLog] = useState<any[]>([]);
  const [workshopAdmins, setWorkshopAdmins] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [certSearchQuery, setCertSearchQuery] = useState("");
  const [certSearchResults, setCertSearchResults] = useState<any[]>([]);
  const [certUploadUserId, setCertUploadUserId] = useState<string | null>(null);
  const [certUploadFile, setCertUploadFile] = useState<File | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("8433843725");
  const [refreshing, setRefreshing] = useState(false);
  const [allWorkshops, setAllWorkshops] = useState<any[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>("current");
  const [activeWorkshopId, setActiveWorkshopId] = useState<string | null>(null);
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editVideoData, setEditVideoData] = useState<any>({});
  const [countdownTime, setCountdownTime] = useState("");
  const [countdownLabel, setCountdownLabel] = useState("Session starts in");
  const [recordedNoteUser, setRecordedNoteUser] = useState<string | null>(null);
  const [recordedNote, setRecordedNote] = useState("");
  const [assignmentViewUrl, setAssignmentViewUrl] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editSessionData, setEditSessionData] = useState<any>({});
  const [adminProfileEdit, setAdminProfileEdit] = useState(false);
  const [adminEditData, setAdminEditData] = useState({ name: "", email: "", password: "" });
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifTarget, setNotifTarget] = useState("all");
  const [notifType, setNotifType] = useState("announcement");
  const [workshopNotifications, setWorkshopNotifications] = useState<any[]>([]);
  const [feedbackReplyToUserReply, setFeedbackReplyToUserReply] = useState<{ [key: string]: string }>({});
  const [allUsersSubTabState, setAllUsersSubTabState] = useState("all");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("2026-03-14");
  const [attendanceSlotFilter, setAttendanceSlotFilter] = useState("all");

  const [newUser, setNewUser] = useState({ name: "", mobile: "", email: "", instagram_id: "", age: "", gender: "", occupation: "", why_join: "", workshop_date: "2026-03-14", slot: "12pm-3pm", student_type: "manually_added", payment_screenshot: null as File | null });
  const [newVideo, setNewVideo] = useState({ title: "", video_url: "", video_type: "link", workshop_date: "2026-03-14", slot: "", target_type: "all", expiry_date: "", global_download_allowed: false });
  const [newSession, setNewSession] = useState({ title: "", session_date: "2026-03-14", slot: "6pm-9pm", artist_name: "", artist_portfolio_link: "", requirements: "", what_students_learn: "", meet_link: "" });
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "", permissions: [] as string[] });

  useEffect(() => { localStorage.setItem("ws_dark", darkMode.toString()); }, [darkMode]);

  useEffect(() => {
    const stored = localStorage.getItem("workshop_admin");
    if (!stored) { navigate("/cccworkshop2006"); return; }
    setAdminInfo(JSON.parse(stored));
    fetchAll();
    const ch = supabase.channel("ws-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_users" }, fetchUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_videos" }, fetchVideos)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workshop_feedback" }, fetchFeedbacks)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workshop_feedback" }, (payload) => {
        setFeedbacks(prev => prev.map(f => f.id === (payload.new as any).id ? { ...f, ...(payload.new as any) } : f));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "workshop_feedback" }, fetchFeedbacks)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_assignments" }, fetchAssignments)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_live_sessions" }, fetchLiveSessions)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_attendance" }, fetchAttendance)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_user_locations" }, fetchLocations)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_admin_log" }, fetchAdminLog)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_certificates" }, fetchCertificates)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_live_session_requests" }, fetchLiveRequests)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_notifications" }, fetchWorkshopNotifications)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(), fetchVideos(), fetchFeedbacks(), fetchAssignments(), fetchLiveSessions(), fetchAttendance(), fetchSettings(), fetchLocations(), fetchAdminLog(), fetchWorkshopAdmins(), fetchCertificates(), fetchLiveRequests(), fetchWorkshopNotifications(), fetchArtists(), fetchAllWorkshops()]);
    setRefreshing(false);
  };
  const fetchAllWorkshops = async () => {
    const { data } = await supabase.from("workshops").select("*").order("created_at", { ascending: false });
    if (data) {
      setAllWorkshops(data as any[]);
      const active = (data as any[]).find(w => w.is_active);
      if (active) setActiveWorkshopId(active.id);
    }
  };

  // Get the effective workshop ID for filtering
  const getFilterWorkshopId = () => {
    if (selectedWorkshopId === "current") return activeWorkshopId;
    return selectedWorkshopId;
  };
  const fetchUsers = async () => { const { data } = await supabase.from("workshop_users" as any).select("*").order("created_at", { ascending: false }); if (data) setUsers(data as any[]); };
  const fetchVideos = async () => { const { data } = await supabase.from("workshop_videos" as any).select("*").order("created_at", { ascending: false }); if (data) setVideos(data as any[]); };
  const fetchFeedbacks = async () => { const { data } = await supabase.from("workshop_feedback" as any).select("*, workshop_users(name)").order("created_at", { ascending: false }); if (data) setFeedbacks(data as any[]); };
  const fetchAssignments = async () => { const { data } = await supabase.from("workshop_assignments" as any).select("*, workshop_users(name)").order("created_at", { ascending: false }); if (data) setAssignments(data as any[]); };
  const fetchLiveSessions = async () => { const { data } = await supabase.from("workshop_live_sessions" as any).select("*").order("session_date"); if (data) setLiveSessions(data as any[]); };
  const fetchAttendance = async () => { const { data } = await supabase.from("workshop_attendance" as any).select("*"); if (data) setAttendance(data as any[]); };
  const fetchLocations = async () => { const { data } = await supabase.from("workshop_user_locations" as any).select("*"); if (data) setLocations(data as any[]); };
  const fetchAdminLog = async () => { const { data } = await supabase.from("workshop_admin_log" as any).select("*").order("created_at", { ascending: false }).limit(100); if (data) setAdminLog(data as any[]); };
  const fetchWorkshopAdmins = async () => { const { data } = await supabase.from("workshop_admins" as any).select("*").order("created_at"); if (data) setWorkshopAdmins(data as any[]); };
  const fetchCertificates = async () => { const { data } = await supabase.from("workshop_certificates" as any).select("*"); if (data) setCertificates(data as any[]); };
  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) { const map: any = {}; (data as any[]).forEach((s: any) => { map[s.id] = s.value; }); setSettings(map); if (map.whatsapp_support_number?.number) setWhatsappNumber(map.whatsapp_support_number.number); if (map.countdown_timer?.target_time) setCountdownTime(map.countdown_timer.target_time); if (map.countdown_timer?.label) setCountdownLabel(map.countdown_timer.label); }
  };
  const fetchLiveRequests = async () => { const { data } = await supabase.from("workshop_live_session_requests" as any).select("*").order("created_at", { ascending: false }); if (data) setLiveRequests(data as any[]); };
  const fetchWorkshopNotifications = async () => { const { data } = await supabase.from("workshop_notifications" as any).select("*").order("created_at", { ascending: false }).limit(100); if (data) setWorkshopNotifications(data as any[]); };
  const fetchArtists = async () => { const { data } = await supabase.from("artists").select("*").order("name"); if (data) setArtists(data as any[]); };

  const updateLiveRequestStatus = async (request: any, status: "pending" | "allowed" | "denied", note?: string) => {
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
      admin_note: status === "denied" ? (note || request.admin_note || "Denied by admin") : null,
    };

    const { error } = await supabase
      .from("workshop_live_session_requests" as any)
      .update(payload as any)
      .eq("id", request.id);

    if (error) {
      toast({ title: "Unable to update request", description: error.message, variant: "destructive" });
      return;
    }

    await logAction("update_live_request", `${status} for ${request.user_id}`);
    toast({ title: `Request marked ${status}` });
    fetchLiveRequests();
  };

  const logAction = async (action: string, details: string) => {
    const info = JSON.parse(localStorage.getItem("workshop_admin") || "{}");
    await supabase.from("workshop_admin_log" as any).insert({ admin_id: info.id, admin_name: info.name || info.email, action, details } as any);
  };

  const handleLogout = async () => {
    await logAction("logout", "Logged out");
    localStorage.removeItem("workshop_admin");
    navigate("/cccworkshop2006");
  };

  const getGreeting = () => { const h = new Date().getHours(); if (h < 12) return "Good Morning ☀️"; if (h < 17) return "Good Afternoon 🌤️"; return "Good Evening 🌙"; };

  // Assign roll numbers to users who don't have one
  const assignRollNumbers = async () => {
    const usersWithoutRoll = users.filter(u => !u.roll_number);
    const takenNumbers = new Set(users.filter(u => u.roll_number).map(u => u.roll_number));
    for (const u of usersWithoutRoll) {
      let num: number;
      do { num = Math.floor(Math.random() * 80) + 1; } while (takenNumbers.has(num));
      takenNumbers.add(num);
      await supabase.from("workshop_users" as any).update({ roll_number: num } as any).eq("id", u.id);
    }
    if (usersWithoutRoll.length > 0) {
      toast({ title: `Assigned roll numbers to ${usersWithoutRoll.length} users` });
      fetchUsers();
    } else {
      toast({ title: "All users already have roll numbers" });
    }
  };

  // Filter users by search
  const filterUsers = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.mobile?.includes(q) ||
      u.roll_number?.toString() === q
    );
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
    // Auto assign roll number
    const takenNumbers = new Set(users.map(u => u.roll_number).filter(Boolean));
    let rollNum: number;
    do { rollNum = Math.floor(Math.random() * 80) + 1; } while (takenNumbers.has(rollNum));
    const { error } = await supabase.from("workshop_users" as any).insert({
      name: newUser.name, mobile: newUser.mobile, email: newUser.email || null,
      instagram_id: newUser.instagram_id || null, age: newUser.age ? parseInt(newUser.age) : null,
      gender: newUser.gender || null, occupation: newUser.occupation || null,
      why_join: newUser.why_join || null, workshop_date: newUser.workshop_date,
      slot: newUser.slot, student_type: newUser.student_type,
      payment_screenshot_path: paymentPath, roll_number: rollNum,
      workshop_id: activeWorkshopId || null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logAction("add_user", `Added user: ${newUser.name} (Roll #${rollNum})`);
    toast({ title: `User Added! Roll #${rollNum} ✅` });
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
    setEditingUser(null); fetchUsers();
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
        workshop_id: activeWorkshopId || null,
      } as any);
      await logAction("add_video", `Added video: ${newVideo.title}`);
      toast({ title: "Video Added! ✅" });
      setShowAddVideo(false);
      setNewVideo({ title: "", video_url: "", video_type: "link", workshop_date: "2026-03-14", slot: "", target_type: "all", expiry_date: "", global_download_allowed: false });
      setVideoFile(null); fetchVideos();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const deleteVideo = async (id: string, title: string) => { await supabase.from("workshop_videos" as any).delete().eq("id", id); await logAction("delete_video", `Deleted: ${title}`); toast({ title: "Deleted" }); fetchVideos(); };
  const toggleVideoField = async (id: string, field: string, val: any) => { await supabase.from("workshop_videos" as any).update({ [field]: val } as any).eq("id", id); await logAction("edit_video", `Updated ${field}`); toast({ title: "Updated" }); fetchVideos(); };

  // Live Session CRUD
  const addLiveSession = async () => {
    if (!newSession.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    await supabase.from("workshop_live_sessions" as any).insert({ ...newSession, workshop_id: activeWorkshopId || null } as any);
    await logAction("add_session", `Created: ${newSession.title}`);
    toast({ title: "Session Created! ✅" });
    setShowAddSession(false);
    setNewSession({ title: "", session_date: "2026-03-14", slot: "6pm-9pm", artist_name: "", artist_portfolio_link: "", requirements: "", what_students_learn: "", meet_link: "" });
    fetchLiveSessions();
  };
  const updateSessionStatus = async (id: string, status: string) => { await supabase.from("workshop_live_sessions" as any).update({ status } as any).eq("id", id); await logAction("update_session", `→ ${status}`); toast({ title: `Session: ${status}` }); fetchLiveSessions(); };
  const toggleSessionLink = async (id: string, enabled: boolean) => { await supabase.from("workshop_live_sessions" as any).update({ link_enabled: enabled } as any).eq("id", id); await logAction("toggle_link", `Link ${enabled ? "on" : "off"}`); toast({ title: enabled ? "Link ON" : "Link OFF" }); fetchLiveSessions(); };
  const deleteSession = async (id: string) => { await supabase.from("workshop_live_sessions" as any).delete().eq("id", id); await logAction("delete_session", "Deleted"); toast({ title: "Deleted" }); fetchLiveSessions(); };

  // Certificate upload by search
  const searchUserForCert = (q: string) => {
    setCertSearchQuery(q);
    if (!q.trim()) { setCertSearchResults([]); return; }
    const ql = q.toLowerCase();
    setCertSearchResults(users.filter(u => u.name?.toLowerCase().includes(ql) || u.email?.toLowerCase().includes(ql) || u.mobile?.includes(ql)).slice(0, 5));
  };

  const uploadCertificate = async (userId: string) => {
    const file = certUploadUserId === userId ? certUploadFile : certFile;
    if (!file) return;
    setUploading(true);
    try {
      const path = `certificates/${userId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("workshop-files").upload(path, file);
      if (error) throw error;
      await supabase.from("workshop_certificates" as any).insert({ user_id: userId, file_name: file.name, storage_path: path, visible: true } as any);
      await logAction("upload_cert", `Certificate for user ${userId}`);
      toast({ title: "Certificate Uploaded! ✅" });
      setCertFile(null); setCertUserId(null); setCertUploadFile(null); setCertUploadUserId(null);
      fetchCertificates();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const deleteCertificate = async (certId: string) => {
    await supabase.from("workshop_certificates" as any).delete().eq("id", certId);
    await logAction("delete_cert", "Deleted certificate");
    toast({ title: "Certificate Deleted" }); fetchCertificates();
  };

  // Assignment grading
  const gradeAssignment = async (id: string, marks: number, notes: string, totalMarks: number, passStatus: string, gradedByArtist: string) => {
    await supabase.from("workshop_assignments" as any).update({
      marks, status: "graded", graded_at: new Date().toISOString(),
      admin_notes: notes, total_marks: totalMarks, pass_status: passStatus, graded_by_artist: gradedByArtist || null,
    } as any).eq("id", id);
    await logAction("grade", `${marks}/${totalMarks}`);
    toast({ title: "Graded! ✅" }); fetchAssignments();
  };

  // Attendance with video_session option
  const markAttendance = async (userId: string, date: string, status: string) => {
    const info = JSON.parse(localStorage.getItem("workshop_admin") || "{}");
    await supabase.from("workshop_attendance" as any).upsert({
      user_id: userId, session_date: date, status, marked_by: info.id,
    } as any, { onConflict: "user_id,session_date" });
    await logAction("attendance", `${status} for ${date}`);
    toast({ title: `Marked ${status}` }); fetchAttendance();
  };

  // Settings
  const toggleSetting = async (key: string, enabled: boolean) => {
    await supabase.from("workshop_settings" as any).upsert({ id: key, value: { enabled }, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    await logAction("setting", `${key} → ${enabled}`); fetchSettings();
    toast({ title: `${key.replace(/_/g, " ")} ${enabled ? "ON" : "OFF"}` });
  };
  const toggleWorkshopNavbar = async (enabled: boolean) => {
    await supabase.from("admin_site_settings").upsert({ id: "show_workshop", value: { enabled }, updated_at: new Date().toISOString() }, { onConflict: "id" });
    await logAction("navbar", `Workshop button ${enabled ? "shown" : "hidden"}`);
  };
  const saveWhatsappNumber = async () => {
    await supabase.from("workshop_settings" as any).upsert({ id: "whatsapp_support_number", value: { number: whatsappNumber }, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
    await logAction("setting", `WhatsApp number → ${whatsappNumber}`);
    toast({ title: "WhatsApp number updated!" });
  };

  // Add Admin
  const addAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: { email: newAdmin.email, password: newAdmin.password, full_name: newAdmin.name, mobile: "0000000000", make_admin: true } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Save permissions if any
      if (newAdmin.permissions.length > 0 && data?.user_id) {
        for (const perm of newAdmin.permissions) {
          await supabase.from("admin_permissions").insert({ user_id: data.user_id, tab_id: perm, access_level: "full" });
        }
      }
      await logAction("add_admin", `Added: ${newAdmin.name} with ${newAdmin.permissions.length} permissions`);
      toast({ title: "Admin Added! ✅" }); setShowAddAdmin(false); setNewAdmin({ name: "", email: "", password: "", permissions: [] }); fetchWorkshopAdmins();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };
  const deleteAdmin = async (userId: string, name: string) => { await supabase.from("user_roles" as any).delete().eq("user_id", userId).eq("role", "admin"); await supabase.from("workshop_admins" as any).delete().eq("user_id", userId); await logAction("delete_admin", `Removed: ${name}`); toast({ title: "Admin Removed" }); fetchWorkshopAdmins(); };
  const deleteLocation = async (userId: string) => { await supabase.from("workshop_user_locations" as any).delete().eq("user_id", userId); await logAction("delete_location", `Deleted`); toast({ title: "Deleted" }); fetchLocations(); };
  const deleteLogEntry = async (id: string) => { await supabase.from("workshop_admin_log" as any).delete().eq("id", id); toast({ title: "Deleted" }); fetchAdminLog(); };
  const replyFeedback = async (feedbackId: string) => {
    const reply = feedbackReply[feedbackId];
    if (!reply?.trim()) return;
    await supabase.from("workshop_feedback" as any).update({ admin_reply: reply } as any).eq("id", feedbackId);
    await logAction("reply_feedback", "Replied");
    toast({ title: "Reply sent!" }); setFeedbackReply(prev => ({ ...prev, [feedbackId]: "" })); fetchFeedbacks();
  };

  // Reply to user reply on feedback
  const replyToUserReply = async (feedbackId: string) => {
    const reply = feedbackReplyToUserReply[feedbackId];
    if (!reply?.trim()) return;
    await supabase.from("workshop_feedback" as any).update({ admin_reply_to_user_reply: reply, admin_reply_to_user_reply_at: new Date().toISOString() } as any).eq("id", feedbackId);
    await logAction("reply_to_user_reply", "Replied to user's reply");
    toast({ title: "Reply sent!" }); setFeedbackReplyToUserReply(prev => ({ ...prev, [feedbackId]: "" })); fetchFeedbacks();
  };

  // Update live session (full edit)
  const saveSessionEdit = async () => {
    if (!editingSession) return;
    await supabase.from("workshop_live_sessions" as any).update({
      title: editSessionData.title, session_date: editSessionData.session_date, slot: editSessionData.slot,
      artist_name: editSessionData.artist_name || null, artist_portfolio_link: editSessionData.artist_portfolio_link || null,
      requirements: editSessionData.requirements || null, what_students_learn: editSessionData.what_students_learn || null,
      meet_link: editSessionData.meet_link || null, link_expiry: editSessionData.link_expiry || null,
    } as any).eq("id", editingSession);
    await logAction("edit_session", `Edited: ${editSessionData.title}`);
    toast({ title: "Session Updated! ✅" }); setEditingSession(null); fetchLiveSessions();
  };

  // Admin profile update
  const updateAdminProfile = async () => {
    const info = JSON.parse(localStorage.getItem("workshop_admin") || "{}");
    const updates: any = {};
    if (adminEditData.name.trim()) updates.name = adminEditData.name.trim();
    if (adminEditData.email.trim()) updates.email = adminEditData.email.trim();
    if (Object.keys(updates).length > 0) {
      await supabase.from("workshop_admins" as any).update(updates as any).eq("id", info.id);
      // Update local storage
      const updated = { ...info, ...updates };
      localStorage.setItem("workshop_admin", JSON.stringify(updated));
      setAdminInfo(updated);
    }
    if (adminEditData.password.trim().length >= 6) {
      try {
        const { data, error } = await supabase.functions.invoke("change-admin-password", { body: { new_password: adminEditData.password.trim(), target_user_id: info.user_id } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: "Password Updated! 🔐" });
      } catch (err: any) { toast({ title: "Password Error", description: err.message, variant: "destructive" }); }
    }
    await logAction("update_profile", `Updated profile`);
    toast({ title: "Profile Updated! ✅" });
    setAdminProfileEdit(false); fetchWorkshopAdmins();
  };

  // Send workshop notification
  const sendWorkshopNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) { toast({ title: "Title and message required", variant: "destructive" }); return; }
    const targets = notifTarget === "all" ? users : users.filter(u => u.slot === notifTarget);
    const inserts = targets.map(u => ({ user_id: u.id, title: notifTitle.trim(), message: notifMessage.trim(), type: notifType }));
    if (inserts.length === 0) { toast({ title: "No users to notify", variant: "destructive" }); return; }
    // Batch insert
    for (let i = 0; i < inserts.length; i += 50) {
      await supabase.from("workshop_notifications" as any).insert(inserts.slice(i, i + 50) as any);
    }
    await logAction("send_notification", `Sent "${notifTitle}" to ${inserts.length} users`);
    toast({ title: `Notification sent to ${inserts.length} users! 🔔` });
    setNotifTitle(""); setNotifMessage(""); fetchWorkshopNotifications();
  };

  const deleteWorkshopNotification = async (id: string) => {
    await supabase.from("workshop_notifications" as any).delete().eq("id", id);
    toast({ title: "Deleted" }); fetchWorkshopNotifications();
  };

  const handleHardReset = async () => {
    if (hardResetCode !== "01022006") { toast({ title: "Invalid code!", variant: "destructive" }); return; }
    try {
      const tables = ["workshop_feedback", "workshop_assignments", "workshop_certificates", "workshop_attendance", "workshop_user_locations", "workshop_live_sessions", "workshop_videos", "workshop_users", "workshop_admin_log"];
      for (const t of tables) await supabase.from(t as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await logAction("hard_reset", "Complete reset");
      toast({ title: "🔴 Hard Reset Complete" }); setHardResetStep(0); setHardResetCode(""); fetchAll();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  // Filter data by selected workshop — strict isolation
  const wsFilterId = selectedWorkshopId === "current" ? activeWorkshopId : selectedWorkshopId;
  const filteredUsers = wsFilterId ? users.filter(u => u.workshop_id === wsFilterId) : users;
  const filteredVideos = wsFilterId ? videos.filter((v: any) => v.workshop_id === wsFilterId) : videos;
  const filteredSessions = wsFilterId ? liveSessions.filter((s: any) => s.workshop_id === wsFilterId) : liveSessions;
  const filteredUserIds = new Set(filteredUsers.map(u => u.id));
  const filteredAssignments = wsFilterId ? assignments.filter((a: any) => filteredUserIds.has(a.user_id)) : assignments;
  const filteredFeedbacks = wsFilterId ? feedbacks.filter((f: any) => filteredUserIds.has(f.user_id)) : feedbacks;
  const filteredCertificates = wsFilterId ? certificates.filter((c: any) => filteredUserIds.has(c.user_id)) : certificates;
  const filteredAttendance = wsFilterId ? attendance.filter((a: any) => filteredUserIds.has(a.user_id)) : attendance;
  const filteredLocations = wsFilterId ? locations.filter((l: any) => filteredUserIds.has(l.user_id)) : locations;
  const filteredLiveRequests = wsFilterId ? liveRequests.filter((r: any) => filteredUserIds.has(r.user_id)) : liveRequests;

  const registeredOnline = filteredUsers.filter((u: any) => u.student_type === "registered_online");
  const manuallyAdded = filteredUsers.filter((u: any) => u.student_type === "manually_added");

  const getAttendanceStatus = (userId: string, date: string) => {
    const a = filteredAttendance.find((att: any) => att.user_id === userId && att.session_date === date);
    return a?.status || "not_marked";
  };

  // Analytics data - use filteredUsers and filteredAttendance
  const slotData = [{ name: "12–3 PM", value: filteredUsers.filter(u => u.slot === "12pm-3pm").length }, { name: "6–9 PM", value: filteredUsers.filter(u => u.slot === "6pm-9pm").length }];
  const typeData = [{ name: "Online", value: registeredOnline.length }, { name: "Manual", value: manuallyAdded.length }];
  const genderData = [{ name: "Male", value: filteredUsers.filter(u => u.gender === "male").length }, { name: "Female", value: filteredUsers.filter(u => u.gender === "female").length }, { name: "Other", value: filteredUsers.filter(u => u.gender && u.gender !== "male" && u.gender !== "female").length }].filter(d => d.value > 0);
  const ageGroups = [{ name: "<18", value: filteredUsers.filter(u => u.age && u.age < 18).length }, { name: "18-25", value: filteredUsers.filter(u => u.age && u.age >= 18 && u.age <= 25).length }, { name: "26-35", value: filteredUsers.filter(u => u.age && u.age >= 26 && u.age <= 35).length }, { name: "36+", value: filteredUsers.filter(u => u.age && u.age > 35).length }].filter(d => d.value > 0);
  const day1Present = filteredAttendance.filter(a => a.session_date === "2026-03-14" && a.status === "present").length;
  const day1Absent = filteredAttendance.filter(a => a.session_date === "2026-03-14" && a.status === "absent").length;
  const day1Video = filteredAttendance.filter(a => a.session_date === "2026-03-14" && a.status === "video_session").length;
  const day2Present = filteredAttendance.filter(a => a.session_date === "2026-03-15" && a.status === "present").length;
  const day2Absent = filteredAttendance.filter(a => a.session_date === "2026-03-15" && a.status === "absent").length;
  const day2Video = filteredAttendance.filter(a => a.session_date === "2026-03-15" && a.status === "video_session").length;
  const attendanceData = [{ name: "Day 1", Present: day1Present, Absent: day1Absent, Video: day1Video }, { name: "Day 2", Present: day2Present, Absent: day2Absent, Video: day2Video }];
  const assignmentStatusData = [{ name: "Submitted", value: filteredAssignments.filter(a => a.status === "submitted").length }, { name: "Graded", value: filteredAssignments.filter(a => a.status === "graded").length }, { name: "Pending", value: filteredAssignments.filter(a => a.status === "pending").length }].filter(d => d.value > 0);
  const passFailData = [{ name: "Pass", value: filteredAssignments.filter(a => a.pass_status === "pass").length }, { name: "Fail", value: filteredAssignments.filter(a => a.pass_status === "fail").length }].filter(d => d.value > 0);
  const feedbackRatings = [1,2,3,4,5].map(r => ({ name: `${r}★`, value: filteredFeedbacks.filter(f => f.rating === r).length }));
  const locationAllowed = filteredLocations.filter(l => l.location_allowed).length;
  const locationDenied = filteredUsers.length - locationAllowed;
  const topRankers = [...filteredAssignments].filter(a => a.status === "graded" && a.marks != null).sort((a, b) => (b.marks / (b.total_marks || 100)) - (a.marks / (a.total_marks || 100)));

  // Extra analytics
  const videoAccessData = [{ name: "Enabled", value: filteredUsers.filter(u => u.video_access_enabled !== false).length }, { name: "Disabled", value: filteredUsers.filter(u => u.video_access_enabled === false).length }];
  const certUploadData = [{ name: "Has Cert", value: [...new Set(filteredCertificates.map(c => c.user_id))].length }, { name: "No Cert", value: filteredUsers.length - [...new Set(filteredCertificates.map(c => c.user_id))].length }];
  const avgMarks = filteredAssignments.filter(a => a.marks != null).reduce((s, a) => s + (a.marks / (a.total_marks || 100)) * 100, 0) / Math.max(1, filteredAssignments.filter(a => a.marks != null).length);
  const marksDistribution = [{ name: "0-40", value: filteredAssignments.filter(a => a.marks != null && (a.marks/(a.total_marks||100))*100 <= 40).length }, { name: "41-60", value: filteredAssignments.filter(a => a.marks != null && (a.marks/(a.total_marks||100))*100 > 40 && (a.marks/(a.total_marks||100))*100 <= 60).length }, { name: "61-80", value: filteredAssignments.filter(a => a.marks != null && (a.marks/(a.total_marks||100))*100 > 60 && (a.marks/(a.total_marks||100))*100 <= 80).length }, { name: "81-100", value: filteredAssignments.filter(a => a.marks != null && (a.marks/(a.total_marks||100))*100 > 80).length }].filter(d => d.value > 0);
  const dailyRegData = (() => { const days: any[] = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().split("T")[0]; days.push({ name: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), regs: filteredUsers.filter(u => u.created_at?.startsWith(ds)).length }); } return days; })();

  // Theme
  const dm = darkMode;
  const bg = dm ? "bg-[#0f0d08]" : "bg-gradient-to-br from-slate-50 via-white to-violet-50/30";
  const cardBg = dm ? "bg-[#1e1b16]/90 border-[#3a3428]/60" : "bg-white/90 border-violet-100/60";
  const textPrimary = dm ? "text-white font-semibold" : "text-foreground font-semibold";
  const textSecondary = dm ? "text-white/60 font-medium" : "text-muted-foreground font-medium";
  const textMuted = dm ? "text-white/40" : "text-muted-foreground/70";
  const sidebarBg = dm ? "bg-[#16111f]/95 border-[#2a2040]" : "bg-white/90 border-violet-100/60";
  const activeTabClass = "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-300/30 font-bold";
  const inactiveTab = dm ? "text-white/40 hover:text-white hover:bg-white/5" : "text-muted-foreground hover:text-foreground hover:bg-violet-50";
  const btnPrimary = "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-md font-bold";
  const inputClass = dm ? "bg-white/10 border-white/20 text-white font-medium placeholder:text-white/30" : "bg-white border-violet-100 text-foreground font-medium placeholder:text-muted-foreground rounded-xl";

  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-lg shadow-violet-100/20 hover:shadow-xl transition-all ${className}`}>
      {children}
    </motion.div>
  );

  const RefreshButton = () => (
    <Button variant="outline" size="sm" onClick={fetchAll} disabled={refreshing}
      className={`rounded-xl ${dm ? "border-white/20 text-white/60 hover:bg-white/5" : "border-violet-200 text-violet-600 hover:bg-violet-50"}`}>
      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );

  const SearchBar = ({ placeholder = "Search by name, email, phone, roll#..." }: { placeholder?: string }) => (
    <div className="relative">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
      <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={placeholder}
        className={`pl-9 h-9 text-sm rounded-xl ${inputClass}`} />
    </div>
  );

  const renderUsersList = (usersList: any[], showType = false) => {
    const filtered = filterUsers(usersList);
    return (
      <>
        {filtered.map((u: any) => (
          <UserCard key={u.id} u={u} expandedUser={expandedUser} setExpandedUser={setExpandedUser}
            editingUser={editingUser} setEditingUser={setEditingUser} editData={editData} setEditData={setEditData}
            saveUserEdit={saveUserEdit} deleteUser={deleteUser} toggleUserEnabled={toggleUserEnabled}
            certUserId={certUserId} setCertUserId={setCertUserId} certFile={certFile} setCertFile={setCertFile}
            uploadCertificate={uploadCertificate} uploading={uploading}
            dm={dm} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}
            inputClass={inputClass} cardBg={cardBg} showType={showType} logAction={logAction} fetchUsers={fetchUsers} />
        ))}
        {filtered.length === 0 && <GlassCard><p className={`text-center ${textSecondary} py-8`}>{searchQuery ? "No results found" : "No users found"}</p></GlassCard>}
      </>
    );
  };

  // Workshop Switcher Component
  const WorkshopSwitcherInner = () => {
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDates, setNewDates] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [editingWs, setEditingWs] = useState<string | null>(null);
    const [editWsData, setEditWsData] = useState<any>({});

    useEffect(() => {
      fetchWorkshops();
    }, []);

    const fetchWorkshops = async () => {
      const { data } = await supabase.from("workshops").select("*").order("created_at", { ascending: false });
      if (data) setWorkshops(data as any[]);
    };

    const setActive = async (id: string) => {
      await supabase.from("workshops").update({ is_active: false } as any).neq("id", "00000000");
      await supabase.from("workshops").update({ is_active: true } as any).eq("id", id);
      setActiveWorkshopId(id);
      await logAction("switch_workshop", `Activated workshop ${id}`);
      toast({ title: "Workshop activated! ✅" });
      fetchWorkshops();
      fetchAllWorkshops();
    };

    const createWorkshop = async () => {
      if (!newTitle.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
      const { error } = await supabase.from("workshops").insert({
        title: newTitle.trim(),
        dates: newDates.trim() || "TBD",
        price: newPrice.trim() || "₹1,999",
        status: "upcoming",
        is_active: false,
      } as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      await logAction("create_workshop", `Created: ${newTitle}`);
      toast({ title: "Workshop created! ✅" });
      setCreating(false); setNewTitle(""); setNewDates(""); setNewPrice("");
      fetchWorkshops();
      fetchAllWorkshops();
    };

    const deleteWorkshop = async (id: string, title: string) => {
      await supabase.from("workshops").delete().eq("id", id);
      await logAction("delete_workshop", `Deleted: ${title}`);
      toast({ title: "Workshop deleted" });
      fetchWorkshops();
      fetchAllWorkshops();
    };

    const toggleRegistration = async (id: string, enabled: boolean) => {
      await supabase.from("workshops").update({ registration_enabled: enabled } as any).eq("id", id);
      toast({ title: enabled ? "Registration enabled" : "Registration disabled" });
      fetchWorkshops();
    };

    const saveWsEdit = async () => {
      if (!editingWs) return;
      await supabase.from("workshops").update({
        title: editWsData.title,
        dates: editWsData.dates,
        price: editWsData.price,
        status: editWsData.status,
        description: editWsData.description,
        updated_at: new Date().toISOString(),
      } as any).eq("id", editingWs);
      await logAction("edit_workshop", `Edited: ${editWsData.title}`);
      toast({ title: "Workshop updated! ✅" });
      setEditingWs(null);
      fetchWorkshops();
      fetchAllWorkshops();
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className={`text-2xl ${textPrimary}`}>🎓 Workshop Manager</h1>
          <Button onClick={() => setCreating(true)} className={btnPrimary}><Plus className="w-4 h-4 mr-1" /> New Workshop</Button>
        </div>

        {creating && (
          <GlassCard>
            <h3 className={`${textPrimary} text-sm mb-3`}>Create New Workshop</h3>
            <div className="space-y-3">
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Workshop Title" className={inputClass} />
              <div className="grid grid-cols-2 gap-3">
                <Input value={newDates} onChange={e => setNewDates(e.target.value)} placeholder="Dates (e.g. March 14-15)" className={inputClass} />
                <Input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Price (e.g. ₹1,999)" className={inputClass} />
              </div>
              <div className="flex gap-2">
                <Button onClick={createWorkshop} className={btnPrimary}>Create</Button>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          </GlassCard>
        )}

        {workshops.length === 0 ? (
          <GlassCard><p className={`text-center ${textSecondary} py-8`}>No workshops created yet</p></GlassCard>
        ) : (
          <div className="space-y-3">
            {workshops.map((ws: any) => (
              <GlassCard key={ws.id} className={ws.is_active ? "!border-green-500/40 ring-1 ring-green-500/20" : ""}>
                {editingWs === ws.id ? (
                  <div className="space-y-3">
                    <Input value={editWsData.title} onChange={e => setEditWsData({ ...editWsData, title: e.target.value })} className={inputClass} placeholder="Title" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={editWsData.dates || ""} onChange={e => setEditWsData({ ...editWsData, dates: e.target.value })} className={inputClass} placeholder="Dates" />
                      <Input value={editWsData.price || ""} onChange={e => setEditWsData({ ...editWsData, price: e.target.value })} className={inputClass} placeholder="Price" />
                    </div>
                    <Textarea value={editWsData.description || ""} onChange={e => setEditWsData({ ...editWsData, description: e.target.value })} className={inputClass} placeholder="Description" rows={2} />
                    <Select value={editWsData.status} onValueChange={v => setEditWsData({ ...editWsData, status: v })}>
                      <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveWsEdit} className={btnPrimary}><Save className="w-3 h-3 mr-1" />Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingWs(null)}><X className="w-3 h-3 mr-1" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`${textPrimary} text-lg truncate`}>{ws.title}</p>
                        {ws.is_active && <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">Active</Badge>}
                        <Badge variant="outline" className="text-xs">{ws.status}</Badge>
                      </div>
                      <p className={`${textMuted} text-xs mt-1`}>{ws.dates} · {ws.price}</p>
                      {ws.description && <p className={`${textMuted} text-xs mt-1 line-clamp-2`}>{ws.description}</p>}
                      <p className={`${textMuted} text-[10px]`}>Registration: {ws.registration_enabled ? "✅ Open" : "❌ Closed"} · Users: {users.filter(u => u.workshop_id === ws.id).length}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Label className={`text-xs ${textSecondary}`}>Registration</Label>
                        <Switch checked={ws.registration_enabled} onCheckedChange={(v) => toggleRegistration(ws.id, v)} />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setEditingWs(ws.id); setEditWsData({ title: ws.title, dates: ws.dates, price: ws.price, status: ws.status, description: ws.description }); }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {!ws.is_active && (
                        <Button size="sm" onClick={() => setActive(ws.id)} className={btnPrimary}>
                          Set Active
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{ws.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteWorkshop(ws.id, ws.title)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    );
  };

  const WorkshopSwitcher = ({ GlassCard, RefreshButton, ...props }: any) => <WorkshopSwitcherInner />;

  return (
    <div className={`min-h-screen flex ${bg} transition-colors duration-300 admin-panel-font`}>
      {/* Sidebar - Desktop */}
      <div className={`hidden lg:flex flex-col sticky top-0 h-screen overflow-y-auto scrollbar-thin transition-all duration-300 ${collapsed ? "w-[72px]" : "w-[260px]"} bg-white/80 backdrop-blur-xl border-r border-violet-100/60 shadow-sm`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-violet-100/40">
          <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-violet-200/50">
              <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
            </div>
            {!collapsed && <div><p className="text-sm font-bold tracking-tight text-foreground">Workshop Console</p><p className="text-[10px] text-muted-foreground">CCC Academy</p></div>}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-violet-50 transition-colors flex-shrink-0">
            {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {sidebarItems.map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)} title={collapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-150",
                tab === item.key
                  ? "bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 font-semibold text-violet-700 border border-violet-200/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-violet-50/60"
              )}>
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                tab === item.key ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm" : "text-muted-foreground"
              )}>
                <item.icon className="w-3.5 h-3.5" />
              </div>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {tab === item.key && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-violet-100/40 space-y-0.5">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-violet-50/60 transition-all">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-destructive hover:bg-destructive/5 transition-all">
            <LogOut className="w-4 h-4" />{!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex flex-col">
        <div className="bg-white/90 backdrop-blur-xl border-b border-violet-100/60 shadow-sm">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm border border-violet-200/40">
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">Workshop Console</span>
            </div>
            <div className="flex gap-1 items-center">
              {/* Admin Profile Avatar */}
              <button onClick={() => { setAdminProfileEdit(true); setAdminEditData({ name: adminInfo?.name || "", email: adminInfo?.email || "", password: "" }); }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {adminInfo?.name?.[0]?.toUpperCase() || "A"}
              </button>
              <Button variant="ghost" size="sm" onClick={fetchAll} className="h-8 w-8 p-0"><RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /></Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 w-8 p-0 text-destructive"><LogOut className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="px-3 pb-2">
            <AdminSmartSearch panelType="workshop"
              tabs={[{ id: "all-users", label: "All Users" }, { id: "registered", label: "Registered" }, { id: "manual", label: "Manual" }, { id: "videos", label: "Videos" }, { id: "assignments", label: "Assignments" }, { id: "feedback", label: "Feedback" }, { id: "live", label: "Live Sessions" }]}
              onNavigate={(tab, highlightId) => { setTab(tab); if (highlightId) { setTimeout(() => { const el = document.querySelector(`[data-search-id="${highlightId}"]`); if (el) { el.classList.add("search-highlight"); el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.classList.remove("search-highlight"), 4000); } }, 300); } }}
            />
          </div>
          <div className="flex overflow-x-auto scrollbar-thin px-2 pb-2 gap-0.5">
            {sidebarItems.map((item) => (
              <button key={item.key} onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-all flex-shrink-0 ${tab === item.key ? "bg-violet-100 text-violet-700 font-semibold" : "text-muted-foreground"}`}>
                <item.icon className="w-3.5 h-3.5" />{item.label}
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

              {/* WORKSHOPS SWITCHER */}
              {tab === "workshops" && (
                <WorkshopSwitcher dm={dm} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} cardBg={cardBg} inputClass={inputClass} btnPrimary={btnPrimary} GlassCard={GlassCard} RefreshButton={RefreshButton} logAction={logAction} />
              )}

              {/* DASHBOARD */}
              {tab === "dashboard" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-2xl ${textPrimary}`}>{getGreeting()} {adminInfo?.name?.split(" ")[0]}</h1>
                    <div className="flex items-center gap-2">
                      {/* Admin Profile - Desktop */}
                      <button onClick={() => { setAdminProfileEdit(true); setAdminEditData({ name: adminInfo?.name || "", email: adminInfo?.email || "", password: "" }); }}
                        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-200/50 hover:shadow-md transition-all">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {adminInfo?.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-foreground leading-none">{adminInfo?.name || "Admin"}</p>
                          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{adminInfo?.email}</p>
                        </div>
                      </button>
                      <div className="hidden lg:block w-72">
                        <AdminSmartSearch panelType="workshop"
                          tabs={[{ id: "all-users", label: "All Users" }, { id: "videos", label: "Videos" }, { id: "assignments", label: "Assignments" }, { id: "feedback", label: "Feedback" }, { id: "live", label: "Live Sessions" }]}
                          onNavigate={(t, highlightId) => { setTab(t); if (highlightId) { setTimeout(() => { const el = document.querySelector(`[data-search-id="${highlightId}"]`); if (el) { el.classList.add("search-highlight"); el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.classList.remove("search-highlight"), 4000); } }, 300); } }}
                        />
                      </div>
                      <Select value={selectedWorkshopId} onValueChange={(v) => setSelectedWorkshopId(v)}>
                        <SelectTrigger className={`w-[200px] h-9 text-sm rounded-xl ${inputClass}`}><SelectValue placeholder="Select Workshop" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">Current (Active)</SelectItem>
                          {allWorkshops.map((ws: any) => (
                            <SelectItem key={ws.id} value={ws.id}>{ws.title} {ws.is_active ? "✅" : ws.status === "upcoming" ? "🔜" : "📦"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <RefreshButton />
                    </div>
                  </div>
                  {/* 3D Stat Widgets */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Total Students", value: filteredUsers.length, icon: Users, gradient: "from-violet-500 to-violet-600", light: "from-violet-50 to-violet-100", accent: "border-l-violet-500" },
                      { label: "Online Reg", value: registeredOnline.length, icon: Users, gradient: "from-emerald-500 to-emerald-600", light: "from-emerald-50 to-emerald-100", accent: "border-l-emerald-500" },
                      { label: "Manual Added", value: manuallyAdded.length, icon: UserPlus, gradient: "from-amber-500 to-amber-600", light: "from-amber-50 to-amber-100", accent: "border-l-amber-500" },
                      { label: "Assignments", value: filteredAssignments.length, icon: FileText, gradient: "from-blue-500 to-blue-600", light: "from-blue-50 to-blue-100", accent: "border-l-blue-500" },
                      { label: "Videos", value: filteredVideos.length, icon: Video, gradient: "from-pink-500 to-pink-600", light: "from-pink-50 to-pink-100", accent: "border-l-pink-500" },
                      { label: "Live Sessions", value: filteredSessions.length, icon: Radio, gradient: "from-red-500 to-red-600", light: "from-red-50 to-red-100", accent: "border-l-red-500" },
                      { label: "Feedbacks", value: filteredFeedbacks.filter(f => f.message !== "[Google Review Click]").length, icon: MessageSquare, gradient: "from-indigo-500 to-indigo-600", light: "from-indigo-50 to-indigo-100", accent: "border-l-indigo-500" },
                      { label: "Certificates", value: filteredCertificates.length, icon: Award, gradient: "from-fuchsia-500 to-fuchsia-600", light: "from-fuchsia-50 to-fuchsia-100", accent: "border-l-fuchsia-500" },
                    ].map((s) => (
                      <motion.div key={s.label} whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 400 }}
                        className={`bg-gradient-to-br ${s.light} border border-l-4 ${s.accent} rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all`}>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-2 shadow-md`}>
                          <s.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <GlassCard>
                      <h3 className={`${textPrimary} text-sm mb-3`}>📊 Slot Distribution</h3>
                      <div className="h-48"><ResponsiveContainer width="100%" height="100%"><RPieChart><Pie data={slotData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`}>{slotData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie></RPieChart></ResponsiveContainer></div>
                    </GlassCard>
                    <GlassCard>
                      <h3 className={`${textPrimary} text-sm mb-3`}>📅 Attendance</h3>
                      <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendanceData}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 12, fontWeight: 600 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 12, fontWeight: 600 }} /><Tooltip /><Bar dataKey="Present" fill="#7c9885" radius={[4,4,0,0]} /><Bar dataKey="Absent" fill="#d98c8c" radius={[4,4,0,0]} /><Bar dataKey="Video" fill="#8fa3bf" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
                    </GlassCard>
                  </div>
                </div>
              )}

              {/* ANALYTICS */}
              {tab === "analytics" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-2xl ${textPrimary} flex items-center gap-2`}><BarChart3 className="w-6 h-6 text-[#b08d57]" /> Analytics</h1>
                    <RefreshButton />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: "📊 Slot Distribution", chart: <RPieChart><Pie data={slotData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>{slotData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie><Tooltip /></RPieChart> },
                      { title: "📋 Registration Type", chart: <RPieChart><Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label>{typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 2]} />)}</Pie><Tooltip /></RPieChart> },
                      { title: "👤 Gender", chart: <RPieChart><Pie data={genderData.length ? genderData : [{ name: "N/A", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{(genderData.length ? genderData : [{ name: "N/A", value: 1 }]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie><Tooltip /></RPieChart> },
                      { title: "🎂 Age Groups", chart: <BarChart data={ageGroups.length ? ageGroups : [{ name: "N/A", value: 0 }]}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 11, fontWeight: 600 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 11, fontWeight: 600 }} /><Tooltip /><Bar dataKey="value" fill="#b08d57" radius={[6,6,0,0]} /></BarChart> },
                      { title: "📅 Attendance", chart: <BarChart data={attendanceData}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 12, fontWeight: 600 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 12, fontWeight: 600 }} /><Tooltip /><Legend /><Bar dataKey="Present" fill="#7c9885" radius={[4,4,0,0]} /><Bar dataKey="Absent" fill="#d98c8c" radius={[4,4,0,0]} /><Bar dataKey="Video" fill="#8fa3bf" radius={[4,4,0,0]} /></BarChart> },
                      { title: "📝 Assignment Status", chart: <RPieChart><Pie data={assignmentStatusData.length ? assignmentStatusData : [{ name: "N/A", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{(assignmentStatusData.length ? assignmentStatusData : [{ name: "N/A", value: 1 }]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 4]} />)}</Pie><Tooltip /></RPieChart> },
                      { title: "✅ Pass / Fail", chart: <RPieChart><Pie data={passFailData.length ? passFailData : [{ name: "N/A", value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} label>{(passFailData.length ? passFailData : [{ name: "N/A", value: 1 }]).map((_, i) => <Cell key={i} fill={i === 0 ? "#7c9885" : "#d98c8c"} />)}</Pie><Tooltip /></RPieChart> },
                      { title: "⭐ Feedback Ratings", chart: <BarChart data={feedbackRatings}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 12, fontWeight: 600 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 12, fontWeight: 600 }} /><Tooltip /><Bar dataKey="value" fill="#c9a96e" radius={[6,6,0,0]} /></BarChart> },
                      { title: "📍 Location Access", chart: <RPieChart><Pie data={[{ name: "Allowed", value: locationAllowed }, { name: "Denied", value: locationDenied }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label><Cell fill="#7c9885" /><Cell fill="#a09080" /></Pie><Tooltip /></RPieChart> },
                      { title: "🔒 User Status", chart: <RPieChart><Pie data={[{ name: "Enabled", value: users.filter(u => u.is_enabled).length }, { name: "Disabled", value: users.filter(u => !u.is_enabled).length }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} label><Cell fill="#7c9885" /><Cell fill="#d98c8c" /></Pie><Tooltip /></RPieChart> },
                      { title: "📹 Video Access", chart: <RPieChart><Pie data={videoAccessData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{videoAccessData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 4]} />)}</Pie><Tooltip /></RPieChart> },
                      { title: "📜 Certificate Distribution", chart: <RPieChart><Pie data={certUploadData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{certUploadData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 6]} />)}</Pie><Tooltip /></RPieChart> },
                      { title: "📈 Marks Distribution", chart: <BarChart data={marksDistribution.length ? marksDistribution : [{ name: "N/A", value: 0 }]}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 11, fontWeight: 600 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 11, fontWeight: 600 }} /><Tooltip /><Bar dataKey="value" fill="#8b6f47" radius={[6,6,0,0]} /></BarChart> },
                      { title: "📊 Daily Registrations (7d)", chart: <AreaChart data={dailyRegData}><CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} /><XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 10, fontWeight: 600 }} /><YAxis tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 10, fontWeight: 600 }} /><Tooltip /><Area type="monotone" dataKey="regs" stroke="#b08d57" fill="rgba(176,141,87,0.2)" /></AreaChart> },
                    ].map((c, i) => (
                      <GlassCard key={i}>
                        <h3 className={`${textPrimary} text-sm mb-3`}>{c.title}</h3>
                        <div className="h-52"><ResponsiveContainer width="100%" height="100%">{c.chart}</ResponsiveContainer></div>
                      </GlassCard>
                    ))}

                    <GlassCard>
                      <h3 className={`${textPrimary} text-sm mb-3`}>🔗 Google Review Clicks</h3>
                      <div className="flex items-center justify-center h-52">
                        <div className="text-center"><p className="text-5xl font-bold text-[#b08d57]">{feedbacks.filter(f => f.google_review_clicked).length}</p><p className={`${textSecondary} text-sm mt-2`}>Total clicks</p></div>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h3 className={`${textPrimary} text-sm mb-3`}>📊 Avg Score</h3>
                      <div className="flex items-center justify-center h-52">
                        <div className="text-center"><p className="text-5xl font-bold text-[#b08d57]">{avgMarks.toFixed(1)}%</p><p className={`${textSecondary} text-sm mt-2`}>Average assignment score</p></div>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h3 className={`${textPrimary} text-sm mb-3`}>📊 Admin Activity (7d)</h3>
                      <div className="h-52"><ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={(() => { const days: any[] = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().split("T")[0]; days.push({ name: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), actions: adminLog.filter(l => l.created_at?.startsWith(ds)).length }); } return days; })()}>
                          <CartesianGrid strokeDasharray="3 3" stroke={dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} />
                          <XAxis dataKey="name" tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 10, fontWeight: 600 }} />
                          <YAxis tick={{ fill: dm ? "rgba(255,255,255,0.6)" : "#6a5a4a", fontSize: 10, fontWeight: 600 }} />
                          <Tooltip /><Area type="monotone" dataKey="actions" stroke="#b08d57" fill="rgba(176,141,87,0.2)" />
                        </AreaChart>
                      </ResponsiveContainer></div>
                    </GlassCard>

                    <GlassCard className="md:col-span-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`${textPrimary} text-sm`}>🏆 Top Rankers</h3>
                        <ExportButton data={topRankers.map((a, i) => ({ Rank: i + 1, Name: a.workshop_users?.name || "User", Marks: `${a.marks}/${a.total_marks || 100}`, Percent: `${((a.marks/(a.total_marks||100))*100).toFixed(1)}%`, Status: a.pass_status || "—", GradedBy: a.graded_by_artist || "—" }))} sheetName="TopRankers" fileName="CCC_TopRankers" label="Export" />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {topRankers.length === 0 && <p className={`${textSecondary} text-sm text-center py-4`}>No graded assignments</p>}
                        {topRankers.map((a, i) => (
                          <div key={a.id} className={`flex items-center gap-3 ${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-xl p-3`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${i === 0 ? "bg-[#c9a96e] text-white font-bold" : i === 1 ? "bg-[#a09080] text-white font-bold" : i === 2 ? "bg-[#8b6f47] text-white font-bold" : `${dm ? "bg-white/10 text-white/60" : "bg-[#e8ddd0] text-[#8b7b6a]"}`}`}>{i + 1}</div>
                            <div className="flex-1"><p className={`${textPrimary} text-sm`}>{a.workshop_users?.name || "User"}</p></div>
                            <div className="text-right">
                              <p className={`text-sm ${textPrimary}`}>{a.marks}/{a.total_marks || 100}</p>
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
              {tab === "all-users" && (() => {
                const [allUsersSubTab, setAllUsersSubTab] = [allUsersSubTabState, setAllUsersSubTabState];
                const subUsers = allUsersSubTab === "all" ? filteredUsers : allUsersSubTab === "slot1" ? filteredUsers.filter(u => u.slot === "12pm-3pm") : filteredUsers.filter(u => u.slot === "6pm-9pm");
                return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>All Users ({subUsers.length})</h1>
                    <div className="flex gap-2 flex-wrap">
                      <RefreshButton />
                      <Button size="sm" variant="outline" onClick={assignRollNumbers} className={`rounded-xl text-xs ${dm ? "border-white/20 text-white/60" : "border-[#d4c4b4] text-[#6a5a4a]"}`}><Hash className="w-3 h-3 mr-1" />Assign Rolls</Button>
                      <ExportButton data={subUsers.map((u: any) => ({ Roll: u.roll_number || "—", Name: u.name, Email: u.email, Mobile: u.mobile, Gender: u.gender || "—", Age: u.age || "—", Slot: u.slot, Type: u.student_type, SecretCode: u.secret_code || "—", Enabled: u.is_enabled }))} sheetName="Users" fileName="CCC_Workshop_Users" />
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
                            <div><Label>Why join?</Label><Textarea value={newUser.why_join} onChange={e => setNewUser({...newUser, why_join: e.target.value})} rows={2} /></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label>Slot *</Label><Select value={newUser.slot} onValueChange={v => setNewUser({...newUser, slot: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12–3 PM</SelectItem><SelectItem value="6pm-9pm">6–9 PM</SelectItem></SelectContent></Select></div>
                              <div><Label>Date</Label><Select value={newUser.workshop_date} onValueChange={v => setNewUser({...newUser, workshop_date: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026-03-14">14 March</SelectItem><SelectItem value="2026-03-15">15 March</SelectItem></SelectContent></Select></div>
                            </div>
                            <div><Label>Registration Type *</Label><Select value={newUser.student_type} onValueChange={v => setNewUser({...newUser, student_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="registered_online">Online</SelectItem><SelectItem value="manually_added">Manual</SelectItem></SelectContent></Select></div>
                            {newUser.student_type === "manually_added" && (
                              <div><Label>Payment Screenshot</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setNewUser({...newUser, payment_screenshot: e.target.files?.[0] || null})} /></div>
                            )}
                            <Button onClick={addUser} className={`w-full ${btnPrimary}`}>Add User</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  {/* Sub-tabs for All / Slot 1 / Slot 2 */}
                  <div className="flex gap-2">
                    {[{key:"all",label:`All (${filteredUsers.length})`},{key:"slot1",label:`Slot 1 (${filteredUsers.filter(u=>u.slot==="12pm-3pm").length})`},{key:"slot2",label:`Slot 2 (${filteredUsers.filter(u=>u.slot==="6pm-9pm").length})`}].map(st=>(
                      <button key={st.key} onClick={()=>setAllUsersSubTabState(st.key)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${allUsersSubTab===st.key ? activeTabClass : inactiveTab}`}>{st.label}</button>
                    ))}
                  </div>
                  <SearchBar />
                  {renderUsersList(subUsers, true)}
                </div>
                );
              })()}

              {/* REGISTERED / MANUAL */}
              {(tab === "registered" || tab === "manual") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>{tab === "registered" ? `Registered (${registeredOnline.length})` : `Manual (${manuallyAdded.length})`}</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={(tab === "registered" ? registeredOnline : manuallyAdded).map(u => ({ Roll: u.roll_number || "—", Name: u.name, Email: u.email, Mobile: u.mobile, Gender: u.gender || "—", Age: u.age || "—", Slot: u.slot }))} sheetName={tab === "registered" ? "Online" : "Manual"} fileName={`CCC_${tab}`} />
                    </div>
                  </div>
                  <SearchBar />
                  {renderUsersList(tab === "registered" ? registeredOnline : manuallyAdded)}
                </div>
              )}

              {/* LIVE SESSIONS */}
              {tab === "live" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>Live Sessions ({filteredSessions.length})</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={filteredSessions.map(s => ({ Title: s.title, Date: s.session_date, Slot: s.slot, Artist: s.artist_name || "—", Status: s.status }))} sheetName="Sessions" fileName="CCC_LiveSessions" />
                      <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
                        <DialogTrigger asChild><Button size="sm" className={`${btnPrimary} rounded-xl`}><Plus className="w-4 h-4 mr-1" />Add Session</Button></DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>Create Live Session</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div><Label>Title *</Label><Input value={newSession.title} onChange={e => setNewSession({...newSession, title: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label>Date</Label><Input type="date" value={newSession.session_date} onChange={e => setNewSession({...newSession, session_date: e.target.value})} /></div>
                              <div><Label>Slot</Label><Select value={newSession.slot} onValueChange={v => setNewSession({...newSession, slot: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12–3 PM</SelectItem><SelectItem value="6pm-9pm">6–9 PM</SelectItem></SelectContent></Select></div>
                            </div>
                            <div>
                              <Label>Artist</Label>
                              <Select value={newSession.artist_name} onValueChange={v => {
                                const a = artists.find(a => a.name === v);
                                setNewSession({...newSession, artist_name: v, artist_portfolio_link: a?.portfolio_url || newSession.artist_portfolio_link});
                              }}>
                                <SelectTrigger><SelectValue placeholder="Select artist or type below" /></SelectTrigger>
                                <SelectContent>
                                  {artists.map(a => <SelectItem key={a.id} value={a.name}>{a.name} {a.experience ? `(${a.experience})` : ""}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Input value={newSession.artist_name} onChange={e => setNewSession({...newSession, artist_name: e.target.value})} placeholder="Or type artist name..." className="mt-1" />
                            </div>
                            <div><Label>Artist Portfolio Link</Label><Input value={newSession.artist_portfolio_link} onChange={e => setNewSession({...newSession, artist_portfolio_link: e.target.value})} /></div>
                            <div><Label>What Students Learn</Label><Textarea value={newSession.what_students_learn} onChange={e => setNewSession({...newSession, what_students_learn: e.target.value})} rows={2} /></div>
                            <div><Label>Requirements</Label><Textarea value={newSession.requirements} onChange={e => setNewSession({...newSession, requirements: e.target.value})} rows={2} /></div>
                            <div><Label>Meet Link</Label><Input value={newSession.meet_link} onChange={e => setNewSession({...newSession, meet_link: e.target.value})} /></div>
                            <Button onClick={addLiveSession} className={`w-full ${btnPrimary}`}>Create Session</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  {filteredSessions.map((s: any) => {
                    const isEditingS = editingSession === s.id;
                    return (
                    <GlassCard key={s.id}>
                      {isEditingS ? (
                        <div className="space-y-3">
                          <div><Label className={`${textSecondary} text-xs`}>Title</Label><Input value={editSessionData.title || ""} onChange={e => setEditSessionData({...editSessionData, title: e.target.value})} className={inputClass} /></div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label className={`${textSecondary} text-xs`}>Date</Label><Input type="date" value={editSessionData.session_date || ""} onChange={e => setEditSessionData({...editSessionData, session_date: e.target.value})} className={inputClass} /></div>
                            <div><Label className={`${textSecondary} text-xs`}>Slot</Label><Select value={editSessionData.slot || "6pm-9pm"} onValueChange={v => setEditSessionData({...editSessionData, slot: v})}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12–3 PM</SelectItem><SelectItem value="6pm-9pm">6–9 PM</SelectItem></SelectContent></Select></div>
                          </div>
                          <div>
                            <Label className={`${textSecondary} text-xs`}>Artist</Label>
                            <Select value={editSessionData.artist_name || ""} onValueChange={v => {
                              const a = artists.find(a => a.name === v);
                              setEditSessionData({...editSessionData, artist_name: v, artist_portfolio_link: a?.portfolio_url || editSessionData.artist_portfolio_link || ""});
                            }}>
                              <SelectTrigger className={inputClass}><SelectValue placeholder="Select artist" /></SelectTrigger>
                              <SelectContent>
                                {artists.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input value={editSessionData.artist_name || ""} onChange={e => setEditSessionData({...editSessionData, artist_name: e.target.value})} className={`${inputClass} mt-1`} placeholder="Or type name..." />
                          </div>
                          <div><Label className={`${textSecondary} text-xs`}>Artist Portfolio Link</Label><Input value={editSessionData.artist_portfolio_link || ""} onChange={e => setEditSessionData({...editSessionData, artist_portfolio_link: e.target.value})} className={inputClass} /></div>
                          <div><Label className={`${textSecondary} text-xs`}>What Students Learn</Label><Textarea value={editSessionData.what_students_learn || ""} onChange={e => setEditSessionData({...editSessionData, what_students_learn: e.target.value})} rows={2} className={inputClass} /></div>
                          <div><Label className={`${textSecondary} text-xs`}>Requirements</Label><Textarea value={editSessionData.requirements || ""} onChange={e => setEditSessionData({...editSessionData, requirements: e.target.value})} rows={2} className={inputClass} /></div>
                          <div><Label className={`${textSecondary} text-xs`}>Meet Link</Label><Input value={editSessionData.meet_link || ""} onChange={e => setEditSessionData({...editSessionData, meet_link: e.target.value})} className={inputClass} /></div>
                          <div><Label className={`${textSecondary} text-xs`}>Link Expiry</Label><Input type="datetime-local" value={editSessionData.link_expiry ? editSessionData.link_expiry.slice(0, 16) : ""} onChange={e => setEditSessionData({...editSessionData, link_expiry: e.target.value})} className={inputClass} /></div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveSessionEdit} className="bg-[#b08d57] hover:bg-[#9e7d4a] text-white font-bold"><Save className="w-4 h-4 mr-1" />Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingSession(null)} className={textSecondary}><X className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap"><p className={`${textPrimary} text-sm`}>{s.title}</p><Badge className={`text-[10px] ${s.status === "live" ? "bg-red-500/20 text-red-500" : s.status === "completed" ? "bg-[#7c9885]/20 text-[#5a7a65]" : "bg-[#8fa3bf]/20 text-[#6a8aaa]"}`}>{s.status}</Badge></div>
                          <p className={`${textSecondary} text-xs`}>{new Date(s.session_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {s.slot}</p>
                          {s.artist_name && <p className={`${textSecondary} text-xs mt-1`}>🎨 {s.artist_name} {s.artist_portfolio_link && <a href={s.artist_portfolio_link} target="_blank" rel="noopener noreferrer" className="text-[#b08d57] ml-1">Portfolio ↗</a>}</p>}
                          {s.what_students_learn && <p className={`${textMuted} text-xs mt-1`}>📚 {s.what_students_learn}</p>}
                          {s.requirements && <p className={`${textMuted} text-xs mt-0.5`}>📋 {s.requirements}</p>}
                          {s.meet_link && <p className={`${textMuted} text-xs mt-1`}>🔗 {s.meet_link}</p>}
                          {s.link_expiry && <p className={`${textMuted} text-[10px] mt-0.5`}>⏰ Expires: {new Date(s.link_expiry).toLocaleString("en-IN")}</p>}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <div className="flex gap-1">
                            <Select value={s.status} onValueChange={v => updateSessionStatus(s.id, v)}><SelectTrigger className={`h-7 text-[10px] w-24 ${inputClass}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="completed">Done</SelectItem></SelectContent></Select>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingSession(s.id); setEditSessionData(s); }} className={`h-7 px-2 text-[10px] ${textSecondary}`}><Edit2 className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleSessionLink(s.id, !s.link_enabled)} className={`h-7 px-2 text-[10px] ${s.link_enabled ? "text-[#7c9885]" : textMuted}`}><Link2 className="w-3 h-3 mr-0.5" />{s.link_enabled ? "ON" : "OFF"}</Button>
                            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete session?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteSession(s.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                          </div>
                        </div>
                      </div>
                      )}
                    </GlassCard>
                    );
                  })}
                </div>
              )}

              {/* LIVE REQUESTS */}
              {tab === "live-requests" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>Live Session Requests ({liveRequests.length})</h1>
                    <RefreshButton />
                  </div>
                  {liveRequests.length === 0 && <GlassCard><p className={`text-center ${textSecondary} py-8`}>No requests yet</p></GlassCard>}
                  {liveRequests.map((r: any) => {
                    const u = users.find(u => u.id === r.user_id);
                    return (
                      <GlassCard key={r.id}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`${textPrimary} text-sm`}>{u?.name || "User"} {u?.roll_number && <span className={textMuted}>· #{u.roll_number}</span>}</p>
                            <p className={`${textSecondary} text-xs`}>{u?.mobile} · {u?.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}</p>
                            <p className={`${textMuted} text-[10px]`}>{new Date(r.created_at).toLocaleString("en-IN")}</p>
                            <Badge className={`mt-1 text-[10px] ${r.status === "pending" ? "bg-amber-100 text-amber-600" : r.status === "allowed" ? "bg-[#7c9885]/20 text-[#5a7a65]" : "bg-[#d98c8c]/20 text-[#b06060]"}`}>{r.status}</Badge>
                            {r.admin_note && <p className={`${textSecondary} text-xs mt-1`}>Note: {r.admin_note}</p>}
                          </div>
                          <div className="flex flex-col gap-1 min-w-[112px]">
                            <Button
                              size="sm"
                              variant={r.status === "allowed" ? "default" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => updateLiveRequestStatus(r, "allowed")}
                            >
                              Allow
                            </Button>

                            <Button
                              size="sm"
                              variant={r.status === "pending" ? "default" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => updateLiveRequestStatus(r, "pending")}
                            >
                              Pending
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant={r.status === "denied" ? "default" : "destructive"} className="h-7 text-xs">
                                  {r.status === "denied" ? "Update Deny" : "Deny"}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Deny Request for {u?.name}</DialogTitle></DialogHeader>
                                <div className="space-y-3">
                                  <div>
                                    <Label>Reason (shown to user)</Label>
                                    <Textarea id={`deny-note-${r.id}`} rows={2} placeholder="Why not allowed..." defaultValue={r.admin_note || ""} />
                                  </div>
                                  <Button
                                    variant="destructive"
                                    onClick={() => {
                                      const note = (document.getElementById(`deny-note-${r.id}`) as HTMLTextAreaElement)?.value || "";
                                      updateLiveRequestStatus(r, "denied", note);
                                    }}
                                  >
                                    Save Deny Status
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}

              {/* VIDEOS */}
              {tab === "videos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>Videos ({videos.length})</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={videos.map(v => ({ Title: v.title, Type: v.video_type, Date: v.workshop_date, Download: v.global_download_allowed ? "Yes" : "No" }))} sheetName="Videos" fileName="CCC_Videos" />
                      <Dialog open={showAddVideo} onOpenChange={setShowAddVideo}>
                        <DialogTrigger asChild><Button size="sm" className={`${btnPrimary} rounded-xl`}><Plus className="w-4 h-4 mr-1" />Add Video</Button></DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>Add Video</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div><Label>Title *</Label><Input value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} /></div>
                            <div><Label>Type</Label><Select value={newVideo.video_type} onValueChange={v => setNewVideo({...newVideo, video_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="file">📁 Upload File (max 10GB)</SelectItem><SelectItem value="embed_link">🎬 YouTube / Embed Link</SelectItem><SelectItem value="link">🔗 External Link</SelectItem></SelectContent></Select></div>
                            {newVideo.video_type === "file" ? (
                              <div><Label>Video File</Label><Input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} /></div>
                            ) : (
                              <div><Label>{newVideo.video_type === "embed_link" ? "YouTube / Embed URL" : "External URL"}</Label><Input value={newVideo.video_url} onChange={e => setNewVideo({...newVideo, video_url: e.target.value})} placeholder="https://..." /></div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label>Date</Label><Input type="date" value={newVideo.workshop_date} onChange={e => setNewVideo({...newVideo, workshop_date: e.target.value})} /></div>
                              <div><Label>Slot</Label><Select value={newVideo.slot || ""} onValueChange={v => setNewVideo({...newVideo, slot: v})}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12–3 PM</SelectItem><SelectItem value="6pm-9pm">6–9 PM</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="flex items-center justify-between"><Label>Allow Download</Label><Switch checked={newVideo.global_download_allowed} onCheckedChange={v => setNewVideo({...newVideo, global_download_allowed: v})} /></div>
                            <Button onClick={addVideo} disabled={uploading} className={`w-full ${btnPrimary}`}>{uploading ? "Uploading..." : "Add Video"}</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  {videos.map((v: any) => {
                    const isEditingV = editingVideo === v.id;
                    return (
                    <GlassCard key={v.id}>
                      {isEditingV ? (
                        <div className="space-y-3">
                          <div><Label className={`${textSecondary} text-xs`}>Title</Label><Input value={editVideoData.title || ""} onChange={e => setEditVideoData({...editVideoData, title: e.target.value})} className={inputClass} /></div>
                          <div><Label className={`${textSecondary} text-xs`}>URL</Label><Input value={editVideoData.video_url || ""} onChange={e => setEditVideoData({...editVideoData, video_url: e.target.value})} className={inputClass} /></div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label className={`${textSecondary} text-xs`}>Type</Label><Select value={editVideoData.video_type} onValueChange={val => setEditVideoData({...editVideoData, video_type: val})}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="file">File</SelectItem><SelectItem value="embed_link">YouTube/Embed</SelectItem><SelectItem value="link">External</SelectItem></SelectContent></Select></div>
                            <div><Label className={`${textSecondary} text-xs`}>Slot</Label><Select value={editVideoData.slot || ""} onValueChange={val => setEditVideoData({...editVideoData, slot: val})}><SelectTrigger className={inputClass}><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="12pm-3pm">12–3 PM</SelectItem><SelectItem value="6pm-9pm">6–9 PM</SelectItem></SelectContent></Select></div>
                          </div>
                          <div><Label className={`${textSecondary} text-xs`}>Date</Label><Input type="date" value={editVideoData.workshop_date || ""} onChange={e => setEditVideoData({...editVideoData, workshop_date: e.target.value})} className={inputClass} /></div>
                          <div className="flex items-center justify-between"><Label className={`${textSecondary} text-xs`}>Allow Download</Label><Switch checked={editVideoData.global_download_allowed ?? false} onCheckedChange={val => setEditVideoData({...editVideoData, global_download_allowed: val})} /></div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={async () => {
                              await supabase.from("workshop_videos" as any).update({ title: editVideoData.title, video_url: editVideoData.video_url, video_type: editVideoData.video_type, slot: editVideoData.slot || null, workshop_date: editVideoData.workshop_date, global_download_allowed: editVideoData.global_download_allowed } as any).eq("id", v.id);
                              await logAction("edit_video", `Edited: ${editVideoData.title}`); toast({ title: "Video Updated! ✅" }); setEditingVideo(null); fetchVideos();
                            }} className="bg-[#b08d57] hover:bg-[#9e7d4a] text-white font-bold"><Save className="w-4 h-4 mr-1" />Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingVideo(null)} className={textSecondary}><X className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`${textPrimary} text-sm`}>{v.title}</p>
                          <p className={`${textSecondary} text-xs`}>{new Date(v.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} {v.slot && `· ${v.slot}`}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge className={`text-[9px] ${dm ? "bg-white/10 text-white/60" : "bg-[#e8ddd0] text-[#6a5a4a]"}`}>{v.video_type || "link"}</Badge>
                            {v.global_download_allowed && <Badge className="text-[9px] bg-[#7c9885]/20 text-[#5a7a65]"><Download className="w-2.5 h-2.5 mr-0.5" />Download ON</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingVideo(v.id); setEditVideoData(v); }} className={`h-7 px-2 text-[10px] ${textSecondary}`}><Edit2 className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleVideoField(v.id, "global_download_allowed", !v.global_download_allowed)} className={`h-7 px-2 text-[10px] ${textSecondary}`}><Download className="w-3 h-3 mr-1" />{v.global_download_allowed ? "Off" : "On"}</Button>
                          <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteVideo(v.id, v.title)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                        </div>
                      </div>
                      )}
                    </GlassCard>
                    );
                  })}
                </div>
              )}

              {/* ASSIGNMENTS */}
              {tab === "assignments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>Assignments ({assignments.length})</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={assignments.map(a => ({ Name: a.workshop_users?.name || "User", Status: a.status, Marks: a.marks != null ? `${a.marks}/${a.total_marks || 100}` : "—", PassFail: a.pass_status || "—", GradedBy: a.graded_by_artist || "—", Notes: a.admin_notes || "—" }))} sheetName="Assignments" fileName="CCC_Assignments" />
                    </div>
                  </div>
                  {assignments.map((a: any) => (
                    <AssignmentAdminCard key={a.id} assignment={a} onGrade={gradeAssignment} dm={dm} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} inputClass={inputClass} cardBg={cardBg} />
                  ))}
                  {assignments.length === 0 && <GlassCard><p className={`text-center ${textSecondary} py-8`}>No assignments</p></GlassCard>}
                </div>
              )}

              {/* CERTIFICATES */}
              {tab === "certificates" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>Certificates</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={certificates.map(c => { const u = users.find(u => u.id === c.user_id); return { Name: u?.name || "—", File: c.file_name, UploadedAt: new Date(c.created_at).toLocaleString("en-IN") }; })} sheetName="Certificates" fileName="CCC_Certificates" />
                    </div>
                  </div>
                  {/* Upload certificate by searching user */}
                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3`}>📜 Upload Certificate</h3>
                    <div className="space-y-3">
                      <Input placeholder="Search user by name, email, phone..." value={certSearchQuery} onChange={e => searchUserForCert(e.target.value)} className={`${inputClass} h-9 text-sm`} />
                      {certSearchResults.length > 0 && (
                        <div className="space-y-1">
                          {certSearchResults.map(u => (
                            <button key={u.id} onClick={() => { setCertUploadUserId(u.id); setCertSearchQuery(u.name); setCertSearchResults([]); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${certUploadUserId === u.id ? activeTabClass : `${dm ? "bg-white/5 hover:bg-white/10" : "bg-[#faf5ef] hover:bg-[#f0e6da]"}`} ${textPrimary}`}>
                              {u.name} · {u.mobile} {u.roll_number && `· Roll #${u.roll_number}`}
                            </button>
                          ))}
                        </div>
                      )}
                      {certUploadUserId && (
                        <div className="space-y-2">
                          <Label className={`${textSecondary} text-xs`}>Certificate File (PDF/Image) – Multiple allowed</Label>
                          <Input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={e => setCertUploadFile(e.target.files?.[0] || null)} className={inputClass} />
                          <Button size="sm" onClick={() => uploadCertificate(certUploadUserId)} disabled={!certUploadFile || uploading} className={btnPrimary}>
                            <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading..." : "Upload Certificate"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                  <GlassCard>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`${textPrimary} text-sm`}>Certificate Visibility</p>
                      <Switch checked={settings.certificate_visibility?.enabled ?? false} onCheckedChange={v => toggleSetting("certificate_visibility", v)} />
                    </div>
                  </GlassCard>
                  {/* List uploaded certificates */}
                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3`}>Uploaded Certificates ({certificates.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {certificates.map((c: any) => {
                        const u = users.find(u => u.id === c.user_id);
                        return (
                          <div key={c.id} className={`flex items-center justify-between ${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-lg p-3`}>
                            <div>
                              <p className={`${textPrimary} text-sm`}>{u?.name || "User"} {u?.roll_number && <span className={textMuted}>· Roll #{u.roll_number}</span>}</p>
                              <p className={`${textSecondary} text-xs`}>{c.file_name}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className={`${textSecondary} h-7`} onClick={async () => { const { data } = await supabase.storage.from("workshop-files").createSignedUrl(c.storage_path, 3600); if (data?.signedUrl) window.open(data.signedUrl, "_blank"); }}><Eye className="w-3.5 h-3.5" /></Button>
                              <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400 h-7"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete certificate?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteCertificate(c.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                      {certificates.length === 0 && <p className={`${textSecondary} text-sm text-center py-4`}>No certificates uploaded</p>}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* ATTENDANCE */}
              {tab === "attendance" && (() => {
                const attDateFilter = attendanceDateFilter;
                const attSlotFilter = attendanceSlotFilter;
                const filteredAttUsers = users.filter(u => {
                  if (attSlotFilter !== "all" && u.slot !== attSlotFilter) return false;
                  return true;
                });
                const filteredSearchedUsers = filterUsers(filteredAttUsers);
                const s1Users = filteredAttUsers.filter(u => u.slot === "12pm-3pm");
                const s2Users = filteredAttUsers.filter(u => u.slot === "6pm-9pm");
                const s1Present = s1Users.filter(u => getAttendanceStatus(u.id, attDateFilter) === "present").length;
                const s1Absent = s1Users.filter(u => getAttendanceStatus(u.id, attDateFilter) === "absent").length;
                const s1Video = s1Users.filter(u => getAttendanceStatus(u.id, attDateFilter) === "video_session").length;
                const s1NotMarked = s1Users.length - s1Present - s1Absent - s1Video;
                const s2Present = s2Users.filter(u => getAttendanceStatus(u.id, attDateFilter) === "present").length;
                const s2Absent = s2Users.filter(u => getAttendanceStatus(u.id, attDateFilter) === "absent").length;
                const s2Video = s2Users.filter(u => getAttendanceStatus(u.id, attDateFilter) === "video_session").length;
                const s2NotMarked = s2Users.length - s2Present - s2Absent - s2Video;
                return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>Attendance</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={filteredSearchedUsers.map(u => ({ Roll: u.roll_number || "—", Name: u.name, Mobile: u.mobile, Slot: u.slot, Day1: getAttendanceStatus(u.id, "2026-03-14"), Day2: getAttendanceStatus(u.id, "2026-03-15") }))} sheetName="Attendance" fileName="CCC_Attendance" />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={attDateFilter} onValueChange={v => setAttendanceDateFilter(v)}>
                      <SelectTrigger className={`w-44 ${inputClass}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2026-03-14">14 March 2026</SelectItem>
                        <SelectItem value="2026-03-15">15 March 2026</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={attSlotFilter} onValueChange={v => setAttendanceSlotFilter(v)}>
                      <SelectTrigger className={`w-44 ${inputClass}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Slots</SelectItem>
                        <SelectItem value="12pm-3pm">Slot 1 (12-3)</SelectItem>
                        <SelectItem value="6pm-9pm">Slot 2 (6-9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <h3 className={`${textPrimary} text-sm`}>📊 Slot 1 — 12 PM to 3 PM</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Present", value: s1Present, color: "from-[#7c9885] to-[#a8c0a0]", icon: CheckCircle },
                        { label: "Absent", value: s1Absent, color: "from-[#d98c8c] to-[#e8a8a8]", icon: XCircle },
                        { label: "Video", value: s1Video, color: "from-[#8fa3bf] to-[#b0c4d8]", icon: MonitorPlay },
                        { label: "Not Marked", value: s1NotMarked, color: "from-[#a09080] to-[#c0b0a0]", icon: Clock },
                      ].map(w => (
                        <GlassCard key={w.label + "s1"} className="!p-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${w.color} flex items-center justify-center mb-1`}><w.icon className="w-4 h-4 text-white" /></div>
                          <p className={`text-xl ${textPrimary}`}>{w.value}</p>
                          <p className={`${textMuted} text-[10px]`}>{w.label}</p>
                        </GlassCard>
                      ))}
                    </div>
                    <h3 className={`${textPrimary} text-sm`}>📊 Slot 2 — 6 PM to 9 PM</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Present", value: s2Present, color: "from-[#7c9885] to-[#a8c0a0]", icon: CheckCircle },
                        { label: "Absent", value: s2Absent, color: "from-[#d98c8c] to-[#e8a8a8]", icon: XCircle },
                        { label: "Video", value: s2Video, color: "from-[#8fa3bf] to-[#b0c4d8]", icon: MonitorPlay },
                        { label: "Not Marked", value: s2NotMarked, color: "from-[#a09080] to-[#c0b0a0]", icon: Clock },
                      ].map(w => (
                        <GlassCard key={w.label + "s2"} className="!p-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${w.color} flex items-center justify-center mb-1`}><w.icon className="w-4 h-4 text-white" /></div>
                          <p className={`text-xl ${textPrimary}`}>{w.value}</p>
                          <p className={`${textMuted} text-[10px]`}>{w.label}</p>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                  <SearchBar />
                  {filteredSearchedUsers.map((u: any) => (
                    <GlassCard key={u.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className={`${textPrimary} text-sm`}>{u.name} {u.roll_number && <span className={textMuted}>· #{u.roll_number}</span>}</p>
                          <p className={`${textSecondary} text-xs`}>{u.mobile} · {u.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}</p>
                        </div>
                        {!u.is_enabled && <Badge className="bg-[#d98c8c]/20 text-[#b06060] text-[10px]">Disabled</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {["2026-03-14", "2026-03-15"].map((date, i) => {
                          const status = getAttendanceStatus(u.id, date);
                          return (
                            <div key={date} className={`${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-lg p-2`}>
                              <span className={`${textSecondary} text-xs block mb-1`}>Day {i+1}</span>
                              <div className="flex gap-1 flex-wrap">
                                <Button size="sm" variant="ghost" onClick={() => markAttendance(u.id, date, "present")}
                                  className={`h-6 px-2 text-[10px] rounded ${status === "present" ? "bg-[#7c9885]/20 text-[#5a7a65] font-bold" : textMuted}`}><CheckCircle className="w-3 h-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => markAttendance(u.id, date, "absent")}
                                  className={`h-6 px-2 text-[10px] rounded ${status === "absent" ? "bg-[#d98c8c]/20 text-[#b06060] font-bold" : textMuted}`}><XCircle className="w-3 h-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => markAttendance(u.id, date, "video_session")}
                                  className={`h-6 px-2 text-[10px] rounded ${status === "video_session" ? "bg-[#8fa3bf]/20 text-[#6a8aaa] font-bold" : textMuted}`}><MonitorPlay className="w-3 h-3" /></Button>
                                {status !== "not_marked" && (
                                  <Button size="sm" variant="ghost" onClick={() => markAttendance(u.id, date, "not_marked")}
                                    className={`h-6 px-2 text-[10px] rounded ${textMuted}`}><X className="w-3 h-3" /></Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </GlassCard>
                  ))}
                </div>
                );
              })()}

              {/* ONLINE ATTENDANCE */}
              {tab === "online-attendance" && <AdminOnlineAttendance />}

              {/* COUNTDOWN */}
              {tab === "countdown" && <AdminWorkshopCountdown />}

              {/* LOCATIONS */}
              {tab === "locations" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary} flex items-center gap-2`}><MapPin className="w-5 h-5 text-[#b08d57]" /> Locations</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={users.map(u => { const loc = locations.find(l => l.user_id === u.id); return { Name: u.name, Mobile: u.mobile, Allowed: loc?.location_allowed ? "Yes" : "No", Lat: loc?.lat?.toFixed(4) || "—", Lng: loc?.lng?.toFixed(4) || "—" }; })} sheetName="Locations" fileName="CCC_Locations" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Allowed</p><p className="text-2xl font-bold text-[#7c9885]">{locationAllowed}</p></GlassCard>
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Denied</p><p className={`text-2xl font-bold ${textMuted}`}>{locationDenied}</p></GlassCard>
                  </div>
                  {users.map((u: any) => {
                    const loc = locations.find((l: any) => l.user_id === u.id);
                    return (
                      <GlassCard key={u.id} className="!p-4">
                        <div className="flex items-center justify-between">
                          <div><p className={`${textPrimary} text-sm`}>{u.name}</p><p className={`${textSecondary} text-xs`}>{u.mobile}</p></div>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>Feedback ({feedbacks.filter(f => f.message !== "[Google Review Click]").length})</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={feedbacks.filter(f => f.message !== "[Google Review Click]").map(f => ({ User: f.workshop_users?.name || "—", Rating: f.rating || "—", Message: f.message, AdminReply: f.admin_reply || "—", Date: new Date(f.created_at).toLocaleString("en-IN") }))} sheetName="Feedback" fileName="CCC_Feedback" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Total</p><p className={`text-2xl font-bold ${textPrimary}`}>{feedbacks.filter(f => f.message !== "[Google Review Click]").length}</p></GlassCard>
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Google Clicks</p><p className={`text-2xl font-bold ${textPrimary}`}>{feedbacks.filter(f => f.google_review_clicked).length}</p></GlassCard>
                  </div>
                  {feedbacks.filter(f => f.message !== "[Google Review Click]").map((f: any) => (
                    <GlassCard key={f.id}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`${textPrimary} text-sm`}>{f.workshop_users?.name || "User"}</p>
                          {f.rating && <div className="flex gap-0.5 my-1">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= f.rating ? "text-[#c9a96e] fill-[#c9a96e]" : textMuted}`} />)}</div>}
                          <p className={`${dm ? "text-white/70" : "text-[#5a4a3a]"} text-sm font-medium`}>{f.message}</p>
                          <p className={`${textMuted} text-[10px] mt-1`}>{new Date(f.created_at).toLocaleString("en-IN")}</p>
                          
                          {/* Admin reply */}
                          {f.admin_reply && (
                            <div className={`mt-2 p-2 rounded-lg ${dm ? "bg-white/5" : "bg-[#faf5ef]"} border ${dm ? "border-white/10" : "border-[#e8ddd0]"}`}>
                              <p className={`${textSecondary} text-xs`}>↩️ <strong>Your Reply:</strong> {f.admin_reply}</p>
                            </div>
                          )}

                          {/* User reply - highlighted prominently */}
                          {f.user_reply && (
                            <div className={`mt-2 p-2 rounded-lg ${dm ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"} border`}>
                              <p className="text-xs font-bold text-blue-600 flex items-center gap-1"><Reply className="w-3 h-3" /> {f.workshop_users?.name || "User"} replied:</p>
                              <p className={`text-xs mt-0.5 ${dm ? "text-blue-300" : "text-blue-700"} font-medium`}>{f.user_reply}</p>
                              <p className={`${textMuted} text-[10px] mt-0.5`}>{f.user_reply_at ? new Date(f.user_reply_at).toLocaleString("en-IN") : ""}</p>
                              
                              {/* Admin reply to user reply */}
                              {f.admin_reply_to_user_reply && (
                                <div className={`mt-1.5 pl-2 border-l-2 ${dm ? "border-[#b08d57]/50" : "border-[#b08d57]/30"}`}>
                                  <p className={`text-[10px] font-bold text-[#b08d57]`}>↩️ You replied:</p>
                                  <p className={`${textSecondary} text-xs`}>{f.admin_reply_to_user_reply}</p>
                                </div>
                              )}
                              
                              {/* Reply to user reply input */}
                              {!f.admin_reply_to_user_reply && (
                                <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()}>
                                  <Input placeholder="Reply to user..." value={feedbackReplyToUserReply[f.id] || ""} onChange={e => setFeedbackReplyToUserReply(prev => ({ ...prev, [f.id]: e.target.value }))} className={`${inputClass} h-7 text-xs flex-1`} autoComplete="off" />
                                  <Button size="sm" onClick={() => replyToUserReply(f.id)} className="bg-blue-500 hover:bg-blue-400 text-white h-7 px-3 text-xs font-bold"><Send className="w-3 h-3" /></Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Admin reply / edit input */}
                          <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                            <Input placeholder={f.admin_reply ? "Edit reply..." : "Reply..."} value={feedbackReply[f.id] ?? (f.admin_reply || "")} onChange={e => setFeedbackReply(prev => ({ ...prev, [f.id]: e.target.value }))} className={`${inputClass} h-8 text-xs flex-1`} autoComplete="off" />
                            <Button size="sm" onClick={() => replyFeedback(f.id)} className={`${btnPrimary} h-8 px-3 text-xs`}>{f.admin_reply ? "Update" : "Reply"}</Button>
                          </div>
                        </div>
                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this feedback.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { await supabase.from("workshop_feedback" as any).delete().eq("id", f.id); await logAction("delete_feedback", "Deleted"); fetchFeedbacks(); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* NOTIFICATIONS */}
              {tab === "notifications" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary} flex items-center gap-2`}><Bell className="w-5 h-5 text-[#b08d57]" /> Notifications</h1>
                    <RefreshButton />
                  </div>
                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3`}>📢 Send Notification</h3>
                    <div className="space-y-3">
                      <div><Label className={`${textSecondary} text-xs`}>Title *</Label><Input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} className={inputClass} placeholder="Notification title..." /></div>
                      <div><Label className={`${textSecondary} text-xs`}>Message *</Label><Textarea value={notifMessage} onChange={e => setNotifMessage(e.target.value)} className={inputClass} rows={3} placeholder="Write your message..." /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className={`${textSecondary} text-xs`}>Send To</Label><Select value={notifTarget} onValueChange={setNotifTarget}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Users ({users.length})</SelectItem><SelectItem value="12pm-3pm">12–3 PM Slot</SelectItem><SelectItem value="6pm-9pm">6–9 PM Slot</SelectItem></SelectContent></Select></div>
                        <div><Label className={`${textSecondary} text-xs`}>Type</Label><Select value={notifType} onValueChange={setNotifType}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="announcement">📢 Announcement</SelectItem><SelectItem value="session">🎥 Session</SelectItem><SelectItem value="assignment">📝 Assignment</SelectItem><SelectItem value="certificate">📜 Certificate</SelectItem><SelectItem value="general">🔔 General</SelectItem></SelectContent></Select></div>
                      </div>
                      <Button onClick={sendWorkshopNotification} className={`w-full ${btnPrimary}`}><Send className="w-4 h-4 mr-2" />Send Notification</Button>
                    </div>
                  </GlassCard>
                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3`}>📋 Recent Notifications ({workshopNotifications.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {workshopNotifications.length === 0 && <p className={`${textSecondary} text-sm text-center py-4`}>No notifications sent yet</p>}
                      {workshopNotifications.slice(0, 50).map((n: any) => {
                        const u = users.find(u => u.id === n.user_id);
                        return (
                          <div key={n.id} className={`flex items-start justify-between ${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-xl p-3`}>
                            <div className="flex-1 min-w-0">
                              <p className={`${textPrimary} text-xs`}>{n.title}</p>
                              <p className={`${textSecondary} text-[10px]`}>{n.message}</p>
                              <p className={`${textMuted} text-[10px] mt-0.5`}>→ {u?.name || "User"} · {new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge className={`text-[9px] ${n.read ? "bg-[#7c9885]/20 text-[#5a7a65]" : `${dm ? "bg-white/10 text-white/40" : "bg-[#e8ddd0] text-[#8b7b6a]"}`}`}>{n.read ? "Read" : "Unread"}</Badge>
                              <Button variant="ghost" size="sm" className="text-red-400 h-6 px-1" onClick={() => deleteWorkshopNotification(n.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* ACTIVITY LOG */}
              {tab === "log" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary} flex items-center gap-2`}><History className="w-5 h-5 text-[#b08d57]" /> Activity Log</h1>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <ExportButton data={adminLog.map(l => ({ Admin: l.admin_name, Action: l.action, Details: l.details || "—", Time: new Date(l.created_at).toLocaleString("en-IN") }))} sheetName="ActivityLog" fileName="CCC_AdminLog" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Total Actions</p><p className={`text-2xl font-bold ${textPrimary}`}>{adminLog.length}</p></GlassCard>
                    <GlassCard className="!p-4"><p className={`${textSecondary} text-xs`}>Today</p><p className={`text-2xl font-bold ${textPrimary}`}>{adminLog.filter(l => l.created_at?.startsWith(new Date().toISOString().split("T")[0])).length}</p></GlassCard>
                  </div>
                  {adminLog.map((log: any) => (
                    <GlassCard key={log.id} className="!p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b08d57]/30 to-[#c9a96e]/30 flex items-center justify-center flex-shrink-0"><Activity className="w-4 h-4 text-[#b08d57]" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`${textPrimary} text-xs`}>{log.admin_name}</span>
                            <Badge className={`${dm ? "bg-white/10 text-white/60" : "bg-[#e8ddd0] text-[#6a5a4a]"} text-[9px]`}>{log.action}</Badge>
                          </div>
                          {log.details && <p className={`${textSecondary} text-xs mt-0.5`}>{log.details}</p>}
                          <p className={`${textMuted} text-[10px]`}>{new Date(log.created_at).toLocaleString("en-IN")}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-400 h-7 px-1" onClick={() => deleteLogEntry(log.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </GlassCard>
                  ))}
                  {adminLog.length === 0 && <GlassCard><p className={`text-center ${textSecondary} py-8`}>No activity yet</p></GlassCard>}
                </div>
              )}

              {tab === "settings" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className={`text-xl ${textPrimary}`}>Settings</h1>
                    <RefreshButton />
                  </div>

                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-4`}>⚙️ General</h3>
                    <div className="space-y-5">
                      {[
                        { key: "global_video_access", label: "Video Access", desc: "Toggle for all" },
                        { key: "global_video_download", label: "Video Download", desc: "Toggle download" },
                        { key: "assignment_submission_enabled", label: "Assignment Submit", desc: "Allow submissions" },
                        { key: "certificate_visibility", label: "Certificates", desc: "Show to students" },
                        { key: "live_session_enabled", label: "Live Sessions", desc: "Enable system" },
                        { key: "feedback_visibility", label: "Feedback Page", desc: "Show to users" },
                        { key: "workshop_ended", label: "Workshop Ended", desc: "Mark complete" },
                        { key: "secret_code_login", label: "Secret Code Login", desc: "Allow users to login with secret code" },
                      ].map((s) => (
                        <div key={s.key} className="flex items-center justify-between">
                          <div><p className={`${textPrimary} text-sm`}>{s.label}</p><p className={`${textMuted} text-xs`}>{s.desc}</p></div>
                          <Switch checked={settings[s.key]?.enabled ?? false} onCheckedChange={v => toggleSetting(s.key, v)} />
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* WhatsApp Number */}
                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3`}>📱 WhatsApp Support Number</h3>
                    <div className="flex gap-2">
                      <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value.replace(/\D/g, ""))} className={`${inputClass} flex-1`} maxLength={10} placeholder="8433843725" />
                      <Button size="sm" onClick={saveWhatsappNumber} className={btnPrimary}>Save</Button>
                    </div>
                  </GlassCard>

                  {/* Countdown Timer Settings */}
                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3`}>⏱️ Countdown Timer</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div><p className={`${textPrimary} text-sm`}>Enable Countdown</p><p className={`${textMuted} text-xs`}>Show timer on user dashboard</p></div>
                        <Switch checked={settings.countdown_timer?.enabled ?? false} onCheckedChange={async v => {
                          await supabase.from("workshop_settings" as any).upsert({ id: "countdown_timer", value: { ...settings.countdown_timer, enabled: v }, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
                          await logAction("setting", `Countdown → ${v}`); fetchSettings();
                        }} />
                      </div>
                      <div><Label className={`${textSecondary} text-xs`}>Target Date & Time</Label><Input type="datetime-local" value={countdownTime ? countdownTime.slice(0, 16) : ""} onChange={e => setCountdownTime(e.target.value)} className={inputClass} /></div>
                      <div><Label className={`${textSecondary} text-xs`}>Label Text</Label><Input value={countdownLabel} onChange={e => setCountdownLabel(e.target.value)} className={inputClass} placeholder="Session starts in" /></div>
                      <Button size="sm" onClick={async () => {
                        await supabase.from("workshop_settings" as any).upsert({ id: "countdown_timer", value: { enabled: settings.countdown_timer?.enabled ?? false, target_time: countdownTime, label: countdownLabel }, updated_at: new Date().toISOString() } as any, { onConflict: "id" });
                        await logAction("setting", `Countdown timer saved`); toast({ title: "Countdown settings saved! ✅" }); fetchSettings();
                      }} className={btnPrimary}>Save Countdown Settings</Button>
                    </div>
                  </GlassCard>

                  {/* Admin Profile Edit */}
                  <GlassCard>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`${textPrimary} text-sm flex items-center gap-2`}><Lock className="w-4 h-4 text-[#b08d57]" /> My Profile</h3>
                      {!adminProfileEdit && <Button size="sm" variant="ghost" onClick={() => { setAdminProfileEdit(true); setAdminEditData({ name: adminInfo?.name || "", email: adminInfo?.email || "", password: "" }); }} className={`${textSecondary} text-xs`}><Edit2 className="w-3 h-3 mr-1" />Edit</Button>}
                    </div>
                    {adminProfileEdit ? (
                      <div className="space-y-3">
                        <div><Label className={`${textSecondary} text-xs`}>Name</Label><Input value={adminEditData.name} onChange={e => setAdminEditData({...adminEditData, name: e.target.value})} className={inputClass} /></div>
                        <div><Label className={`${textSecondary} text-xs`}>Email</Label><Input type="email" value={adminEditData.email} onChange={e => setAdminEditData({...adminEditData, email: e.target.value})} className={inputClass} /></div>
                        <div><Label className={`${textSecondary} text-xs`}>New Password (leave blank to keep)</Label><Input type="password" value={adminEditData.password} onChange={e => setAdminEditData({...adminEditData, password: e.target.value})} className={inputClass} placeholder="••••••" /></div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={updateAdminProfile} className={btnPrimary}><Save className="w-4 h-4 mr-1" />Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAdminProfileEdit(false)} className={textSecondary}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className={`${textSecondary} text-sm`}>Name: <span className={textPrimary}>{adminInfo?.name}</span></p>
                        <p className={`${textSecondary} text-sm`}>Email: <span className={textPrimary}>{adminInfo?.email}</span></p>
                      </div>
                    )}
                  </GlassCard>

                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3`}>🌐 Website Integration</h3>
                    <div className="flex items-center justify-between">
                      <div><p className={`${textPrimary} text-sm`}>Workshop Button</p><p className={`${textMuted} text-xs`}>Show on main navbar</p></div>
                      <Switch checked={settings.show_workshop_navbar?.enabled ?? false} onCheckedChange={async v => { await toggleWorkshopNavbar(v); await toggleSetting("show_workshop_navbar", v); }} />
                    </div>
                  </GlassCard>

                  {/* Workshop Page Content Editor */}
                  <WorkshopPageEditor dm={dm} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} inputClass={inputClass} btnPrimary={btnPrimary} logAction={logAction} />

                  {/* Create New Workshop */}
                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3 flex items-center gap-2`}><Plus className="w-4 h-4 text-[#b08d57]" /> Create New Workshop</h3>
                    <p className={`${textMuted} text-xs mb-3`}>Create a fresh workshop with zero data. Previous workshop data will be preserved.</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className={btnPrimary}><Plus className="w-4 h-4 mr-1" />Create New Workshop</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Create New Workshop</DialogTitle></DialogHeader>
                        <CreateWorkshopForm dm={dm} textSecondary={textSecondary} inputClass={inputClass} btnPrimary={btnPrimary} logAction={logAction} fetchSettings={fetchSettings} />
                      </DialogContent>
                    </Dialog>
                  </GlassCard>

                  {/* Switch Workshops */}
                  <GlassCard>
                    <h3 className={`${textPrimary} text-sm mb-3 flex items-center gap-2`}><History className="w-4 h-4 text-[#b08d57]" /> Workshop History</h3>
                    <WorkshopSwitcher dm={dm} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} cardBg={cardBg} btnPrimary={btnPrimary} />
                  </GlassCard>

                  {/* Admin Management */}
                  <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`${textPrimary} text-sm flex items-center gap-2`}><Shield className="w-4 h-4 text-[#b08d57]" /> Admin Management</h3>
                      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
                        <DialogTrigger asChild><Button size="sm" className={`${btnPrimary} rounded-xl`}><Plus className="w-4 h-4 mr-1" />Add Admin</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Add Admin</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div><Label>Name *</Label><Input value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} /></div>
                            <div><Label>Email *</Label><Input type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} /></div>
                            <div><Label>Password *</Label><Input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} /></div>
                            <div>
                              <Label className="text-xs">Permissions (optional)</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {["dashboard", "analytics", "all-users", "videos", "assignments", "certificates", "attendance", "feedback", "notifications", "settings"].map(perm => (
                                  <button key={perm} onClick={() => {
                                    setNewAdmin(prev => ({ ...prev, permissions: prev.permissions.includes(perm) ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm] }));
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${newAdmin.permissions.includes(perm) ? "bg-[#b08d57] text-white border-[#b08d57]" : `${dm ? "bg-white/5 text-white/50 border-white/10" : "bg-[#faf5ef] text-[#6a5a4a] border-[#d4c4b4]"}`}`}>
                                    {perm.replace(/-/g, " ")}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <Button onClick={addAdmin} className={`w-full ${btnPrimary}`}>Create Admin</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2">
                      {workshopAdmins.map((a: any) => (
                        <div key={a.id} className={`flex items-center justify-between ${dm ? "bg-white/5" : "bg-[#faf5ef]"} rounded-xl p-3`}>
                          <div><p className={`${textPrimary} text-sm`}>{a.name}</p><p className={`${textSecondary} text-xs`}>{a.email}</p></div>
                          {a.user_id !== adminInfo?.id && (
                            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-400"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {a.name}?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAdmin(a.user_id, a.name)}>Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>


                  {/* Hard Reset */}
                  <GlassCard className="border-red-200/30">
                    <h3 className="text-red-500 font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Danger Zone</h3>
                    <p className={`${textMuted} text-xs mt-1`}>Permanently delete all workshop data</p>
                    {hardResetStep === 0 && <Button variant="destructive" size="sm" className="mt-3" onClick={() => setHardResetStep(1)}>Hard Reset System</Button>}
                    {hardResetStep === 1 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-red-500 text-sm font-bold">⚠️ This will delete ALL workshop data permanently!</p>
                        <div className="flex gap-2"><Button variant="destructive" onClick={() => setHardResetStep(2)}>Continue</Button><Button variant="outline" onClick={() => setHardResetStep(0)}>Cancel</Button></div>
                      </div>
                    )}
                    {hardResetStep === 2 && (
                      <div className="mt-3 space-y-3">
                        <p className="text-red-500 text-sm font-bold">Enter reset code:</p>
                        <Input value={hardResetCode} onChange={e => setHardResetCode(e.target.value)} placeholder="Enter code..." className="border-red-300" maxLength={8} autoComplete="off" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} />
                        <div className="flex gap-2"><Button variant="destructive" onClick={handleHardReset}>Execute</Button><Button variant="outline" onClick={() => { setHardResetStep(0); setHardResetCode(""); }}>Cancel</Button></div>
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

const UserCard = ({ u, expandedUser, setExpandedUser, editingUser, setEditingUser, editData, setEditData, saveUserEdit, deleteUser, toggleUserEnabled, certUserId, setCertUserId, certFile, setCertFile, uploadCertificate, uploading, dm, textPrimary, textSecondary, textMuted, inputClass, cardBg, showType, logAction, fetchUsers }: any) => {
  const isExpanded = expandedUser === u.id;
  const isEditing = editingUser === u.id;

  const viewPaymentScreenshot = async () => {
    if (!u.payment_screenshot_path) return;
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(u.payment_screenshot_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-4 shadow-sm transition-all`}>
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
            <Button size="sm" onClick={saveUserEdit} className="bg-[#b08d57] hover:bg-[#9e7d4a] text-white font-bold"><Save className="w-4 h-4 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)} className={textSecondary}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {u.roll_number && <Badge className="bg-[#b08d57]/20 text-[#8b6f47] text-[10px] font-bold">#{u.roll_number}</Badge>}
                <p className={`${textPrimary} text-sm`}>{u.name}</p>
                {!u.is_enabled && <Badge className="bg-[#d98c8c]/20 text-[#b06060] text-[10px]">Disabled</Badge>}
                {u.gender && <Badge className={`${dm ? "bg-white/10 text-white/60" : "bg-[#e8ddd0] text-[#6a5a4a]"} text-[10px]`}>{u.gender}</Badge>}
                {showType && <Badge className={`text-[10px] ${u.student_type === "registered_online" ? "bg-[#7c9885]/20 text-[#5a7a65]" : "bg-[#c9a96e]/20 text-[#8b6f47]"}`}>{u.student_type === "registered_online" ? "Online" : "Manual"}</Badge>}
              </div>
              <p className={`${textSecondary} text-xs`}>{u.email} · {u.mobile}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge className={`${dm ? "bg-white/10 text-white/60" : "bg-[#e8ddd0] text-[#6a5a4a]"} text-[10px]`}>{u.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}</Badge>
                {u.age && <Badge className={`${dm ? "bg-white/10 text-white/60" : "bg-[#e8ddd0] text-[#6a5a4a]"} text-[10px]`}>Age: {u.age}</Badge>}
                {u.secret_code && <Badge className={`${dm ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-100 text-yellow-700"} text-[10px]`}>🔑 {u.secret_code}</Badge>}
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
              {u.why_join && <p className={`${textSecondary} text-xs`}>Why join: <span className={`${dm ? "text-white/70" : "text-[#5a4a3a] font-medium"}`}>{u.why_join}</span></p>}
              {u.payment_screenshot_path && <Button size="sm" variant="ghost" className="text-[#b08d57] h-7 text-xs font-bold" onClick={viewPaymentScreenshot}><Eye className="w-3 h-3 mr-1" />Payment Screenshot</Button>}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="ghost" className={`${textSecondary} h-7 text-xs`} onClick={() => { setEditingUser(u.id); setEditData(u); }}><Edit2 className="w-3 h-3 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" className="text-[#b08d57] h-7 text-xs font-bold" onClick={() => setCertUserId(u.id)}><Award className="w-3 h-3 mr-1" />Certificate</Button>
                {!u.prefers_recorded ? (
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm" variant="ghost" className="text-blue-500 h-7 text-xs font-bold"><MonitorPlay className="w-3 h-3 mr-1" />Prefer Recorded</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Mark {u.name} for Recorded Session</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Note (why?)</Label><Textarea id={`rec-note-${u.id}`} rows={2} placeholder="Reason..." /></div>
                        <Button onClick={async () => {
                          const note = (document.getElementById(`rec-note-${u.id}`) as HTMLTextAreaElement)?.value || "";
                          await supabase.from("workshop_users" as any).update({ prefers_recorded: true, prefers_recorded_note: note, prefers_recorded_at: new Date().toISOString() } as any).eq("id", u.id);
                          await logAction("prefer_recorded", `${u.name} → recorded`); toast({ title: "Marked for recorded session" }); fetchUsers();
                        }} className="bg-blue-500 hover:bg-blue-400 text-white font-bold w-full">Confirm</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button size="sm" variant="ghost" className="text-blue-400 h-7 text-xs" onClick={async () => {
                    await supabase.from("workshop_users" as any).update({ prefers_recorded: false, prefers_recorded_note: null, prefers_recorded_at: null } as any).eq("id", u.id);
                    await logAction("undo_recorded", `${u.name} → live`); toast({ title: "Reverted to live" }); fetchUsers();
                  }}><MonitorPlay className="w-3 h-3 mr-1" />Undo Recorded</Button>
                )}
                <Button size="sm" variant="ghost" className={`h-7 text-xs ${u.is_enabled ? "text-[#c9a96e]" : "text-[#7c9885]"}`} onClick={() => toggleUserEnabled(u.id, !u.is_enabled, u.name)}>
                   {u.is_enabled ? <><EyeOff className="w-3 h-3 mr-1" />Disable</> : <><Eye className="w-3 h-3 mr-1" />Enable</>}
                 </Button>
                <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-400 h-7 text-xs"><Trash2 className="w-3 h-3 mr-1" />Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {u.name}?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteUser(u.id, u.name)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
              </div>
              {certUserId === u.id && (
                <div className={`mt-2 p-3 ${dm ? "bg-white/5 border-white/10" : "bg-[#faf5ef] border-[#e8ddd0]"} rounded-lg space-y-2 border`}>
                  <Label className={`${textSecondary} text-xs`}>Upload Certificate (PDF/Image)</Label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCertFile(e.target.files?.[0] || null)} className={inputClass} />
                  <Button size="sm" onClick={() => uploadCertificate(u.id)} disabled={!certFile || uploading} className="bg-[#b08d57] hover:bg-[#9e7d4a] text-white font-bold">
                    <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

const AssignmentAdminCard = ({ assignment, onGrade, dm, textPrimary, textSecondary, textMuted, inputClass, cardBg }: any) => {
  const [marks, setMarks] = useState(assignment.marks?.toString() || "");
  const [totalMarks, setTotalMarks] = useState(assignment.total_marks?.toString() || "100");
  const [notes, setNotes] = useState(assignment.admin_notes || "");
  const [passStatus, setPassStatus] = useState(assignment.pass_status || "");
  const [gradedBy, setGradedBy] = useState(assignment.graded_by_artist || "");
  const [grading, setGrading] = useState(false);

  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const viewFile = async () => {
    if (!assignment.storage_path) return;
    const { data } = await supabase.storage.from("workshop-files").createSignedUrl(assignment.storage_path, 3600);
    if (data?.signedUrl) {
      // Check if it's an image
      const ext = (assignment.file_name || "").toLowerCase();
      if (ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".png")) {
        setViewingImage(data.signedUrl);
      } else {
        window.open(data.signedUrl, "_blank");
      }
    }
  };

  return (
    <>
      {/* Image Viewer Modal */}
      {viewingImage && (
        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
            <div className="relative w-full h-full flex items-center justify-center overflow-auto">
              <img src={viewingImage} alt="Assignment" className="max-w-full max-h-[85vh] object-contain cursor-zoom-in" 
                onClick={(e) => { const img = e.currentTarget; img.style.transform = img.style.transform === "scale(2)" ? "scale(1)" : "scale(2)"; img.style.transition = "transform 0.3s"; }} />
            </div>
          </DialogContent>
        </Dialog>
      )}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`${textPrimary} text-sm`}>{assignment.workshop_users?.name || "User"}</p>
            <p className={`${textSecondary} text-xs`}>{assignment.file_name}</p>
            <p className={`${textMuted} text-[10px]`}>{assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString("en-IN") : "—"}</p>
            {assignment.graded_by_artist && <p className={`${textSecondary} text-[10px] mt-1`}>Graded by: {assignment.graded_by_artist}</p>}
          </div>
          <div className="flex gap-1 items-center">
            <Badge className={`text-[10px] ${assignment.status === "graded" ? "bg-[#7c9885]/20 text-[#5a7a65]" : "bg-[#8fa3bf]/20 text-[#6a8aaa]"}`}>{assignment.status}</Badge>
            <Button variant="ghost" size="sm" onClick={viewFile} className={textSecondary}><Eye className="w-4 h-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-400 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete the assignment by {assignment.workshop_users?.name || "User"}.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    if (assignment.storage_path) {
                      await supabase.storage.from("workshop-files").remove([assignment.storage_path]);
                    }
                    await supabase.from("workshop_assignments" as any).delete().eq("id", assignment.id);
                    toast({ title: "Assignment deleted" });
                  }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {!grading && assignment.status !== "graded" && (
          <Button size="sm" variant="ghost" onClick={() => setGrading(true)} className="mt-2 text-[#b08d57] text-xs font-bold">Grade Assignment</Button>
        )}
        {(grading || assignment.status === "graded") && (
          <div className={`space-y-2 pt-2 mt-2 border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"}`}>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className={`${textSecondary} text-xs`}>Marks</Label><Input type="number" value={marks} onChange={e => setMarks(e.target.value)} className={inputClass} /></div>
              <div><Label className={`${textSecondary} text-xs`}>Out of</Label><Input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} className={inputClass} /></div>
              <div><Label className={`${textSecondary} text-xs`}>Status</Label><Select value={passStatus} onValueChange={setPassStatus}><SelectTrigger className={inputClass}><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label className={`${textSecondary} text-xs`}>Graded By (Artist)</Label><Input value={gradedBy} onChange={e => setGradedBy(e.target.value)} className={inputClass} placeholder="Artist name" /></div>
            <div><Label className={`${textSecondary} text-xs`}>Notes / Suggestions</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} /></div>
            <Button size="sm" onClick={() => onGrade(assignment.id, parseInt(marks) || 0, notes, parseInt(totalMarks) || 100, passStatus, gradedBy)} className="bg-[#b08d57] hover:bg-[#9e7d4a] text-white font-bold">
              <Save className="w-4 h-4 mr-1" />Save Grade
            </Button>
          </div>
        )}
      </motion.div>
    </>
  );
};

/* Create Workshop Form */
const CreateWorkshopForm = ({ dm, textSecondary, inputClass, btnPrimary, logAction, fetchSettings }: any) => {
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setCreating(true);
    // Deactivate all existing workshops
    await supabase.from("workshops").update({ is_active: false } as any).eq("is_active", true);
    // Create new workshop
    const { error } = await supabase.from("workshops").insert({
      title, description, dates, duration, price,
      is_active: true, status: "upcoming", highlights: [],
    } as any);
    if (error) {
      toast({ title: "Error creating workshop", description: error.message, variant: "destructive" });
    } else {
      await logAction("create_workshop", `Created: ${title}`);
      toast({ title: "✅ New workshop created!", description: "Previous workshops are now archived." });
      fetchSettings();
    }
    setCreating(false);
  };

  return (
    <div className="space-y-3">
      <div><Label className={`${textSecondary} text-xs`}>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="e.g., Caricature Masterclass 2026" /></div>
      <div><Label className={`${textSecondary} text-xs`}>Dates</Label><Input value={dates} onChange={e => setDates(e.target.value)} className={inputClass} placeholder="e.g., April 10-12, 2026" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className={`${textSecondary} text-xs`}>Duration</Label><Input value={duration} onChange={e => setDuration(e.target.value)} className={inputClass} placeholder="e.g., 3 Days" /></div>
        <div><Label className={`${textSecondary} text-xs`}>Price</Label><Input value={price} onChange={e => setPrice(e.target.value)} className={inputClass} placeholder="e.g., ₹2,999" /></div>
      </div>
      <div><Label className={`${textSecondary} text-xs`}>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputClass} placeholder="Workshop description..." /></div>
      <Button onClick={handleCreate} disabled={creating} className={`w-full ${btnPrimary}`}>
        {creating ? "Creating..." : "🎨 Create Workshop"}
      </Button>
    </div>
  );
};

/* Workshop Switcher - uses inner component defined in WorkshopAdmin */

/* Workshop Page Content Editor */
const WorkshopPageEditor = ({ dm, textPrimary, textSecondary, textMuted, inputClass, btnPrimary, logAction }: any) => {
  const [ws, setWs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brochureImg, setBrochureImg] = useState<File | null>(null);
  const [brochurePdf, setBrochurePdf] = useState<File | null>(null);

  useEffect(() => {
    fetchActive();
  }, []);

  const fetchActive = async () => {
    const { data } = await supabase.from("workshops").select("*").eq("is_active", true).limit(1);
    if (data && (data as any[]).length > 0) setWs((data as any[])[0]);
    setLoading(false);
  };

  const updateField = (key: string, value: any) => setWs((prev: any) => prev ? { ...prev, [key]: value } : prev);

  const handleSave = async () => {
    if (!ws) return;
    setSaving(true);
    let brochureImageUrl = ws.brochure_image_url || "";
    let brochurePdfUrl = ws.brochure_pdf_url || "";

    if (brochureImg) {
      const path = `brochures/${ws.id}_${Date.now()}_img.${brochureImg.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("workshop-files").upload(path, brochureImg, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("workshop-files").getPublicUrl(path);
        brochureImageUrl = urlData.publicUrl;
      }
    }
    if (brochurePdf) {
      const path = `brochures/${ws.id}_${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("workshop-files").upload(path, brochurePdf, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("workshop-files").getPublicUrl(path);
        brochurePdfUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("workshops").update({
      title: ws.title,
      description: ws.description,
      dates: ws.dates,
      duration: ws.duration,
      price: ws.price,
      highlights: ws.highlights || [],
      contact_whatsapp: ws.contact_whatsapp || "",
      status: ws.status,
      registration_enabled: ws.registration_enabled ?? false,
      brochure_image_url: brochureImageUrl,
      brochure_pdf_url: brochurePdfUrl,
      instructor_name: ws.instructor_name || "",
      instructor_title: ws.instructor_title || "",
      instructor_bio: ws.instructor_bio || "",
      instructor_stats: ws.instructor_stats || [],
      faq: ws.faq || [],
      what_you_learn: ws.what_you_learn || [],
      who_is_for: ws.who_is_for || [],
      workshop_mode: ws.workshop_mode || "Live Online",
      workshop_language: ws.workshop_language || "English & Hindi",
      skill_level: ws.skill_level || "Beginner to Intermediate",
      requirements: ws.requirements || "",
      max_participants: ws.max_participants || 60,
      preview_video_url: ws.preview_video_url || "",
      updated_at: new Date().toISOString(),
    } as any).eq("id", ws.id);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      await logAction("update_workshop_page", `Updated: ${ws.title}`);
      toast({ title: "✅ Workshop page updated!" });
      fetchActive();
    }
    setSaving(false);
  };

  if (loading) return <div className={`${textMuted} text-sm text-center py-4`}>Loading...</div>;
  if (!ws) return <div className={`${textMuted} text-sm text-center py-4`}>No active workshop. Create one first.</div>;

  const GlassCard = ({ children, className = "" }: any) => (
    <div className={`backdrop-blur-xl ${dm ? "bg-white/5 border-white/10" : "bg-white/80 border-[#e8ddd0]"} border rounded-2xl p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${textPrimary} text-sm flex items-center gap-2`}>
          <Edit2 className="w-4 h-4 text-[#b08d57]" /> Workshop Page Content
        </h3>
        <Badge className={ws.registration_enabled ? "bg-green-100 text-green-700 border-none text-[10px]" : "bg-yellow-100 text-yellow-700 border-none text-[10px]"}>
          {ws.registration_enabled ? "Registration Open" : "Registration Closed"}
        </Badge>
      </div>
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
        {/* Core */}
        <div className="space-y-3">
          <div><Label className={`${textSecondary} text-xs`}>Title</Label><Input value={ws.title || ""} onChange={e => updateField("title", e.target.value)} className={inputClass} /></div>
          <div><Label className={`${textSecondary} text-xs`}>Description</Label><Textarea value={ws.description || ""} onChange={e => updateField("description", e.target.value)} rows={2} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className={`${textSecondary} text-xs`}>Dates</Label><Input value={ws.dates || ""} onChange={e => updateField("dates", e.target.value)} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Duration</Label><Input value={ws.duration || ""} onChange={e => updateField("duration", e.target.value)} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className={`${textSecondary} text-xs`}>Price</Label><Input value={ws.price || ""} onChange={e => updateField("price", e.target.value)} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Status</Label>
              <Select value={ws.status} onValueChange={v => updateField("status", v)}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="ended">Ended</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div><p className={`${textPrimary} text-sm`}>Registration Open</p><p className={`${textMuted} text-xs`}>Allow new registrations</p></div>
            <Switch checked={ws.registration_enabled ?? false} onCheckedChange={v => updateField("registration_enabled", v)} />
          </div>
        </div>

        {/* Brochure */}
        <div className={`border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"} pt-3`}>
          <p className={`${textPrimary} text-sm mb-2`}>📄 Brochure</p>
          <div className="space-y-2">
            <div><Label className={`${textSecondary} text-xs`}>Brochure Image</Label><Input type="file" accept="image/*" onChange={e => setBrochureImg(e.target.files?.[0] || null)} className={inputClass} /></div>
            {ws.brochure_image_url && <p className={`${textMuted} text-xs truncate`}>Current: {ws.brochure_image_url.split("/").pop()}</p>}
            <div><Label className={`${textSecondary} text-xs`}>Brochure PDF</Label><Input type="file" accept=".pdf" onChange={e => setBrochurePdf(e.target.files?.[0] || null)} className={inputClass} /></div>
            {ws.brochure_pdf_url && <p className={`${textMuted} text-xs truncate`}>Current: {ws.brochure_pdf_url.split("/").pop()}</p>}
          </div>
        </div>

        {/* Instructor */}
        <div className={`border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"} pt-3`}>
          <p className={`${textPrimary} text-sm mb-2`}>👨‍🎨 Instructor</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className={`${textSecondary} text-xs`}>Name</Label><Input value={ws.instructor_name || ""} onChange={e => updateField("instructor_name", e.target.value)} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Title</Label><Input value={ws.instructor_title || ""} onChange={e => updateField("instructor_title", e.target.value)} className={inputClass} /></div>
          </div>
          <div className="mt-2"><Label className={`${textSecondary} text-xs`}>Bio</Label><Textarea value={ws.instructor_bio || ""} onChange={e => updateField("instructor_bio", e.target.value)} rows={2} className={inputClass} /></div>
        </div>

        {/* Details */}
        <div className={`border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"} pt-3`}>
          <p className={`${textPrimary} text-sm mb-2`}>📋 Details</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className={`${textSecondary} text-xs`}>Mode</Label><Input value={ws.workshop_mode || ""} onChange={e => updateField("workshop_mode", e.target.value)} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Language</Label><Input value={ws.workshop_language || ""} onChange={e => updateField("workshop_language", e.target.value)} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div><Label className={`${textSecondary} text-xs`}>Skill Level</Label><Input value={ws.skill_level || ""} onChange={e => updateField("skill_level", e.target.value)} className={inputClass} /></div>
            <div><Label className={`${textSecondary} text-xs`}>Max Participants</Label><Input type="number" value={ws.max_participants || 60} onChange={e => updateField("max_participants", parseInt(e.target.value) || 60)} className={inputClass} /></div>
          </div>
          <div className="mt-2"><Label className={`${textSecondary} text-xs`}>Requirements</Label><Input value={ws.requirements || ""} onChange={e => updateField("requirements", e.target.value)} className={inputClass} /></div>
          <div className="mt-2"><Label className={`${textSecondary} text-xs`}>Preview Video URL</Label><Input value={ws.preview_video_url || ""} onChange={e => updateField("preview_video_url", e.target.value)} className={inputClass} placeholder="https://youtube.com/..." /></div>
          <div className="mt-2"><Label className={`${textSecondary} text-xs`}>WhatsApp Number</Label><Input value={ws.contact_whatsapp || ""} onChange={e => updateField("contact_whatsapp", e.target.value)} className={inputClass} /></div>
        </div>

        {/* Highlights */}
        <div className={`border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"} pt-3`}>
          <p className={`${textPrimary} text-sm mb-2`}>✨ Highlights (one per line)</p>
          <Textarea value={(ws.highlights || []).join("\n")} onChange={e => updateField("highlights", e.target.value.split("\n").filter((l: string) => l.trim()))} rows={4} className={inputClass} placeholder="Live demonstrations&#10;Hands-on practice&#10;..." />
        </div>

        {/* What You'll Learn */}
        <div className={`border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"} pt-3`}>
          <p className={`${textPrimary} text-sm mb-2`}>📚 What You'll Learn (one per line)</p>
          <Textarea value={(ws.what_you_learn || []).join("\n")} onChange={e => updateField("what_you_learn", e.target.value.split("\n").filter((l: string) => l.trim()))} rows={4} className={inputClass} />
        </div>

        {/* Who Is For */}
        <div className={`border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"} pt-3`}>
          <p className={`${textPrimary} text-sm mb-2`}>🎯 Who This Is For (one per line)</p>
          <Textarea value={(ws.who_is_for || []).join("\n")} onChange={e => updateField("who_is_for", e.target.value.split("\n").filter((l: string) => l.trim()))} rows={4} className={inputClass} />
        </div>

        {/* FAQ */}
        <div className={`border-t ${dm ? "border-white/10" : "border-[#e8ddd0]"} pt-3`}>
          <p className={`${textPrimary} text-sm mb-2`}>❓ FAQ</p>
          {(ws.faq || []).map((f: any, i: number) => (
            <div key={i} className="mb-3 space-y-1">
              <Input value={f.question} onChange={e => {
                const newFaq = [...(ws.faq || [])];
                newFaq[i] = { ...newFaq[i], question: e.target.value };
                updateField("faq", newFaq);
              }} className={inputClass} placeholder="Question" />
              <Textarea value={f.answer} onChange={e => {
                const newFaq = [...(ws.faq || [])];
                newFaq[i] = { ...newFaq[i], answer: e.target.value };
                updateField("faq", newFaq);
              }} rows={2} className={inputClass} placeholder="Answer" />
              <Button size="sm" variant="ghost" className="text-red-400 text-xs h-6" onClick={() => {
                const newFaq = (ws.faq || []).filter((_: any, idx: number) => idx !== i);
                updateField("faq", newFaq);
              }}><Trash2 className="w-3 h-3 mr-1" />Remove</Button>
            </div>
          ))}
          <Button size="sm" variant="ghost" className="text-[#b08d57] text-xs" onClick={() => updateField("faq", [...(ws.faq || []), { question: "", answer: "" }])}>
            <Plus className="w-3 h-3 mr-1" /> Add FAQ
          </Button>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className={`w-full mt-4 ${btnPrimary}`}>
        <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Workshop Page"}
      </Button>
    </GlassCard>
  );
};

export default WorkshopAdmin;
