import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain, Shield, TrendingUp, AlertTriangle, Trophy, Users, Activity,
  Zap, RefreshCw, Eye, BarChart3, Target, Clock, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Lightbulb, Bell
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AIInsights = {
  risk_assessments?: { admin_name: string; risk_score: number; risk_level: string; reasons: string[] }[];
  suspicious_activities?: { title: string; description: string; severity: string }[];
  performance_insights?: { admin_name: string; performance_score: number; strengths: string[]; improvements: string[] }[];
  suggestions?: { title: string; description: string; priority: string }[];
  revenue_insights?: { total_7d: number; trend: string; leaks: string[] };
  productivity_notes?: string[];
};

type AIAlert = {
  id: string; alert_type: string; severity: string; title: string;
  description: string | null; admin_name: string | null; is_read: boolean;
  resolved: boolean; created_at: string; suggestion: string | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-600",
  medium: "text-amber-600",
  high: "text-red-600",
};

const AdminMonitoringAI = () => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchAlerts();
    fetchRecentLogs();
    const ch = supabase.channel("admin-ai-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_ai_alerts" }, fetchAlerts)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_activity_logs" }, (payload) => {
        setLiveLogs(prev => [payload.new, ...prev].slice(0, 20));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchAlerts = async () => {
    const { data } = await supabase.from("admin_ai_alerts" as any).select("*").order("created_at", { ascending: false }).limit(30);
    setAlerts((data as any[]) || []);
  };

  const fetchRecentLogs = async () => {
    const { data } = await supabase.from("admin_activity_logs" as any).select("*").order("created_at", { ascending: false }).limit(20);
    setLiveLogs((data as any[]) || []);
  };

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-monitor", {
        body: { action: "analyze" },
      });
      if (error) throw error;
      if (data?.insights) {
        setInsights(data.insights);
        setSummary(data.summary);
        setLastAnalyzed(new Date().toLocaleString("en-IN"));
        toast({ title: "🧠 AI Analysis Complete", description: "Insights updated" });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveAlert = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_ai_alerts" as any).update({ resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString() } as any).eq("id", id);
    fetchAlerts();
  };

  const formatTime = (d: string) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Admin Intelligence & Monitoring
        </h2>
        <div className="flex items-center gap-2">
          {lastAnalyzed && <span className="text-xs text-muted-foreground">Last: {lastAnalyzed}</span>}
          <Button onClick={runAnalysis} disabled={loading} size="sm" className="gap-1.5">
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {loading ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: Activity, label: "Actions (24h)", value: summary.totalLogs, color: "text-blue-500" },
            { icon: XCircle, label: "Failed Logins", value: summary.failedLogins, color: "text-red-500" },
            { icon: Users, label: "Active Sessions", value: summary.activeSessions, color: "text-green-500" },
            { icon: BarChart3, label: "Orders (7d)", value: summary.orders7d, color: "text-purple-500" },
            { icon: Target, label: "Events (7d)", value: summary.events7d, color: "text-amber-500" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-3 text-center">
                <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <p className="text-xl font-bold font-display">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Live Activity Feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500 animate-pulse" /> Live Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {liveLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : liveLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs font-sans">
                <div className="flex items-center gap-2">
                  <Badge className="text-[9px] border-none bg-primary/10 text-primary">{log.action_type}</Badge>
                  <span className="font-medium">{log.admin_name}</span>
                  <span className="text-muted-foreground truncate max-w-[150px]">{log.description}</span>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(log.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Risk Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> AI Alerts
              {alerts.filter(a => !a.resolved).length > 0 && (
                <Badge variant="destructive" className="text-[9px]">{alerts.filter(a => !a.resolved).length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {alerts.filter(a => !a.resolved).length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground">All clear</p>
              </div>
            ) : alerts.filter(a => !a.resolved).map(alert => (
              <div key={alert.id} className="p-2.5 rounded-lg border bg-card text-xs font-sans">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[9px] border-none ${SEVERITY_COLORS[alert.severity]}`}>{alert.severity}</Badge>
                    <span className="font-semibold">{alert.title}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => resolveAlert(alert.id)}>Resolve</Button>
                </div>
                {alert.description && <p className="text-muted-foreground">{alert.description}</p>}
                {alert.suggestion && <p className="text-primary text-[10px] mt-1">💡 {alert.suggestion}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{formatTime(alert.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      {insights && (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Risk Assessments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" /> Risk Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.risk_assessments?.map((ra, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{ra.admin_name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold font-display ${RISK_COLORS[ra.risk_level]}`}>{ra.risk_score}</span>
                        <Badge className={`text-[9px] border-none ${SEVERITY_COLORS[ra.risk_level]}`}>
                          {ra.risk_level === "low" ? "🟢" : ra.risk_level === "medium" ? "🟡" : "🔴"} {ra.risk_level}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={ra.risk_score} className="h-1.5 mb-2" />
                    <div className="space-y-0.5">
                      {ra.reasons?.map((r, j) => (
                        <p key={j} className="text-[10px] text-muted-foreground">• {r}</p>
                      ))}
                    </div>
                  </div>
                ))}
                {(!insights.risk_assessments || insights.risk_assessments.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No risk data yet — run analysis first</p>
                )}
              </CardContent>
            </Card>

            {/* Performance Leaderboard */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.performance_insights?.sort((a, b) => b.performance_score - a.performance_score).map((pi, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                        <span className="font-semibold text-sm">#{i + 1} {pi.admin_name}</span>
                      </div>
                      <span className="text-lg font-bold font-display text-primary">{pi.performance_score}</span>
                    </div>
                    <Progress value={pi.performance_score} className="h-1.5 mb-2" />
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div>
                        <p className="text-green-600 font-medium">Strengths</p>
                        {pi.strengths?.map((s, j) => <p key={j} className="text-muted-foreground">✅ {s}</p>)}
                      </div>
                      <div>
                        <p className="text-amber-600 font-medium">Improve</p>
                        {pi.improvements?.map((im, j) => <p key={j} className="text-muted-foreground">⚠ {im}</p>)}
                      </div>
                    </div>
                  </div>
                ))}
                {(!insights.performance_insights || insights.performance_insights.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No performance data yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* AI Suggestions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.suggestions?.map((s, i) => (
                  <div key={i} className="p-2.5 rounded-lg border bg-card text-xs font-sans">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className={`text-[9px] border-none ${
                        s.priority === "high" ? "bg-red-100 text-red-800" :
                        s.priority === "medium" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>{s.priority}</Badge>
                      <span className="font-semibold">{s.title}</span>
                    </div>
                    <p className="text-muted-foreground">{s.description}</p>
                  </div>
                ))}
                {(!insights.suggestions || insights.suggestions.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No suggestions yet</p>
                )}
              </CardContent>
            </Card>

            {/* Revenue Insights + Productivity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" /> Revenue & Productivity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.revenue_insights && (
                  <div className="p-3 rounded-lg bg-green-50/50">
                    <p className="font-semibold text-sm mb-1">Revenue (7d): ₹{insights.revenue_insights.total_7d?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mb-2">Trend: {insights.revenue_insights.trend}</p>
                    {insights.revenue_insights.leaks?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-red-600">Revenue Leaks:</p>
                        {insights.revenue_insights.leaks.map((l, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">🔻 {l}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {insights.productivity_notes?.map((note, i) => (
                  <div key={i} className="p-2 rounded-lg bg-muted/30 text-xs font-sans flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{note}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Suspicious Activities */}
          {insights.suspicious_activities && insights.suspicious_activities.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" /> Suspicious Activities Detected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.suspicious_activities.map((sa, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-destructive/20 bg-red-50/30 text-xs font-sans">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className={`text-[9px] border-none ${SEVERITY_COLORS[sa.severity]}`}>{sa.severity}</Badge>
                      <span className="font-semibold">{sa.title}</span>
                    </div>
                    <p className="text-muted-foreground">{sa.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* No insights prompt */}
      {!insights && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-display font-semibold mb-1">AI Intelligence Ready</h3>
            <p className="text-sm text-muted-foreground mb-4">Click "Run AI Analysis" to generate insights on admin behavior, team performance, and revenue patterns</p>
            <Button onClick={runAnalysis} disabled={loading} className="gap-1.5">
              <Zap className="w-4 h-4" /> Run First Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminMonitoringAI;
