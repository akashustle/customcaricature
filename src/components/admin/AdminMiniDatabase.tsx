import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Database, Users, CreditCard, Calendar, ShoppingBag, MessageSquare,
  BarChart3, GraduationCap, RefreshCw, CheckCircle2, Loader2, Zap,
  Plus, Trash2, Eye, Paintbrush, AlertTriangle, Search, ChevronDown, ChevronUp
} from "lucide-react";
import { playSuccessSound, playClickSound, playDeleteSound } from "@/lib/sounds";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SYNC_SECTIONS = [
  { key: "sync_users", table: "profiles", label: "Users", icon: Users, gradient: "from-sky-400 to-blue-500", accent: "sky", desc: "All profiles, secret codes & details" },
  { key: "sync_payments", table: "payment_history", label: "Payment History", icon: CreditCard, gradient: "from-emerald-400 to-green-500", accent: "emerald", desc: "Full payment records" },
  { key: "sync_events", table: "event_bookings", label: "Events Details", icon: Calendar, gradient: "from-violet-400 to-purple-500", accent: "violet", desc: "All event bookings" },
  { key: "sync_orders", table: "orders", label: "Orders", icon: ShoppingBag, gradient: "from-orange-400 to-amber-500", accent: "orange", desc: "Custom caricature orders" },
  { key: "sync_enquiries", table: "enquiries", label: "Enquiries", icon: MessageSquare, gradient: "from-rose-400 to-pink-500", accent: "rose", desc: "All enquiry details" },
  { key: "sync_analytics", table: "app_actions", label: "Analytics", icon: BarChart3, gradient: "from-cyan-400 to-teal-500", accent: "cyan", desc: "Dashboard metrics & charts" },
  { key: "sync_workshop", table: "workshop_users", label: "Workshop", icon: GraduationCap, gradient: "from-fuchsia-400 to-pink-500", accent: "fuchsia", desc: "March & June workshop students" },
];

const TABLE_OPTIONS = [
  { value: "profiles", label: "Users / Profiles" },
  { value: "payment_history", label: "Payment History" },
  { value: "event_bookings", label: "Event Bookings" },
  { value: "orders", label: "Orders" },
  { value: "enquiries", label: "Enquiries" },
  { value: "app_actions", label: "Analytics / Actions" },
  { value: "workshop_users", label: "Workshop Users" },
];

