import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
};

const EMPTY_POST = {
  title: "", slug: "", excerpt: "", content: "", cover_image: "",
  category: "tutorial", tags: [] as string[], author_name: "Creative Caricature Club",
  is_published: false, meta_title: "", meta_description: "",
};

const AdminBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [showEditor, setShowEditor] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data as any);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_POST);
    setTagsInput("");
    setShowEditor(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content,
      cover_image: post.cover_image || "", category: post.category,
      tags: post.tags || [], author_name: post.author_name,
      is_published: post.is_published, meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
    });
    setTagsInput((post.tags || []).join(", "));
    setShowEditor(true);
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) {
      toast({ title: "Title and slug are required", variant: "destructive" });
      return;
    }

    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    const payload: any = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      cover_image: form.cover_image || null,
      category: form.category,
      tags,
      author_name: form.author_name,
      is_published: form.is_published,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      published_at: form.is_published ? (editing?.published_at || new Date().toISOString()) : null,
    };

    if (editing) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Post Updated!" });
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Post Created!" });
    }

    setShowEditor(false);
    fetchPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const newState = !post.is_published;
    await supabase.from("blog_posts").update({
      is_published: newState,
      published_at: newState ? (post.published_at || new Date().toISOString()) : null,
    } as any).eq("id", post.id);
    toast({ title: newState ? "Published!" : "Unpublished" });
    fetchPosts();
  };

  const deletePost = async (id: string) => {
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ title: "Post Deleted" });
    fetchPosts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Blog Posts</h2>
        <Button size="sm" onClick={openNew} className="rounded-full font-sans">
          <Plus className="w-4 h-4 mr-1" /> New Post
        </Button>
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit Post" : "New Blog Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="font-sans">Title *</Label>
                <Input value={form.title} onChange={(e) => {
                  setForm({ ...form, title: e.target.value, slug: editing ? form.slug : generateSlug(e.target.value) });
                }} className="font-sans" />
              </div>
              <div>
                <Label className="font-sans">Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="font-sans" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="font-sans">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                    <SelectItem value="case_study">Case Study</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="tips">Tips & Tricks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-sans">Author</Label>
                <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="font-sans" />
              </div>
            </div>

            <div>
              <Label className="font-sans">Cover Image URL</Label>
              <Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="https://..." className="font-sans" />
            </div>

            <div>
              <Label className="font-sans">Tags (comma-separated)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="caricature, art, tutorial" className="font-sans" />
            </div>

            <div>
              <Label className="font-sans">Excerpt (shown in listing)</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className="font-sans" />
            </div>

            <div>
              <Label className="font-sans">Content (supports basic markdown: ## headings, - lists, ![](image))</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} className="font-sans font-mono text-sm" />
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-sans font-semibold text-sm text-muted-foreground">SEO Settings</h4>
              <div>
                <Label className="font-sans">Meta Title (optional, defaults to post title)</Label>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} className="font-sans" />
              </div>
              <div>
                <Label className="font-sans">Meta Description (optional, defaults to excerpt)</Label>
                <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} rows={2} className="font-sans" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label className="font-sans">{form.is_published ? "Published" : "Draft"}</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditor(false)} className="font-sans">Cancel</Button>
              <Button onClick={handleSave} className="font-sans">{editing ? "Update" : "Create"} Post</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Posts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-sans">Title</TableHead>
                <TableHead className="font-sans hidden md:table-cell">Category</TableHead>
                <TableHead className="font-sans hidden md:table-cell">Status</TableHead>
                <TableHead className="font-sans hidden md:table-cell">Date</TableHead>
                <TableHead className="font-sans text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-sans font-medium">{post.title}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="font-sans text-xs">{post.category}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={post.is_published ? "default" : "secondary"} className="font-sans text-xs">
                      {post.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-sans text-xs hidden md:table-cell">
                    {new Date(post.created_at).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => togglePublish(post)} title={post.is_published ? "Unpublish" : "Publish"}>
                        {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePost(post.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {posts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground font-sans">
                    No blog posts yet. Click "New Post" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBlog;
