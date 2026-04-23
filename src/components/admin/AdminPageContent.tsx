import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, FileText } from "lucide-react";

const KEYS = ["page_about", "page_ai_caricature", "global_contact"];

const AdminPageContent = () => {
  const [data, setData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("admin_site_settings").select("id, value").in("id", KEYS);
      const map: Record<string, any> = {};
      rows?.forEach((r: any) => { map[r.id] = r.value; });
      setData(map);

      const { data: pages } = await supabase
        .from("cms_pages").select("*").order("slug");
      setPolicies(pages || []);
    })();
  }, []);

  const update = (key: string, value: any) => setData(prev => ({ ...prev, [key]: value }));
  const updatePolicy = (i: number, field: string, value: any) => {
    setPolicies(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n; });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const k of KEYS) {
        if (data[k]) {
          await supabase.from("admin_site_settings").upsert({ id: k, value: data[k], updated_at: new Date().toISOString() } as any);
        }
      }
      for (const p of policies) {
        await supabase.from("cms_pages").update({
          title: p.title, content: p.content, is_active: p.is_active, updated_at: new Date().toISOString(),
        }).eq("id", p.id);
      }
      toast({ title: "✅ Page content saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const about = data.page_about || {};
  const ai = data.page_ai_caricature || {};
  const contact = data.global_contact || {};

  return (
    <div className="space-y-6 admin-panel-font">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="admin-section-header flex items-center gap-2"><FileText className="w-5 h-5" /> Page Content Editor</h2>
          <p className="admin-section-subtitle">Edit About page, AI Caricature, contact info, and all 9 legal/policy pages</p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="rounded-full gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      <Tabs defaultValue="about">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="about" className="text-xs">About Page</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">AI Caricature</TabsTrigger>
          <TabsTrigger value="contact" className="text-xs">Global Contact</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs">Legal & Policies</TabsTrigger>
        </TabsList>

        {/* ABOUT */}
        <TabsContent value="about" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Founder & Hero</CardTitle></CardHeader><CardContent className="space-y-3">
            <Input placeholder="Founder label" value={about.founder_label || ""} onChange={e => update("page_about", { ...about, founder_label: e.target.value })} />
            <Input placeholder="Founder name" value={about.founder_name || ""} onChange={e => update("page_about", { ...about, founder_name: e.target.value })} />
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Stats (4 cards)</CardTitle></CardHeader><CardContent className="space-y-2">
            {(about.stats || []).map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-3" placeholder="Icon (Calendar/Users/Heart/Award)" value={s.icon || ""} onChange={e => { const n = [...about.stats]; n[i] = { ...s, icon: e.target.value }; update("page_about", { ...about, stats: n }); }} />
                <Input className="col-span-3" placeholder="Value" value={s.val || ""} onChange={e => { const n = [...about.stats]; n[i] = { ...s, val: e.target.value }; update("page_about", { ...about, stats: n }); }} />
                <Input className="col-span-5" placeholder="Label" value={s.label || ""} onChange={e => { const n = [...about.stats]; n[i] = { ...s, label: e.target.value }; update("page_about", { ...about, stats: n }); }} />
                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => update("page_about", { ...about, stats: about.stats.filter((_: any, j: number) => j !== i) })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => update("page_about", { ...about, stats: [...(about.stats || []), { icon: "Calendar", val: "", label: "" }] })}><Plus className="w-3 h-3 mr-1" /> Add Stat</Button>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Intro Paragraphs (HTML allowed)</CardTitle></CardHeader><CardContent className="space-y-2">
            {(about.intro_paragraphs || []).map((p: string, i: number) => (
              <div key={i} className="flex gap-2">
                <Textarea value={p} onChange={e => { const n = [...about.intro_paragraphs]; n[i] = e.target.value; update("page_about", { ...about, intro_paragraphs: n }); }} rows={2} />
                <Button variant="ghost" size="icon" onClick={() => update("page_about", { ...about, intro_paragraphs: about.intro_paragraphs.filter((_: any, j: number) => j !== i) })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => update("page_about", { ...about, intro_paragraphs: [...(about.intro_paragraphs || []), ""] })}><Plus className="w-3 h-3 mr-1" /> Add Paragraph</Button>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Services Offered</CardTitle></CardHeader><CardContent className="space-y-3">
            <Input placeholder="Section title" value={about.services_title || ""} onChange={e => update("page_about", { ...about, services_title: e.target.value })} />
            {(about.services || []).map((s: any, i: number) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                <Input placeholder="Title" value={s.title || ""} onChange={e => { const n = [...about.services]; n[i] = { ...s, title: e.target.value }; update("page_about", { ...about, services: n }); }} />
                <Textarea placeholder="Description" rows={2} value={s.desc || ""} onChange={e => { const n = [...about.services]; n[i] = { ...s, desc: e.target.value }; update("page_about", { ...about, services: n }); }} />
                <Input placeholder="Sub-text (e.g. Weddings, Birthdays...)" value={s.sub || ""} onChange={e => { const n = [...about.services]; n[i] = { ...s, sub: e.target.value }; update("page_about", { ...about, services: n }); }} />
                <Button variant="ghost" size="sm" onClick={() => update("page_about", { ...about, services: about.services.filter((_: any, j: number) => j !== i) })}><Trash2 className="w-3 h-3 mr-1 text-destructive" /> Remove</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => update("page_about", { ...about, services: [...(about.services || []), { title: "", desc: "", sub: "" }] })}><Plus className="w-3 h-3 mr-1" /> Add Service</Button>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Contact Block</CardTitle></CardHeader><CardContent className="space-y-3">
            <Input placeholder="Section title" value={about.contact_title || ""} onChange={e => update("page_about", { ...about, contact_title: e.target.value })} />
            {(about.contacts || []).map((c: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-2" placeholder="Icon" value={c.icon || ""} onChange={e => { const n = [...about.contacts]; n[i] = { ...c, icon: e.target.value }; update("page_about", { ...about, contacts: n }); }} />
                <Input className="col-span-4" placeholder="Link/href" value={c.href || ""} onChange={e => { const n = [...about.contacts]; n[i] = { ...c, href: e.target.value }; update("page_about", { ...about, contacts: n }); }} />
                <Input className="col-span-5" placeholder="Display text" value={c.text || ""} onChange={e => { const n = [...about.contacts]; n[i] = { ...c, text: e.target.value }; update("page_about", { ...about, contacts: n }); }} />
                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => update("page_about", { ...about, contacts: about.contacts.filter((_: any, j: number) => j !== i) })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => update("page_about", { ...about, contacts: [...(about.contacts || []), { icon: "Mail", href: "", text: "" }] })}><Plus className="w-3 h-3 mr-1" /> Add Contact</Button>
            <p className="text-xs text-muted-foreground">Available icons: Mail, Phone, Instagram, Facebook, Youtube, Twitter, Linkedin, Globe</p>
          </CardContent></Card>
        </TabsContent>

        {/* AI CARICATURE */}
        <TabsContent value="ai" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Page Headings & Buttons</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Header title" value={ai.header_title || ""} onChange={e => update("page_ai_caricature", { ...ai, header_title: e.target.value })} />
            <div />
            <Input placeholder="Step 1 title" value={ai.step1_title || ""} onChange={e => update("page_ai_caricature", { ...ai, step1_title: e.target.value })} />
            <Input placeholder="Step 1 button" value={ai.step1_button || ""} onChange={e => update("page_ai_caricature", { ...ai, step1_button: e.target.value })} />
            <Input className="md:col-span-2" placeholder="Step 1 subtitle" value={ai.step1_subtitle || ""} onChange={e => update("page_ai_caricature", { ...ai, step1_subtitle: e.target.value })} />
            <Input placeholder="Step 2 title" value={ai.step2_title || ""} onChange={e => update("page_ai_caricature", { ...ai, step2_title: e.target.value })} />
            <Input placeholder="Step 2 button (idle)" value={ai.step2_button_idle || ""} onChange={e => update("page_ai_caricature", { ...ai, step2_button_idle: e.target.value })} />
            <Input placeholder="Step 2 button (loading)" value={ai.step2_button_loading || ""} onChange={e => update("page_ai_caricature", { ...ai, step2_button_loading: e.target.value })} />
            <div />
            <Input placeholder="Step 3 title" value={ai.step3_title || ""} onChange={e => update("page_ai_caricature", { ...ai, step3_title: e.target.value })} />
            <Input placeholder="Step 3 back button" value={ai.step3_button_back || ""} onChange={e => update("page_ai_caricature", { ...ai, step3_button_back: e.target.value })} />
            <Input placeholder="Step 3 next button" value={ai.step3_button_next || ""} onChange={e => update("page_ai_caricature", { ...ai, step3_button_next: e.target.value })} />
            <div />
            <Input placeholder="Step 4 title" value={ai.step4_title || ""} onChange={e => update("page_ai_caricature", { ...ai, step4_title: e.target.value })} />
            <Input placeholder="Step 4 button" value={ai.step4_button || ""} onChange={e => update("page_ai_caricature", { ...ai, step4_button: e.target.value })} />
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Styles</CardTitle></CardHeader><CardContent className="space-y-2">
            {(ai.styles || []).map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-3" placeholder="ID" value={s.id || ""} onChange={e => { const n = [...ai.styles]; n[i] = { ...s, id: e.target.value }; update("page_ai_caricature", { ...ai, styles: n }); }} />
                <Input className="col-span-3" placeholder="Label" value={s.label || ""} onChange={e => { const n = [...ai.styles]; n[i] = { ...s, label: e.target.value }; update("page_ai_caricature", { ...ai, styles: n }); }} />
                <Input className="col-span-5" placeholder="Tailwind gradient (from-x to-y)" value={s.color || ""} onChange={e => { const n = [...ai.styles]; n[i] = { ...s, color: e.target.value }; update("page_ai_caricature", { ...ai, styles: n }); }} />
                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => update("page_ai_caricature", { ...ai, styles: ai.styles.filter((_: any, j: number) => j !== i) })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => update("page_ai_caricature", { ...ai, styles: [...(ai.styles || []), { id: "", label: "", color: "from-blue-400 to-purple-500" }] })}><Plus className="w-3 h-3 mr-1" /> Add Style</Button>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Product Types</CardTitle></CardHeader><CardContent className="space-y-2">
            {(ai.products || []).map((p: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-3" placeholder="ID" value={p.id || ""} onChange={e => { const n = [...ai.products]; n[i] = { ...p, id: e.target.value }; update("page_ai_caricature", { ...ai, products: n }); }} />
                <Input className="col-span-4" placeholder="Label" value={p.label || ""} onChange={e => { const n = [...ai.products]; n[i] = { ...p, label: e.target.value }; update("page_ai_caricature", { ...ai, products: n }); }} />
                <Input className="col-span-4" placeholder="Icon (Shirt/Coffee/ImageIcon/Frame)" value={p.icon || ""} onChange={e => { const n = [...ai.products]; n[i] = { ...p, icon: e.target.value }; update("page_ai_caricature", { ...ai, products: n }); }} />
                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => update("page_ai_caricature", { ...ai, products: ai.products.filter((_: any, j: number) => j !== i) })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => update("page_ai_caricature", { ...ai, products: [...(ai.products || []), { id: "", label: "", icon: "Shirt" }] })}><Plus className="w-3 h-3 mr-1" /> Add Product</Button>
          </CardContent></Card>
        </TabsContent>

        {/* GLOBAL CONTACT */}
        <TabsContent value="contact">
          <Card><CardHeader><CardTitle className="text-base">Manager & Social Links (used across the site)</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Manager name" value={contact.manager_name || ""} onChange={e => update("global_contact", { ...contact, manager_name: e.target.value })} />
            <Input placeholder="Manager role" value={contact.manager_role || ""} onChange={e => update("global_contact", { ...contact, manager_role: e.target.value })} />
            <Input placeholder="WhatsApp number (e.g. 918369594271)" value={contact.whatsapp_number || ""} onChange={e => update("global_contact", { ...contact, whatsapp_number: e.target.value })} />
            <Input placeholder="Email" value={contact.email || ""} onChange={e => update("global_contact", { ...contact, email: e.target.value })} />
            <Input placeholder="Instagram handle (no @)" value={contact.instagram_handle || ""} onChange={e => update("global_contact", { ...contact, instagram_handle: e.target.value })} />
            <Input placeholder="Instagram URL" value={contact.instagram_url || ""} onChange={e => update("global_contact", { ...contact, instagram_url: e.target.value })} />
            <Input placeholder="Facebook URL" value={contact.facebook_url || ""} onChange={e => update("global_contact", { ...contact, facebook_url: e.target.value })} />
            <Input placeholder="YouTube URL" value={contact.youtube_url || ""} onChange={e => update("global_contact", { ...contact, youtube_url: e.target.value })} />
          </CardContent></Card>
        </TabsContent>

        {/* POLICIES */}
        <TabsContent value="policies" className="space-y-4">
          <p className="text-xs text-muted-foreground">All 9 legal/policy pages now load from the database. Edit the title and content here. Lines starting with a number+dot (e.g. "1. Eligibility") render as headings on the page. Use HTML for links (&lt;a href="..."&gt;).</p>
          {policies.map((p, i) => (
            <Card key={p.id}><CardHeader><CardTitle className="text-sm flex items-center justify-between">
              <span>{p.title} <code className="text-xs text-muted-foreground ml-2">/{p.slug}</code></span>
            </CardTitle></CardHeader><CardContent className="space-y-2">
              <Input placeholder="Page title" value={p.title} onChange={e => updatePolicy(i, "title", e.target.value)} />
              <Textarea rows={10} placeholder="Content (one paragraph per line)" value={p.content} onChange={e => updatePolicy(i, "content", e.target.value)} className="font-mono text-xs" />
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPageContent;
