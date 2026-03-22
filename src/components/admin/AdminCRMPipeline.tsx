import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/pricing";
import {
  Users, TrendingUp, Target, CheckCircle, DollarSign,
  Phone, Mail, Calendar, MapPin, ChevronRight, Plus,
  MessageCircle, StickyNote, Clock, GripVertical, Eye,
  Instagram, Globe, Search, Filter
} from "lucide-react";
import { format } from "date-fns";

const PIPELINE_STAGES = [
  { id: "new", label: "New Lead", color: "hsl(210 62% 48%)", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-800" },
  { id: "contacted", label: "Contacted", color: "hsl(38 88% 50%)", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-800" },
  { id: "negotiation", label: "Negotiation", color: "hsl(280 55% 55%)", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-800" },
  { id: "converted", label: "Confirmed", color: "hsl(152 55% 40%)", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-800" },
  { id: "completed", label: "Completed", color: "hsl(170 50% 45%)", bg: "bg-teal-50", badge: "bg-teal-100 text-teal-800" },
  { id: "closed", label: "Lost", color: "hsl(0 60% 50%)", bg: "bg-red-50", badge: "bg-red-100 text-red-800" },
];

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "referral", label: "Referral" },
  { value: "google", label: "Google" },
  { value: "other", label: "Other" },
];

const AdminCRMPipeline = () => {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  const fetchData = useCallback(async () => {
    const [enqRes, fuRes] = await Promise.all([
      supabase.from("enquiries" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("lead_follow_ups" as any).select("*").order("created_at", { ascending: false }),
    ]);
    if (enqRes.data) setEnquiries(enqRes.data as any[]);
    if (fuRes.data) setFollowUps(fuRes.data as any[]);
  }, []);

  useEffect(() => {
    fetchData();
    const ch = supabase.channel("crm-pipeline-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_follow_ups" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  const moveToStage = async (id: string, newStatus: string) => {
    await supabase.from("enquiries" as any).update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: `Lead moved to ${PIPELINE_STAGES.find(s => s.id === newStatus)?.label}` });
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stageId: string) => {
    if (draggedId) {
      moveToStage(draggedId, stageId);
      setDraggedId(null);
    }
  };

  const addFollowUp = async () => {
    if (!selectedLead || !followUpNote) return;
    await supabase.from("lead_follow_ups" as any).insert({
      enquiry_id: selectedLead.id,
      note: followUpNote,
      scheduled_at: followUpDate ? new Date(followUpDate).toISOString() : null,
      follow_up_type: "manual",
    } as any);
    toast({ title: "Follow-up added" });
    setFollowUpNote("");
    setFollowUpDate("");
  };

  const updateSource = async (id: string, source: string) => {
    await supabase.from("enquiries" as any).update({ source } as any).eq("id", id);
  };

  const updateAssignedTo = async (id: string, assigned_to: string) => {
    await supabase.from("enquiries" as any).update({ assigned_to } as any).eq("id", id);
  };

  const saveAdminNotes = async (id: string, notes: string) => {
    await supabase.from("enquiries" as any).update({ admin_notes: notes, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Notes saved" });
  };

  const filtered = enquiries.filter(e =>
    !search ||
    (e.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.mobile || "").includes(search) ||
    (e.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalLeads = enquiries.length;
  const activeLeads = enquiries.filter(e => !["converted", "completed", "closed"].includes(e.status)).length;
  const confirmedBookings = enquiries.filter(e => e.status === "converted" || e.status === "completed").length;
  const conversionRate = totalLeads > 0 ? Math.round((confirmedBookings / totalLeads) * 100) : 0;
  const revenueGenerated = enquiries.filter(e => e.estimated_price && ["converted", "completed"].includes(e.status))
    .reduce((s, e) => s + (e.estimated_price || 0), 0);

  const leadFollowUps = followUps.filter(f => f.enquiry_id === selectedLead?.id);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Users, label: "Total Leads", value: totalLeads, color: "text-blue-600", bg: "bg-blue-50" },
          { icon: Target, label: "Active Leads", value: activeLeads, color: "text-amber-600", bg: "bg-amber-50" },
          { icon: CheckCircle, label: "Confirmed", value: confirmedBookings, color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: TrendingUp, label: "Conversion", value: `${conversionRate}%`, color: "text-purple-600", bg: "bg-purple-50" },
          { icon: DollarSign, label: "Revenue", value: formatPrice(revenueGenerated), color: "text-green-600", bg: "bg-green-50" },
        ].map(s => (
          <Card key={s.label} className="border border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
              </div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = filtered.filter(e => e.status === stage.id);
            return (
              <div
                key={stage.id}
                className="w-[280px] flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>{stage.label}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">{stageLeads.length}</Badge>
                </div>

                <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-xl p-2 border border-border/40">
                  <AnimatePresence>
                    {stageLeads.map(lead => (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={() => handleDragStart(lead.id)}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <Card
                          className="border border-border/60 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{lead.name}</p>
                                <p className="text-[11px] text-muted-foreground">{lead.enquiry_number}</p>
                              </div>
                              <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {lead.enquiry_type && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{lead.enquiry_type}</Badge>
                              )}
                              {lead.source && lead.source !== "website" && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{lead.source}</Badge>
                              )}
                            </div>

                            <div className="space-y-0.5">
                              {lead.mobile && (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Phone className="w-3 h-3" /> {lead.mobile}
                                </div>
                              )}
                              {lead.city && (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <MapPin className="w-3 h-3" /> {lead.city}{lead.state ? `, ${lead.state}` : ""}
                                </div>
                              )}
                              {lead.event_date && (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Calendar className="w-3 h-3" /> {lead.event_date}
                                </div>
                              )}
                            </div>

                            {lead.estimated_price && (
                              <p className="text-xs font-bold text-emerald-600">{formatPrice(lead.estimated_price)}</p>
                            )}

                            {lead.follow_up_date && new Date(lead.follow_up_date) > new Date() && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600">
                                <Clock className="w-3 h-3" />
                                Follow-up: {format(new Date(lead.follow_up_date), "dd MMM, HH:mm")}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {stageLeads.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8">No leads</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedLead.name}
                  <Badge className={PIPELINE_STAGES.find(s => s.id === selectedLead.status)?.badge}>
                    {PIPELINE_STAGES.find(s => s.id === selectedLead.status)?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedLead.mobile && (
                    <a href={`tel:${selectedLead.mobile}`} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <Phone className="w-4 h-4 text-primary" /> {selectedLead.mobile}
                    </a>
                  )}
                  {selectedLead.email && (
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors truncate">
                      <Mail className="w-4 h-4 text-primary" /> <span className="truncate">{selectedLead.email}</span>
                    </a>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> {selectedLead.enquiry_type}</div>
                  <div><span className="text-muted-foreground">City:</span> {selectedLead.city || "N/A"}</div>
                  <div><span className="text-muted-foreground">Date:</span> {selectedLead.event_date || "N/A"}</div>
                  <div><span className="text-muted-foreground">Price:</span> {selectedLead.estimated_price ? formatPrice(selectedLead.estimated_price) : "N/A"}</div>
                </div>

                {/* Status Change */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Change Status</label>
                  <Select value={selectedLead.status} onValueChange={v => { moveToStage(selectedLead.id, v); setSelectedLead({ ...selectedLead, status: v }); }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Lead Source</label>
                  <Select value={selectedLead.source || "website"} onValueChange={v => { updateSource(selectedLead.id, v); setSelectedLead({ ...selectedLead, source: v }); }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
                  <Input
                    className="mt-1"
                    placeholder="Team member name"
                    defaultValue={selectedLead.assigned_to || ""}
                    onBlur={e => updateAssignedTo(selectedLead.id, e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Admin Notes</label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    placeholder="Add notes about this lead..."
                    defaultValue={selectedLead.admin_notes || ""}
                    onBlur={e => saveAdminNotes(selectedLead.id, e.target.value)}
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`https://wa.me/91${selectedLead.mobile?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                    </a>
                  </Button>
                  {selectedLead.instagram_id && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`https://instagram.com/${selectedLead.instagram_id}`} target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-4 h-4 mr-1" /> Instagram
                      </a>
                    </Button>
                  )}
                </div>

                {/* Follow-up Section */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Follow-ups
                  </h4>

                  {leadFollowUps.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                      {leadFollowUps.map(fu => (
                        <div key={fu.id} className="text-xs p-2 rounded-lg bg-muted/50 border border-border/40">
                          <p>{fu.note}</p>
                          {fu.scheduled_at && (
                            <p className="text-muted-foreground mt-1">
                              📅 {format(new Date(fu.scheduled_at), "dd MMM yyyy, HH:mm")}
                              {fu.completed && " ✅"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Follow-up note..."
                      value={followUpNote}
                      onChange={e => setFollowUpNote(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={e => setFollowUpDate(e.target.value)}
                      className="text-sm w-auto"
                    />
                    <Button size="sm" onClick={addFollowUp} disabled={!followUpNote}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCRMPipeline;
