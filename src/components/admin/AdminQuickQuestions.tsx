import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, MessageCircle, Bot, Edit2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type QuickQ = { q: string; a: string };

const DEFAULT_QS: QuickQ[] = [
  { q: "How to book an event?", a: "Visit our event booking page to book your event!" },
  { q: "Custom caricature details", a: "Check our order page for all caricature types and pricing." },
  { q: "How to login/register?", a: "Click the Login or Register button from the menu." },
  { q: "Delivery time?", a: "Custom caricatures are typically delivered within 5-7 working days." },
  { q: "Workshop details", a: "Our workshops are held on weekends. Check the Workshop section for upcoming dates!" },
];

const AdminQuickQuestions = () => {
  const [questions, setQuestions] = useState<QuickQ[]>(DEFAULT_QS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [newQ, setNewQ] = useState({ q: "", a: "" });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data } = await supabase.from("admin_site_settings").select("value").eq("id", "chat_quick_questions").single();
    if (data?.value && Array.isArray(data.value)) {
      setQuestions(data.value as QuickQ[]);
    }
    setLoading(false);
  };

  const saveQuestions = async (qs: QuickQ[]) => {
    setSaving(true);
    await supabase.from("admin_site_settings").upsert({ id: "chat_quick_questions", value: qs as any, updated_at: new Date().toISOString() } as any);
    setQuestions(qs);
    setSaving(false);
    toast({ title: "Quick questions saved!" });
  };

  const addQuestion = async () => {
    if (!newQ.q.trim() || !newQ.a.trim()) return;
    const updated = [...questions, { q: newQ.q.trim(), a: newQ.a.trim() }];
    await saveQuestions(updated);
    setNewQ({ q: "", a: "" });
    setShowAdd(false);
  };

  const deleteQuestion = async (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx);
    await saveQuestions(updated);
  };

  const updateQuestion = async (idx: number, q: QuickQ) => {
    const updated = questions.map((item, i) => i === idx ? q : item);
    await saveQuestions(updated);
    setEditIdx(null);
  };

  if (loading) return <p className="text-center text-muted-foreground py-10 font-sans">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" /> Quick Questions Settings
        </h2>
        <Button size="sm" onClick={() => setShowAdd(true)} className="rounded-full font-sans">
          <Plus className="w-4 h-4 mr-1" /> Add Question
        </Button>
      </div>

      <p className="text-sm text-muted-foreground font-sans">
        These predefined questions appear in both Live Chat and AI Chat for users to quickly tap and get answers.
      </p>

      {showAdd && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs font-sans">Question</Label>
              <Input value={newQ.q} onChange={e => setNewQ({ ...newQ, q: e.target.value })} placeholder="e.g. How to book an event?" />
            </div>
            <div>
              <Label className="text-xs font-sans">Answer</Label>
              <Textarea value={newQ.a} onChange={e => setNewQ({ ...newQ, a: e.target.value })} placeholder="The response shown to users..." rows={2} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addQuestion} disabled={saving || !newQ.q.trim() || !newQ.a.trim()} className="font-sans">
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {questions.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground font-sans">No quick questions configured</p></CardContent></Card>
        ) : questions.map((qq, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {editIdx === i ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-sans">Question</Label>
                      <Input value={qq.q} onChange={e => {
                        const updated = [...questions];
                        updated[i] = { ...updated[i], q: e.target.value };
                        setQuestions(updated);
                      }} />
                    </div>
                    <div>
                      <Label className="text-xs font-sans">Answer</Label>
                      <Textarea value={qq.a} onChange={e => {
                        const updated = [...questions];
                        updated[i] = { ...updated[i], a: e.target.value };
                        setQuestions(updated);
                      }} rows={2} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateQuestion(i, qq)} className="font-sans">
                        <Save className="w-4 h-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditIdx(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] bg-primary/5">{i + 1}</Badge>
                        <p className="font-sans font-semibold text-sm">{qq.q}</p>
                      </div>
                      <p className="text-xs text-muted-foreground font-sans">{qq.a}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditIdx(i)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteQuestion(i)}>
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

export default AdminQuickQuestions;
