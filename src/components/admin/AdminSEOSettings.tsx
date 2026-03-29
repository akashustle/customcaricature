import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Save, Globe, Search, Zap, RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

const PAGES = [
  { id: "home", label: "Homepage", path: "/" },
  { id: "order", label: "Order Caricature", path: "/order" },
  { id: "book-event", label: "Book Event", path: "/book-event" },
  { id: "track-order", label: "Track Order", path: "/track-order" },
  { id: "shop", label: "Shop", path: "/shop" },
  { id: "blog", label: "Blog", path: "/blog" },
  { id: "about", label: "About Us", path: "/about" },
  { id: "enquiry", label: "Enquiry", path: "/enquiry" },
  { id: "support", label: "Support", path: "/support" },
  { id: "workshop", label: "Workshop", path: "/workshop" },
];

const BASE_URL = "https://portal.creativecaricatureclub.com";

type SEOData = {
  id: string;
  page_title: string;
  meta_description: string;
  seo_keywords: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
};

type IndexLog = {
  id: string;
  url: string;
  action_type: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

const AdminSEOSettings = () => {
  const [seoData, setSeoData] = useState<SEOData[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SEOData>>({});
  const [saving, setSaving] = useState(false);

  // Indexing state
  const [indexingUrl, setIndexingUrl] = useState("");
  const [indexingLoading, setIndexingLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [indexLogs, setIndexLogs] = useState<IndexLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchSEO();
    fetchIndexLogs();
    const ch = supabase.channel("seo-settings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_page_settings" }, fetchSEO)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchSEO = async () => {
    const { data } = await supabase.from("seo_page_settings" as any).select("*");
    if (data) setSeoData(data as any[]);
  };

  const fetchIndexLogs = useCallback(async () => {
    setLogsLoading(true);
    const { data } = await supabase
      .from("google_indexing_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setIndexLogs(data as any[]);
    setLogsLoading(false);
  }, []);

  const handleEdit = (pageId: string) => {
    const existing = seoData.find(s => s.id === pageId);
    setEditing(pageId);
    setEditForm(existing || { id: pageId, page_title: "", meta_description: "", seo_keywords: "", og_title: "", og_description: "", og_image: "" });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    await supabase.from("seo_page_settings" as any).upsert({
      id: editing,
      page_title: editForm.page_title || "",
      meta_description: editForm.meta_description || "",
      seo_keywords: editForm.seo_keywords || "",
      og_title: editForm.og_title || null,
      og_description: editForm.og_description || null,
      og_image: editForm.og_image || null,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "id" });
    toast({ title: "SEO settings saved!" });
    setEditing(null);
    setSaving(false);
    fetchSEO();
  };

  /* ── Google Indexing Actions ── */
  const submitSingleUrl = async () => {
    const url = indexingUrl.trim();
    if (!url) {
      toast({ title: "Enter a URL", variant: "destructive" });
      return;
    }
    setIndexingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-indexing", {
        body: { action: "submit", url, type: "URL_UPDATED" },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ URL submitted to Google!", description: url });
      } else {
        toast({ title: "⚠️ Submission failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
      fetchIndexLogs();
      setIndexingUrl("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIndexingLoading(false);
  };

  const submitAllPages = async () => {
    setBatchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-indexing", {
        body: { action: "auto_submit_all" },
      });
      if (error) throw error;
      toast({
        title: `🚀 Indexed ${data?.sent || 0}/${data?.total || 0} URLs`,
        description: `Static: ${data?.breakdown?.static || 0} | Blog: ${data?.breakdown?.blog || 0} | CMS: ${data?.breakdown?.cms || 0} | SEO: ${data?.breakdown?.seo || 0}`,
      });
      fetchIndexLogs();
    } catch (err: any) {
      toast({ title: "Batch indexing failed", description: err.message, variant: "destructive" });
    }
    setBatchLoading(false);
  };

  const submitPageUrl = async (path: string) => {
    const fullUrl = `${BASE_URL}${path}`;
    setIndexingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-indexing", {
        body: { action: "submit", url: fullUrl, type: "URL_UPDATED" },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Indexed!", description: fullUrl });
      } else {
        toast({ title: "Failed", description: data?.error, variant: "destructive" });
      }
      fetchIndexLogs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIndexingLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Google Instant Indexing Section */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-display">Google Instant Indexing</CardTitle>
            <Badge variant="secondary" className="text-[10px]">API Connected</Badge>
          </div>
          <p className="text-xs text-muted-foreground font-body">Submit URLs directly to Google Search Console for instant crawling & indexing.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single URL Submit */}
          <div className="flex gap-2">
            <Input
              value={indexingUrl}
              onChange={(e) => setIndexingUrl(e.target.value)}
              placeholder="https://portal.creativecaricatureclub.com/blog/my-post"
              className="text-sm flex-1"
            />
            <Button size="sm" onClick={submitSingleUrl} disabled={indexingLoading}>
              {indexingLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
              Index Now
            </Button>
          </div>

          {/* Batch Submit All */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={submitAllPages}
              disabled={batchLoading}
              className="border-primary/30"
            >
              {batchLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              {batchLoading ? "Submitting all pages..." : "🚀 Index All Pages (Static + Blog + CMS + SEO)"}
            </Button>
            <span className="text-[10px] text-muted-foreground">Submits every public URL to Google at once</span>
          </div>

          {/* Recent Logs */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold font-body">Recent Indexing Activity</h4>
              <Button size="sm" variant="ghost" onClick={fetchIndexLogs} disabled={logsLoading} className="h-6 px-2 text-[10px]">
                <RefreshCw className={`w-3 h-3 mr-1 ${logsLoading ? "animate-spin" : ""}`} />Refresh
              </Button>
            </div>
            {indexLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No indexing activity yet. Submit a URL to get started.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 rounded border p-2 bg-muted/30">
                {indexLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/50 last:border-0">
                    {log.success ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                    )}
                    <span className="truncate flex-1 font-mono">{log.url.replace(BASE_URL, "")}</span>
                    <Badge variant={log.success ? "default" : "destructive"} className="text-[9px] h-4 px-1">
                      {log.action_type === "URL_UPDATED" ? "Updated" : "Deleted"}
                    </Badge>
                    <span className="text-muted-foreground whitespace-nowrap">
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                      {new Date(log.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Page SEO Settings */}
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-primary" />
        <h2 className="font-display text-lg font-bold">Page SEO Settings</h2>
      </div>
      <p className="text-sm text-muted-foreground font-body">Edit SEO title, meta description, keywords, and Open Graph tags for each page.</p>
      
      <div className="grid gap-3">
        {PAGES.map(page => {
          const data = seoData.find(s => s.id === page.id);
          const isEditing = editing === page.id;

          return (
            <Card key={page.id} className="border">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-body font-semibold">{page.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{page.path}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => submitPageUrl(page.path)}
                      disabled={indexingLoading}
                      title="Index this page on Google now"
                      className="h-7 w-7 p-0"
                    >
                      <Zap className="w-3.5 h-3.5 text-primary" />
                    </Button>
                    <Button size="sm" variant={isEditing ? "default" : "outline"} onClick={() => isEditing ? handleSave() : handleEdit(page.id)} disabled={saving}>
                      {isEditing ? <><Save className="w-3 h-3 mr-1" />Save</> : <><Search className="w-3 h-3 mr-1" />Edit SEO</>}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isEditing && (
                <CardContent className="pt-0 px-4 pb-4 space-y-3">
                  <div>
                    <Label className="text-xs font-body">Page Title</Label>
                    <Input value={editForm.page_title || ""} onChange={e => setEditForm(p => ({ ...p, page_title: e.target.value }))} placeholder="Page title for SEO" className="text-sm" />
                    <p className="text-[10px] text-muted-foreground mt-1">{(editForm.page_title || "").length}/60 characters</p>
                  </div>
                  <div>
                    <Label className="text-xs font-body">Meta Description</Label>
                    <Textarea value={editForm.meta_description || ""} onChange={e => setEditForm(p => ({ ...p, meta_description: e.target.value }))} placeholder="Meta description for search results" className="text-sm" rows={2} />
                    <p className="text-[10px] text-muted-foreground mt-1">{(editForm.meta_description || "").length}/160 characters</p>
                  </div>
                  <div>
                    <Label className="text-xs font-body">SEO Keywords</Label>
                    <Input value={editForm.seo_keywords || ""} onChange={e => setEditForm(p => ({ ...p, seo_keywords: e.target.value }))} placeholder="keyword1, keyword2, keyword3" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-body">OG Title (Social Sharing)</Label>
                    <Input value={editForm.og_title || ""} onChange={e => setEditForm(p => ({ ...p, og_title: e.target.value }))} placeholder="Title for social sharing" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-body">OG Description</Label>
                    <Textarea value={editForm.og_description || ""} onChange={e => setEditForm(p => ({ ...p, og_description: e.target.value }))} placeholder="Description for social sharing" className="text-sm" rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs font-body">OG Image URL</Label>
                    <Input value={editForm.og_image || ""} onChange={e => setEditForm(p => ({ ...p, og_image: e.target.value }))} placeholder="https://..." className="text-sm" />
                  </div>
                  {data && (
                    <p className="text-[10px] text-muted-foreground">Current: {data.page_title || "(not set)"}</p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSEOSettings;
