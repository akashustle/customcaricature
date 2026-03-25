import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, HelpCircle, Edit2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type FAQ = { q: string; a: string; category?: string };

const DEFAULT_FAQS: FAQ[] = [
  { q: "What is a caricature?", a: "A caricature is a fun, exaggerated portrait that captures your likeness in a humorous and artistic way.", category: "General" },
  { q: "How long does delivery take?", a: "Custom caricatures are typically delivered within 5-7 working days.", category: "Orders" },
  { q: "How do I book a caricature artist for my event?", a: "Visit our Book Event page, fill in your details.", category: "Events" },
  { q: "What payment methods do you accept?", a: "We accept UPI, credit/debit cards, net banking, and Razorpay.", category: "Payments" },
];

const AdminFAQs = () => {
  const [faqs, setFaqs] = useState<FAQ[]>(DEFAULT_FAQS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [newFaq, setNewFaq] = useState<FAQ>({ q: "", a: "", category: "General" });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { fetchFAQs(); }, []);

  const fetchFAQs = async () => {
    const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "faqs_list").single();
    if (data?.value && Array.isArray(data.value)) setFaqs(data.value as FAQ[]);
    setLoading(false);
  };

  const saveFAQs = async (list: FAQ[]) => {
    setSaving(true);
    await supabase.from("admin_site_settings").upsert({ id: "faqs_list", value: list as any, updated_at: new Date().toISOString() } as any);
    setFaqs(list);
    setSaving(false);
    toast({ title: "FAQs saved!" });
  };

  const addFaq = async () => {
    if (!newFaq.q.trim() || !newFaq.a.trim()) return;
    await saveFAQs([...faqs, { q: newFaq.q.trim(), a: newFaq.a.trim(), category: newFaq.category || "General" }]);
    setNewFaq({ q: "", a: "", category: "General" });
    setShowAdd(false);
  };

  const deleteFaq = (idx: number) => saveFAQs(faqs.filter((_, i) => i !== idx));

  const updateFaq = (idx: number, faq: FAQ) => {
    saveFAQs(faqs.map((item, i) => i === idx ? faq : item));
    setEditIdx(null);
  };

  if (loading) return <p className="text-center text-muted-foreground py-10">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" /> FAQs Management
        </h2>
        <Button size="sm" onClick={() => setShowAdd(true)} className="rounded-full">
          <Plus className="w-4 h-4 mr-1" /> Add FAQ
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Manage frequently asked questions shown on the /faqs page.</p>

      {showAdd && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div><Label className="text-xs">Question</Label>
              <Input value={newFaq.q} onChange={e => setNewFaq({ ...newFaq, q: e.target.value })} placeholder="e.g. How to book?" /></div>
            <div><Label className="text-xs">Answer</Label>
              <Textarea value={newFaq.a} onChange={e => setNewFaq({ ...newFaq, a: e.target.value })} placeholder="The answer..." rows={2} /></div>
            <div><Label className="text-xs">Category</Label>
              <Input value={newFaq.category} onChange={e => setNewFaq({ ...newFaq, category: e.target.value })} placeholder="General" /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addFaq} disabled={saving || !newFaq.q.trim() || !newFaq.a.trim()}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {faqs.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">No FAQs configured</p></CardContent></Card>
        ) : faqs.map((faq, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {editIdx === i ? (
                  <div className="space-y-3">
                    <div><Label className="text-xs">Question</Label>
                      <Input value={faq.q} onChange={e => { const u = [...faqs]; u[i] = { ...u[i], q: e.target.value }; setFaqs(u); }} /></div>
                    <div><Label className="text-xs">Answer</Label>
                      <Textarea value={faq.a} onChange={e => { const u = [...faqs]; u[i] = { ...u[i], a: e.target.value }; setFaqs(u); }} rows={2} /></div>
                    <div><Label className="text-xs">Category</Label>
                      <Input value={faq.category || ""} onChange={e => { const u = [...faqs]; u[i] = { ...u[i], category: e.target.value }; setFaqs(u); }} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateFaq(i, faq)}><Save className="w-4 h-4 mr-1" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditIdx(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] bg-primary/5">{faq.category || "General"}</Badge>
                        <p className="font-semibold text-sm">{faq.q}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{faq.a}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditIdx(i)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteFaq(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminFAQs;
