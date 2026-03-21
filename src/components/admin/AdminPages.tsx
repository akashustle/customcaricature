import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Edit2, X, FileText, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

type CmsPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
  created_at: string;
};

const AdminPages = () => {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPage, setNewPage] = useState({ title: "", slug: "", content: "" });
  const [previewPage, setPreviewPage] = useState<CmsPage | null>(null);

  const fetchPages = async () => {
    const { data } = await supabase.from("cms_pages").select("*").order("sort_order");
    if (data) setPages(data as CmsPage[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPages();
    const ch = supabase.channel("cms-pages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cms_pages" }, () => fetchPages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const savePage = async () => {
    if (!editingPage) return;
    const { error } = await supabase.from("cms_pages").update({
      title: editingPage.title,
      slug: editingPage.slug,
      content: editingPage.content,
      is_active: editingPage.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", editingPage.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Page Updated!" }); setEditingPage(null); fetchPages(); }
  };

  const addPage = async () => {
    if (!newPage.title || !newPage.slug) return;
    const { error } = await supabase.from("cms_pages").insert({
      title: newPage.title,
      slug: newPage.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      content: newPage.content,
      sort_order: pages.length + 1,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Page Created!" }); setShowAdd(false); setNewPage({ title: "", slug: "", content: "" }); fetchPages(); }
  };

  const deletePage = async (id: string) => {
    await supabase.from("cms_pages").delete().eq("id", id);
    toast({ title: "Page Deleted" });
    fetchPages();
  };

  const toggleActive = async (page: CmsPage) => {
    await supabase.from("cms_pages").update({ is_active: !page.is_active, updated_at: new Date().toISOString() }).eq("id", page.id);
    fetchPages();
  };

  if (loading) return <p className="text-center text-muted-foreground py-10">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />Pages Management ({pages.length})
        </h2>
        <Button onClick={() => setShowAdd(true)} size="sm"><Plus className="w-4 h-4 mr-1" />Add Page</Button>
      </div>

      <div className="grid gap-3">
        {pages.map((page) => (
          <Card key={page.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{page.title}</h3>
                    <Badge variant={page.is_active ? "default" : "secondary"} className="text-[10px]">
                      {page.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">/{page.slug}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last edited: {format(new Date(page.updated_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{page.content.substring(0, 120)}...</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch checked={page.is_active} onCheckedChange={() => toggleActive(page)} />
                  <Button variant="ghost" size="sm" onClick={() => setPreviewPage(page)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingPage({ ...page })}><Edit2 className="w-4 h-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{page.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePage(page.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Page Dialog */}
      <Dialog open={!!editingPage} onOpenChange={(o) => !o && setEditingPage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Page</DialogTitle></DialogHeader>
          {editingPage && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editingPage.title} onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={editingPage.slug} onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })} /></div>
              <div><Label>Content</Label><Textarea value={editingPage.content} onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })} rows={20} className="font-mono text-xs" /></div>
              <div className="flex gap-2">
                <Button onClick={savePage}><Save className="w-4 h-4 mr-1" />Save</Button>
                <Button variant="ghost" onClick={() => setEditingPage(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Page Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Page</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newPage.title} onChange={(e) => setNewPage({ ...newPage, title: e.target.value })} placeholder="Page Title" /></div>
            <div><Label>Slug (URL path)</Label><Input value={newPage.slug} onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })} placeholder="e.g. custom-caricature-policy" /></div>
            <div><Label>Content</Label><Textarea value={newPage.content} onChange={(e) => setNewPage({ ...newPage, content: e.target.value })} rows={10} placeholder="Page content..." /></div>
            <Button onClick={addPage} disabled={!newPage.title || !newPage.slug}><Plus className="w-4 h-4 mr-1" />Create Page</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={(o) => !o && setPreviewPage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{previewPage?.title}</DialogTitle></DialogHeader>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/80">{previewPage?.content}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPages;