const AdminMiniDatabase = () => {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<Record<string, any[]>>({});
  const [loadingData, setLoadingData] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Add sheet dialog
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [newSheetTable, setNewSheetTable] = useState("");
  const [addingSheet, setAddingSheet] = useState(false);

  // Delete confirmations
  const [deleteTarget, setDeleteTarget] = useState<{ section: string; id: string; name: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState(0); // 0=none, 1=first warning, 2=final warning

  // Design update
  const [updatingDesign, setUpdatingDesign] = useState<string | null>(null);

  const handleSync = async (action: string) => {
    playClickSound();
    setSyncing(action);
    try {
      const { data, error } = await supabase.functions.invoke("mini-db-sync", { body: { action } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      setResults(prev => ({ ...prev, [action]: data }));
      playSuccessSound();
      toast({ title: "✅ Synced!", description: `${action.replace("sync_", "")} synced to Mini Database` });
    } catch (e: any) {
      toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    playClickSound();
    setSyncing("sync_all");
    try {
      const { data, error } = await supabase.functions.invoke("mini-db-sync", { body: { action: "sync_all" } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      setResults({ sync_all: data });
      playSuccessSound();
      toast({ title: "🎉 Full Sync Complete!", description: `All ${data.results?.length || 0} sheets synced` });
    } catch (e: any) {
      toast({ title: "Full Sync Failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const handleUpdateDesign = async (target: "mini-db" | "google-sheet") => {
    playClickSound();
    setUpdatingDesign(target);
    try {
      const fn = target === "mini-db" ? "mini-db-sync" : "google-sheets-sync";
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { action: target === "mini-db" ? "update_design" : "update_design" }
      });
      if (error) throw error;
      playSuccessSound();
      toast({ title: "🎨 Design Updated!", description: `Sheet design refreshed with vibrant colors` });
    } catch (e: any) {
      toast({ title: "Design Update Failed", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingDesign(null);
    }
  };

  // Load preview data for expanded section
  const loadSectionData = useCallback(async (table: string, section: string) => {
    if (sheetData[section]) return;
    setLoadingData(section);
    try {
      const { data, error } = await supabase.from(table as any).select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      setSheetData(prev => ({ ...prev, [section]: data || [] }));
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoadingData(null);
    }
  }, [sheetData]);

  const toggleSection = (key: string, table: string) => {
    if (expandedSheet === key) {
      setExpandedSheet(null);
    } else {
      setExpandedSheet(key);
      loadSectionData(table, key);
    }
  };

  // Add new sheet
  const handleAddSheet = async () => {
    if (!newSheetName.trim() || !newSheetTable) return;
    setAddingSheet(true);
    playClickSound();
    try {
      const { data, error } = await supabase.functions.invoke("mini-db-sync", {
        body: { action: "sync_table", table: newSheetTable, custom_tab_name: newSheetName.trim() }
      });
      if (error) throw error;
      playSuccessSound();
      toast({ title: "✅ Sheet Created!", description: `"${newSheetName}" sheet synced with ${newSheetTable} data` });
      setShowAddSheet(false);
      setNewSheetName("");
      setNewSheetTable("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setAddingSheet(false);
    }
  };

  // Delete entry - just from admin DB, NOT from sheet
  const initiateDelete = (section: string, id: string, name: string) => {
    setDeleteTarget({ section, id, name });
    setDeleteStep(1);
  };

  const confirmDeleteStep1 = () => setDeleteStep(2);

  const confirmDeleteFinal = async () => {
    if (!deleteTarget) return;
    playDeleteSound();
    const tableMap: Record<string, string> = {
      sync_users: "profiles", sync_payments: "payment_history", sync_events: "event_bookings",
      sync_orders: "orders", sync_enquiries: "enquiries", sync_workshop: "workshop_users"
    };
    const table = tableMap[deleteTarget.section];
    if (!table) return;

    try {
      const idCol = table === "profiles" ? "user_id" : "id";
      const { error } = await supabase.from(table as any).delete().eq(idCol, deleteTarget.id);
      if (error) throw error;
      // Remove from local data
      setSheetData(prev => ({
        ...prev,
        [deleteTarget.section]: (prev[deleteTarget.section] || []).filter((r: any) =>
          (table === "profiles" ? r.user_id : r.id) !== deleteTarget.id
        )
      }));
      toast({ title: "🗑️ Deleted from website", description: "Data remains safely in your Google Sheet backup" });
    } catch (e: any) {
      toast({ title: "Delete Failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
      setDeleteStep(0);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteStep(0);
  };

  // Get column display for each section
  const getColumns = (section: string): { key: string; label: string }[] => {
    switch (section) {
      case "sync_users": return [
        { key: "full_name", label: "Name" }, { key: "email", label: "Email" }, { key: "mobile", label: "Mobile" },
        { key: "secret_code", label: "Secret Code" }, { key: "city", label: "City" }, { key: "created_at", label: "Registered" }
      ];
      case "sync_payments": return [
        { key: "amount", label: "Amount" }, { key: "payment_type", label: "Type" }, { key: "status", label: "Status" },
        { key: "razorpay_payment_id", label: "Razorpay ID" }, { key: "created_at", label: "Date" }
      ];
      case "sync_events": return [
        { key: "client_name", label: "Client" }, { key: "event_date", label: "Event Date" }, { key: "city", label: "City" },
        { key: "total_price", label: "Total" }, { key: "payment_status", label: "Payment" }, { key: "status", label: "Status" }
      ];
      case "sync_orders": return [
        { key: "customer_name", label: "Customer" }, { key: "caricature_type", label: "Type" }, { key: "amount", label: "Amount" },
        { key: "status", label: "Status" }, { key: "payment_status", label: "Payment" }, { key: "created_at", label: "Date" }
      ];
      case "sync_enquiries": return [
        { key: "name", label: "Name" }, { key: "mobile", label: "Mobile" }, { key: "enquiry_type", label: "Type" },
        { key: "status", label: "Status" }, { key: "city", label: "City" }, { key: "created_at", label: "Date" }
      ];
      case "sync_workshop": return [
        { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "mobile", label: "Mobile" },
        { key: "workshop_date", label: "Workshop Date" }, { key: "payment_status", label: "Payment" }, { key: "secret_code", label: "Code" }
      ];
      default: return [{ key: "id", label: "ID" }];
    }
  };

  const formatCellValue = (val: any, key: string) => {
    if (val === null || val === undefined) return "—";
    if (key === "created_at" || key === "updated_at" || key === "event_date" || key === "workshop_date") {
      try { return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return val; }
    }
    if (key === "amount" || key === "total_price") return typeof val === "number" ? `₹${val.toLocaleString("en-IN")}` : val;
    return String(val);
  };

  const filteredData = (section: string) => {
    const data = sheetData[section] || [];
    if (!search.trim()) return data;
    return data.filter((row: any) =>
      Object.values(row).some(v => String(v || "").toLowerCase().includes(search.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> Mini Database
          </h2>
          <p className="text-sm text-muted-foreground">Complete website backup on Google Sheets · Real-time auto-sync</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
            <Zap className="w-3 h-3" /> Auto-Sync Active
          </Badge>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddSheet(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Sheet
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleUpdateDesign("mini-db")}
            disabled={updatingDesign === "mini-db"}>
            {updatingDesign === "mini-db" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paintbrush className="w-3.5 h-3.5" />}
            Update Design
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleUpdateDesign("google-sheet")}
            disabled={updatingDesign === "google-sheet"}>
            {updatingDesign === "google-sheet" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paintbrush className="w-3.5 h-3.5" />}
            Update Event Sheet Design
          </Button>
          <Button onClick={handleSyncAll} disabled={!!syncing} className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white">
            {syncing === "sync_all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync All Sheets
          </Button>
        </div>
      </div>

      {/* Sheet Sections */}
      <div className="space-y-3">
        {SYNC_SECTIONS.map((s, i) => {
          const isExpanded = expandedSheet === s.key;
          const columns = getColumns(s.key);
          const data = filteredData(s.key);

          return (
            <motion.div key={s.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="overflow-hidden border-white/60 hover:shadow-md transition-all">
                {/* Section Header */}
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => toggleSection(s.key, s.table)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm`}>
                      <s.icon className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        {s.label}
                        {results[s.key] && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-emerald-600 border-emerald-200 bg-emerald-50">
                            {results[s.key].rows || 0} rows
                          </Badge>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      disabled={!!syncing} onClick={(e) => { e.stopPropagation(); handleSync(s.key); }}>
                      {syncing === s.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Sync
                    </Button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded Data Table */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <div className="border-t px-4 py-3 space-y-3">
                        {/* Search */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input className="pl-8 h-8 text-xs" placeholder="Search..." value={search}
                              onChange={(e) => setSearch(e.target.value)} />
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{data.length} records</Badge>
                        </div>

                        {loadingData === s.key ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : s.key === "sync_analytics" ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            Analytics data is compiled as dashboard metrics in the sheet. Click Sync to update.
                          </div>
                        ) : (
                          <div className="overflow-auto max-h-[400px] rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="text-[10px] font-bold w-8">#</TableHead>
                                  {columns.map(col => (
                                    <TableHead key={col.key} className="text-[10px] font-bold">{col.label}</TableHead>
                                  ))}
                                  <TableHead className="text-[10px] font-bold w-16">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {data.slice(0, 100).map((row: any, idx: number) => (
                                  <TableRow key={row.id || row.user_id || idx} className="hover:bg-muted/20">
                                    <TableCell className="text-[10px] text-muted-foreground">{idx + 1}</TableCell>
                                    {columns.map(col => (
                                      <TableCell key={col.key} className="text-[11px] max-w-[180px] truncate">
                                        {formatCellValue(row[col.key], col.key)}
                                      </TableCell>
                                    ))}
                                    <TableCell>
                                      {s.key !== "sync_analytics" && (
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                          onClick={() => initiateDelete(s.key, row.id || row.user_id, row.full_name || row.customer_name || row.client_name || row.name || "this record")}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {data.length === 0 && (
                                  <TableRow><TableCell colSpan={columns.length + 2} className="text-center text-xs text-muted-foreground py-6">No data found</TableCell></TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Full Sync Results */}
      {results.sync_all?.results && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-emerald-800">Last Full Sync Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {results.sync_all.results.map((r: any, i: number) => (
                <div key={i} className="bg-white rounded-lg p-2 text-center shadow-sm">
                  <p className="text-xs font-semibold text-foreground">{r.sheet || "Sheet"}</p>
                  <p className="text-lg font-bold text-emerald-600">{r.rows || 0}</p>
                  <p className="text-[10px] text-muted-foreground">rows</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Banner */}
      <Card className="bg-amber-50/50 border-amber-200">
        <CardContent className="py-3">
          <p className="text-xs text-amber-800">
            <strong>🔒 Delete Protection:</strong> Data deleted from admin will NOT be removed from the Google Sheet — it acts as a permanent backup.
            Changes (inserts & updates) sync automatically in real-time via database triggers.
          </p>
        </CardContent>
      </Card>

      {/* Add Sheet Dialog */}
      <Dialog open={showAddSheet} onOpenChange={setShowAddSheet}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4 text-primary" /> Add New Sheet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Sheet Name</Label>
              <Input placeholder="e.g. VIP Customers" value={newSheetName} onChange={e => setNewSheetName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Select Database Table</Label>
              <Select value={newSheetTable} onValueChange={setNewSheetTable}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose table..." /></SelectTrigger>
                <SelectContent>
                  {TABLE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2" disabled={!newSheetName.trim() || !newSheetTable || addingSheet} onClick={handleAddSheet}>
              {addingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Create & Sync Sheet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Step 1 Warning */}
      <AlertDialog open={deleteStep === 1} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" /> Warning: Delete from Website
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>"{deleteTarget?.name}"</strong> from the website database.
              <br /><br />
              <span className="text-emerald-700 font-medium">✅ The data will remain safe in your Google Sheet backup.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStep1} className="bg-amber-500 hover:bg-amber-600">
              I Understand, Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Step 2 Final Warning */}
      <AlertDialog open={deleteStep === 2} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="border-red-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" /> Final Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong className="text-red-700">permanently delete</strong> "{deleteTarget?.name}" from the website.
              <br /><br />
              This action cannot be undone. The sheet backup is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFinal} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminMiniDatabase;
