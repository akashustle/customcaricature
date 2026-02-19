import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X, FileText, Upload, UserPlus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

type Artist = {
  id: string;
  name: string;
  experience: string | null;
  portfolio_url: string | null;
  email: string | null;
  mobile: string | null;
  auth_user_id: string | null;
  created_at: string;
};

const AdminArtists = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newArtist, setNewArtist] = useState({ name: "", experience: "", email: "", mobile: "", password: "" });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", experience: "", email: "", mobile: "" });

  useEffect(() => {
    fetchArtists();
    const ch = supabase.channel("admin-artists-rt").on("postgres_changes", { event: "*", schema: "public", table: "artists" }, () => fetchArtists()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchArtists = async () => {
    const { data } = await supabase.from("artists").select("*").order("created_at", { ascending: false });
    if (data) {
      setArtists(data as any);
      // Generate signed URLs for portfolios
      const urls: Record<string, string> = {};
      for (const a of data as any[]) {
        if (a.portfolio_url) {
          let path = a.portfolio_url;
          if (path.includes("/artist-portfolios/")) path = path.split("/artist-portfolios/")[1];
          if (!path.startsWith("http")) {
            const { data: signed } = await supabase.storage.from("artist-portfolios").createSignedUrl(path, 3600);
            if (signed?.signedUrl) urls[a.id] = signed.signedUrl;
          } else {
            urls[a.id] = path;
          }
        }
      }
      setSignedUrls(urls);
    }
    setLoading(false);
  };

  const addArtist = async () => {
    if (!newArtist.name) return;
    setAdding(true);
    try {
      let portfolioUrl: string | null = null;
      if (portfolioFile) {
        const path = `${crypto.randomUUID()}_${portfolioFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("artist-portfolios").upload(path, portfolioFile);
        if (uploadErr) throw uploadErr;
        // Store just the path, not a public URL (bucket is private)
        portfolioUrl = path;
      }

      // If email & password provided, create artist account
      if (newArtist.email && newArtist.password) {
        const { data, error } = await supabase.functions.invoke("admin-create-user", {
          body: {
            email: newArtist.email,
            password: newArtist.password,
            full_name: newArtist.name,
            mobile: newArtist.mobile || "0000000000",
            make_artist: true,
            artist_name: newArtist.name,
            experience: newArtist.experience || null,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        // Update portfolio if uploaded
        if (portfolioUrl && data?.user_id) {
          await (supabase.from("artists").update({ portfolio_url: portfolioUrl } as any) as any).eq("auth_user_id", data.user_id);
        }
      } else {
        // Create artist without login
        const { error: insertError } = await (supabase.from("artists") as any).insert({
          name: newArtist.name,
          experience: newArtist.experience || null,
          portfolio_url: portfolioUrl,
          email: newArtist.email || null,
          mobile: newArtist.mobile || null,
        });
        if (insertError) throw insertError;
      }

      toast({ title: "Artist Added!" });
      setShowAdd(false);
      setNewArtist({ name: "", experience: "", email: "", mobile: "", password: "" });
      setPortfolioFile(null);
      fetchArtists();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (id: string) => {
    await supabase.from("artists").update({
      name: editData.name,
      experience: editData.experience || null,
      email: editData.email || null,
      mobile: editData.mobile || null,
    } as any).eq("id", id);
    toast({ title: "Artist Updated" });
    setEditingId(null);
    fetchArtists();
  };

  const updatePortfolio = async (id: string, file: File) => {
    const path = `${crypto.randomUUID()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("artist-portfolios").upload(path, file);
    if (uploadErr) { toast({ title: "Upload Error", description: uploadErr.message, variant: "destructive" }); return; }
    // Store just the path (bucket is private, we'll use signed URLs to view)
    await supabase.from("artists").update({ portfolio_url: path } as any).eq("id", id);
    toast({ title: "Portfolio Updated" });
    fetchArtists();
  };

  const deleteArtist = async (id: string) => {
    await supabase.from("artists").delete().eq("id", id);
    toast({ title: "Artist Deleted" });
    fetchArtists();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-bold">Artists ({artists.length})</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-sans rounded-full btn-3d"><Plus className="w-4 h-4 mr-1" />Add Artist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add New Artist</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={newArtist.name} onChange={e => setNewArtist({ ...newArtist, name: e.target.value })} placeholder="Artist name" /></div>
              <div><Label>Experience</Label><Textarea value={newArtist.experience} onChange={e => setNewArtist({ ...newArtist, experience: e.target.value })} placeholder="e.g. 5 years..." /></div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-sans text-muted-foreground mb-2 flex items-center gap-1"><UserPlus className="w-3 h-3" /> Artist Login Credentials (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={newArtist.email} onChange={e => setNewArtist({ ...newArtist, email: e.target.value })} placeholder="artist@email.com" /></div>
                  <div><Label>Mobile</Label><Input value={newArtist.mobile} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setNewArtist({ ...newArtist, mobile: d }); }} placeholder="9876543210" maxLength={10} /></div>
                </div>
                <div className="mt-2"><Label>Password</Label><Input type="password" value={newArtist.password} onChange={e => setNewArtist({ ...newArtist, password: e.target.value })} placeholder="Min 6 chars" /></div>
              </div>
              <div>
                <Label className="flex items-center gap-1"><FileText className="w-4 h-4" />Portfolio (PDF)</Label>
                <Input type="file" accept=".pdf" onChange={e => setPortfolioFile(e.target.files?.[0] || null)} />
                {portfolioFile && <p className="text-xs text-muted-foreground mt-1">{portfolioFile.name}</p>}
              </div>
              <Button onClick={addArtist} disabled={!newArtist.name || adding} className="w-full font-sans btn-3d">
                {adding ? "Adding..." : newArtist.email ? "Create Artist with Login" : "Add Artist"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p> : artists.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No artists added yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {artists.map(artist => (
            <Card key={artist.id} className="card-3d">
              <CardContent className="p-4">
                {editingId === artist.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Name</Label><Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} /></div>
                      <div><Label className="text-xs">Mobile</Label><Input value={editData.mobile} onChange={e => { const d = e.target.value.replace(/\D/g, ""); if (d.length <= 10) setEditData({ ...editData, mobile: d }); }} maxLength={10} /></div>
                    </div>
                    <div><Label className="text-xs">Email</Label><Input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} /></div>
                    <div><Label className="text-xs">Experience</Label><Textarea value={editData.experience} onChange={e => setEditData({ ...editData, experience: e.target.value })} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(artist.id)} className="font-sans"><Save className="w-4 h-4 mr-1" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-sans font-semibold">{artist.name}</p>
                        {artist.auth_user_id && <Badge className="text-[10px] bg-primary/10 text-primary border-none">Has Login</Badge>}
                      </div>
                      {artist.email && <p className="text-xs text-muted-foreground font-sans">{artist.email}</p>}
                      {artist.experience && <p className="text-xs text-muted-foreground font-sans">{artist.experience}</p>}
                      {(artist.portfolio_url || signedUrls[artist.id]) && (
                        <a href={signedUrls[artist.id] || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-sans underline flex items-center gap-1">
                          <FileText className="w-3 h-3" />View Portfolio
                        </a>
                      )}
                      <p className="text-[10px] text-muted-foreground font-sans">Added: {new Date(artist.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <label className="cursor-pointer">
                        <input type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) updatePortfolio(artist.id, e.target.files[0]); }} />
                        <Button variant="ghost" size="sm" asChild><span><Upload className="w-4 h-4" /></span></Button>
                      </label>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(artist.id); setEditData({ name: artist.name, experience: artist.experience || "", email: artist.email || "", mobile: artist.mobile || "" }); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Artist?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this artist.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteArtist(artist.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminArtists;
