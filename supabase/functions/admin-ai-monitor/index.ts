import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
    if (!roles || !roles.some((r: any) => ["admin"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "analyze") {
      // Get recent activity data
      const since24h = new Date(Date.now() - 86400000).toISOString();
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

      const [logsRes, failedRes, sessionsRes, ordersRes, enquiriesRes, eventsRes] = await Promise.all([
        adminClient.from("admin_activity_logs").select("*").gte("created_at", since24h).order("created_at", { ascending: false }).limit(200),
        adminClient.from("admin_failed_logins").select("*").gte("created_at", since24h),
        adminClient.from("admin_sessions").select("*").eq("is_active", true),
        adminClient.from("orders").select("id, status, amount, created_at, updated_at").gte("created_at", since7d),
        adminClient.from("enquiries").select("id, status, created_at, assigned_to").gte("created_at", since7d),
        adminClient.from("event_bookings").select("id, status, total_price, created_at").gte("created_at", since7d),
      ]);

      const logs = logsRes.data || [];
      const failed = failedRes.data || [];
      const sessions = sessionsRes.data || [];
      const orders = ordersRes.data || [];
      const enquiries = enquiriesRes.data || [];
      const events = eventsRes.data || [];

      // Calculate risk scores per admin
      const adminActions: Record<string, any> = {};
      for (const log of logs) {
        const aid = log.admin_id;
        if (!adminActions[aid]) {
          adminActions[aid] = { name: log.admin_name, deletes: 0, edits: 0, priceChanges: 0, total: 0 };
        }
        adminActions[aid].total++;
        if (log.action_type === "delete") adminActions[aid].deletes++;
        if (log.action_type === "update") adminActions[aid].edits++;
        if (log.module === "payments" || log.module === "pricing") adminActions[aid].priceChanges++;
      }

      const failedByAdmin: Record<string, number> = {};
      for (const f of failed) {
        failedByAdmin[f.email] = (failedByAdmin[f.email] || 0) + 1;
      }

      // Generate AI insights
      const summaryPrompt = `Analyze this admin activity data and provide insights in JSON format:
Activity Summary (24h): ${JSON.stringify(Object.entries(adminActions).map(([id, a]: any) => ({ id, name: a.name, total: a.total, deletes: a.deletes, priceChanges: a.priceChanges })))}
Failed Logins (24h): ${failed.length}
Active Sessions: ${sessions.length}
Orders (7d): ${orders.length}, Revenue: ₹${orders.reduce((s: number, o: any) => s + (o.amount || 0), 0)}
Enquiries (7d): ${enquiries.length}
Events (7d): ${events.length}, Revenue: ₹${events.reduce((s: number, e: any) => s + (e.total_price || 0), 0)}

Provide JSON with:
{
  "risk_assessments": [{"admin_name": string, "risk_score": 0-100, "risk_level": "low"|"medium"|"high", "reasons": [string]}],
  "suspicious_activities": [{"title": string, "description": string, "severity": "low"|"medium"|"high"|"critical"}],
  "performance_insights": [{"admin_name": string, "performance_score": 0-100, "strengths": [string], "improvements": [string]}],
  "suggestions": [{"title": string, "description": string, "priority": "low"|"medium"|"high"}],
  "revenue_insights": {"total_7d": number, "trend": string, "leaks": [string]},
  "productivity_notes": [string]
}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a business intelligence AI for Creative Caricature Club. Analyze admin behavior, detect risks, score performance, and provide actionable insights. Return ONLY valid JSON, no markdown." },
            { role: "user", content: summaryPrompt },
          ],
          max_tokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        return new Response(JSON.stringify({ error: "AI analysis failed", fallback: true, data: { adminActions, failedLogins: failed.length, sessions: sessions.length } }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || "{}";
      // Strip markdown code fences if present
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      let insights;
      try {
        insights = JSON.parse(content);
      } catch {
        insights = { error: "Failed to parse AI response", raw: content.substring(0, 500) };
      }

      // Store risk scores
      if (insights.risk_assessments) {
        for (const ra of insights.risk_assessments) {
          const adminId = Object.entries(adminActions).find(([_, a]: any) => a.name === ra.admin_name)?.[0];
          if (adminId) {
            await adminClient.from("admin_risk_scores").upsert({
              admin_id: adminId,
              risk_score: ra.risk_score,
              risk_level: ra.risk_level,
              failed_logins: failedByAdmin[ra.admin_name] || 0,
              suspicious_edits: adminActions[adminId]?.deletes || 0,
              unusual_behavior: ra.risk_score > 50 ? 1 : 0,
              last_calculated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: "admin_id" });
          }
        }
      }

      // Store AI alerts for suspicious activities
      if (insights.suspicious_activities) {
        for (const sa of insights.suspicious_activities) {
          await adminClient.from("admin_ai_alerts").insert({
            alert_type: "suspicious_activity",
            severity: sa.severity,
            title: sa.title,
            description: sa.description,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, insights, summary: { totalLogs: logs.length, failedLogins: failed.length, activeSessions: sessions.length, orders7d: orders.length, events7d: events.length } }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Monitor error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
