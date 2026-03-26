import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Sheet, Upload, CheckCircle, Loader2, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const AdminGoogleSheet = () => {
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchSheetData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "read" },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        setSheetData(data.data);
        setLastSynced(new Date().toLocaleString());
      } else {
        throw new Error(data?.error || "Failed to read sheet");
      }
    } catch (err: any) {
      console.error("Sheet read error:", err);
      toast({ title: "Failed to load sheet data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: { action: "sync_all" },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Google Sheet Synced!", description: `${data.synced} events pushed to Google Sheet` });
        await fetchSheetData();
      } else {
        throw new Error(data?.error || "Sync failed");
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  // Filter rows by search
  const headerRow = sheetData.length > 2 ? sheetData[2] : [];
  const dataRows = sheetData.slice(4); // Skip title, count, header, empty row

  const filteredRows = search.trim()
    ? dataRows.filter((row) =>
        row.some((cell) => cell?.toLowerCase().includes(search.toLowerCase()))
      )
    : dataRows;

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("confirmed") || s.includes("completed")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (s.includes("cancelled")) return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Card */}
      <Card className="border border-border/40 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Sheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Google Sheet Sync</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connected to creativecaricatureclub@gmail.com
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {lastSynced && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Last read: {lastSynced}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSheetData}
                disabled={loading}
                className="text-xs h-8"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleFullSync}
                disabled={syncing}
                className="text-xs h-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                {syncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                {syncing ? "Syncing..." : "Push All Events to Sheet"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  const sheetId = "Check your admin settings";
                  window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, "_blank");
                }}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open Sheet
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Rows", value: dataRows.length, color: "from-blue-500 to-indigo-500" },
          { label: "Title Row", value: sheetData[0]?.[0] || "—", color: "from-violet-500 to-purple-500", isText: true },
          { label: "Event Count", value: sheetData[1]?.[1] || "0", color: "from-green-500 to-emerald-500" },
          { label: "Columns", value: headerRow.length || 0, color: "from-amber-500 to-orange-500" },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/40 bg-white shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{stat.label}</p>
              <p className={`text-xl font-black mt-1 ${stat.isText ? "text-sm" : ""}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search sheet data..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Data Table */}
      <Card className="border border-border/40 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Sheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No data found</p>
              <p className="text-xs mt-1">Click "Push All Events to Sheet" to sync your events</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[10px] font-bold w-8">#</TableHead>
                    {headerRow.map((h, i) => (
                      <TableHead key={i} className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs text-muted-foreground font-mono">{rowIdx + 1}</TableCell>
                      {headerRow.map((_, colIdx) => {
                        const cell = row[colIdx] || "";
                        // Payment Status column (index 4) or Status column (index 14)
                        if (colIdx === 4 || colIdx === 14) {
                          return (
                            <TableCell key={colIdx} className="text-xs">
                              {cell ? (
                                <Badge variant="outline" className={`text-[10px] ${getStatusBadge(cell)}`}>
                                  {cell}
                                </Badge>
                              ) : "—"}
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={colIdx} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                            {cell || "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminGoogleSheet;
