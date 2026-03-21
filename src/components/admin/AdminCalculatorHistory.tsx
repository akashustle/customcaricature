import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, Users, MapPin } from "lucide-react";
import { format } from "date-fns";

const AdminCalculatorHistory = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    const { data } = await supabase.from("calculator_sessions").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
    const ch = supabase.channel("calc-sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "calculator_sessions" }, () => fetchSessions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const totalSessions = sessions.length;
  const mumbaiCount = sessions.filter(s => s.region === "mumbai").length;
  const bookedCount = sessions.filter(s => s.action_taken === "book_event").length;
  const enquiryCount = sessions.filter(s => s.action_taken === "enquiry").length;

  if (loading) return <p className="text-center text-muted-foreground py-10">Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />Calculator Analytics
      </h2>

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminCalculatorHistory;
