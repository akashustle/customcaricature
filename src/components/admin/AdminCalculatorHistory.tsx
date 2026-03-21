import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TrendingUp, Users, MapPin, Trash2, Plus, Save, X, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AdminCalculatorHistory = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricingSets, setPricingSets] = useState<any[]>([]);
  const [newSet, setNewSet] = useState({ label: "", price: "", details: "", is_active: true });
  const [editingSet, setEditingSet] = useState<any>(null);

  const fetchSessions = async () => {
    const { data } = await supabase.from("calculator_sessions").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setSessions(data);
    setLoading(false);
  };

  const fetchPricingSets = async () => {
    const { data } = await (supabase.from("calculator_pricing_sets" as any).select("*").order("sort_order", { ascending: true }) as any);
    if (data) setPricingSets(data);
  };

  useEffect(() => {
    fetchSessions();
    fetchPricingSets();
    const ch = supabase.channel("calc-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "calculator_sessions" }, () => fetchSessions())
      .on("postgres_changes", { event: "*", schema: "public", table: "calculator_pricing_sets" }, () => fetchPricingSets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const deleteSession = async (id: string) => {
    await supabase.from("calculator_sessions").delete().eq("id", id);
    toast({ title: "Session deleted" });
    fetchSessions();
  };

  const deleteAllSessions = async () => {
    await supabase.from("calculator_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "All sessions cleared" });
    fetchSessions();
  };

  const addPricingSet = async () => {
    if (!newSet.label || !newSet.price) return;
    await (supabase.from("calculator_pricing_sets" as any) as any).insert({
      label: newSet.label,
      price: parseFloat(newSet.price),
      details: newSet.details || null,
      is_active: newSet.is_active,
      sort_order: pricingSets.length,
    });
    setNewSet({ label: "", price: "", details: "", is_active: true });
    toast({ title: "Pricing set added" });
    fetchPricingSets();
  };

  const updatePricingSet = async () => {
    if (!editingSet) return;
    await supabase.from("calculator_pricing_sets").update({
      label: editingSet.label,
      price: parseFloat(editingSet.price),
      details: editingSet.details,
      is_active: editingSet.is_active,
    }).eq("id", editingSet.id);
    setEditingSet(null);
    toast({ title: "Updated" });
    fetchPricingSets();
  };

  const deletePricingSet = async (id: string) => {
    await supabase.from("calculator_pricing_sets").delete().eq("id", id);
    toast({ title: "Pricing set deleted" });
    fetchPricingSets();
  };

  const totalSessions = sessions.length;
  const mumbaiCount = sessions.filter(s => s.region === "mumbai").length;
  const bookedCount = sessions.filter(s => s.action_taken === "book_event").length;
  const enquiryCount = sessions.filter(s => s.action_taken === "enquiry").length;

  if (loading) return <p className="text-center text-muted-foreground py-10">Loading...</p>;

  return (
    <Tabs defaultValue="history" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />Calculator Analytics
        </h2>
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="pricing-sets">Pricing Sets</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="history" className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <MapPin className="w-5 h-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{mumbaiCount}</p>
            <p className="text-xs text-muted-foreground">Mumbai</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{bookedCount}</p>
            <p className="text-xs text-muted-foreground">Booked Event</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Calculator className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">{enquiryCount}</p>
            <p className="text-xs text-muted-foreground">Sent Enquiry</p>
          </CardContent></Card>
        </div>

        {sessions.length > 0 && (
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-1" />Clear All</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all calculator sessions?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAllSessions}>Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {sessions.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No calculator sessions yet</CardContent></Card>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Artists</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Clicked</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{format(new Date(s.created_at), "dd MMM, hh:mm a")}</TableCell>
                    <TableCell>{s.guest_count || "-"}</TableCell>
                    <TableCell className="text-xs">{s.city || "-"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.region || "-"}</Badge></TableCell>
                    <TableCell>{s.artist_count || "-"}</TableCell>
                    <TableCell className="font-semibold">₹{s.suggested_price?.toLocaleString("en-IN") || "-"}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${s.action_taken === "book_event" ? "bg-green-100 text-green-800" : s.action_taken === "enquiry" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                        {s.action_taken || "viewed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.clicked_link || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSession(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="pricing-sets" className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Add Pricing Set</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Label</Label>
                <Input value={newSet.label} onChange={e => setNewSet({ ...newSet, label: e.target.value })} placeholder="e.g. Single Face B&W" />
              </div>
              <div>
                <Label>Price (₹)</Label>
                <Input type="number" value={newSet.price} onChange={e => setNewSet({ ...newSet, price: e.target.value })} placeholder="3499" />
              </div>
            </div>
            <div>
              <Label>Details (shown to user)</Label>
              <Textarea value={newSet.details} onChange={e => setNewSet({ ...newSet, details: e.target.value })} placeholder="Includes frame, 25-30 days delivery..." rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newSet.is_active} onCheckedChange={v => setNewSet({ ...newSet, is_active: v })} />
              <Label>Active</Label>
            </div>
            <Button onClick={addPricingSet} disabled={!newSet.label || !newSet.price}><Plus className="w-4 h-4 mr-1" />Add Set</Button>
          </CardContent>
        </Card>

        {pricingSets.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No pricing sets yet. Add one above.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {pricingSets.map(ps => (
              <Card key={ps.id}>
                <CardContent className="p-4">
                  {editingSet?.id === ps.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editingSet.label} onChange={e => setEditingSet({ ...editingSet, label: e.target.value })} />
                        <Input type="number" value={editingSet.price} onChange={e => setEditingSet({ ...editingSet, price: e.target.value })} />
                      </div>
                      <Textarea value={editingSet.details || ""} onChange={e => setEditingSet({ ...editingSet, details: e.target.value })} rows={2} />
                      <div className="flex items-center gap-2">
                        <Switch checked={editingSet.is_active} onCheckedChange={v => setEditingSet({ ...editingSet, is_active: v })} />
                        <Label>Active</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={updatePricingSet}><Save className="w-3 h-3 mr-1" />Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSet(null)}><X className="w-3 h-3 mr-1" />Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{ps.label}</p>
                          <Badge variant={ps.is_active ? "default" : "secondary"}>{ps.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <p className="text-lg font-bold text-primary">₹{ps.price?.toLocaleString("en-IN")}</p>
                        {ps.details && <p className="text-xs text-muted-foreground mt-1">{ps.details}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSet(ps)}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePricingSet(ps.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default AdminCalculatorHistory;
