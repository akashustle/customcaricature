import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, Clock, ArrowLeft, Upload } from "lucide-react";
import SEOHead from "@/components/SEOHead";

type Appeal = {
  id: string;
  reason: string;
  evidence_url: string | null;
  status: "pending" | "approved" | "rejected" | string;
  admin_response: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type Profile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_banned?: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
};

const AppealBan = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (!user) return;
    void load();
    const ch = supabase
      .channel(`appeals-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ban_appeals", filter: `user_id=eq.${user.id}` },
        () => fetchAppeals(user.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const load = async () => {
    if (!user) return;
    await Promise.all([fetchProfile(user.id), fetchAppeals(user.id)]);
    setLoading(false);
  };

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, is_banned, ban_reason, banned_at")
      .eq("user_id", uid)
      .maybeSingle();
    if (data) setProfile(data as any);
  };

  const fetchAppeals = async (uid: string) => {
    const { data } = await supabase
      .from("ban_appeals")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (data) setAppeals(data as any);
  };

  const uploadEvidence = async (uid: string): Promise<string | null> => {
    if (!evidenceFile) return evidenceUrl.trim() || null;
    const ext = evidenceFile.name.split(".").pop() || "bin";
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("payment-claims")
      .upload(path, evidenceFile, { upsert: true });
    if (upErr) {
      toast.error("Evidence upload failed", { description: upErr.message });
      return evidenceUrl.trim() || null;
    }
    // Use a signed URL so admins can view privately
    const { data: signed } = await supabase.storage
      .from("payment-claims")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed?.signedUrl || path;
  };

  const submitAppeal = async () => {
    if (!user) return;
    const trimmed = reason.trim();
    if (trimmed.length < 20) {
      toast.error("Please write at least 20 characters explaining your appeal");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Please keep your appeal under 2000 characters");
      return;
    }
    setSubmitting(true);
    try {
      const evidence = await uploadEvidence(user.id);
      const { error } = await supabase.from("ban_appeals").insert({
        user_id: user.id,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        reason: trimmed,
        evidence_url: evidence,
        status: "pending",
      } as any);
      if (error) throw error;
      toast.success("Appeal submitted", {
        description: "Our team will review and respond shortly.",
      });
      setReason("");
      setEvidenceUrl("");
      setEvidenceFile(null);
      await fetchAppeals(user.id);
    } catch (err: any) {
      toast.error("Could not submit", { description: err?.message || "Try again later" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground bg-background">
        Loading...
      </div>
    );
  }

  const pending = appeals.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background pb-20">
      <SEOHead
        title="Appeal Account Suspension – Creative Caricature Club"
        description="Submit an appeal if your account has been suspended."
      />
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="font-display text-lg font-bold">Appeal account suspension</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
        {profile?.is_banned ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="p-4 flex gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-bold text-destructive font-sans text-sm">
                    Your account is currently suspended
                  </p>
                  <p className="text-sm text-foreground/90 font-sans mt-1">
                    {profile.ban_reason || "No reason was provided. Please write your appeal below."}
                  </p>
                  {profile.banned_at && (
                    <p className="text-[11px] text-muted-foreground font-sans mt-1">
                      Suspended on {new Date(profile.banned_at).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-primary font-sans text-sm">
                  Your account is active
                </p>
                <p className="text-sm text-foreground/90 font-sans mt-1">
                  You can still file an appeal here if you've been notified about a past restriction.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold mb-1">Submit an appeal</h2>
              <p className="text-xs text-muted-foreground font-sans">
                Tell us what happened. Add a screenshot or document link if it helps your case.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-sans">Your appeal *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why we should restore your account..."
                rows={6}
                maxLength={2000}
                className="font-sans"
              />
              <p className="text-[10px] text-muted-foreground font-sans text-right">
                {reason.trim().length}/2000
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-sans">Evidence link (optional)</Label>
                <Input
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-sans flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Upload file (optional)
                </Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="font-sans"
                />
              </div>
            </div>

            <Button
              onClick={submitAppeal}
              disabled={submitting || reason.trim().length < 20}
              className="w-full font-sans rounded-full"
            >
              {submitting ? "Submitting..." : "Submit appeal"}
            </Button>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-bold">Your past appeals</h2>
            {pending > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-none">
                {pending} pending
              </Badge>
            )}
          </div>

          {appeals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-sans">
                  You haven't submitted any appeals yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {appeals.map((a) => {
                const color =
                  a.status === "approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : a.status === "rejected"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800";
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-sans text-muted-foreground">
                          {new Date(a.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <Badge className={`${color} border-none capitalize text-[10px]`}>
                          {a.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-sans whitespace-pre-wrap">{a.reason}</p>
                      {a.evidence_url && (
                        <a
                          href={a.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs text-primary underline font-sans"
                        >
                          View attached evidence
                        </a>
                      )}
                      {a.admin_response && (
                        <div className="mt-2 rounded-lg bg-muted/60 border border-border p-2.5">
                          <p className="text-[11px] font-bold font-sans text-muted-foreground uppercase">
                            Admin response
                          </p>
                          <p className="text-sm font-sans mt-0.5">{a.admin_response}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppealBan;
