import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Link2 } from "lucide-react";

const ClaimLink = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code");
  const [status, setStatus] = useState<"loading" | "claiming" | "success" | "error" | "login_required">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  useEffect(() => {
    if (!code) { setStatus("error"); setErrorMsg("Invalid link"); return; }

    const checkAndClaim = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Store link code, redirect to login
        localStorage.setItem("pending_lead_link", code);
        setStatus("login_required");
        return;
      }

      // Claim the link
      setStatus("claiming");
      try {
        const res = await supabase.functions.invoke("claim-lead-link", {
          body: { link_code: code },
        });

        if (res.error || res.data?.error) {
          setStatus("error");
          setErrorMsg(res.data?.error || "Failed to claim link");
          return;
        }

        setLinkLabel(res.data?.label || "");
        setStatus("success");
        localStorage.removeItem("pending_lead_link");

        // Log page visit action
        toast({ title: "🎉 Custom pricing applied!", description: "Your special pricing has been activated." });
      } catch {
        setStatus("error");
        setErrorMsg("Something went wrong");
      }
    };

    checkAndClaim();
  }, [code]);

  // After login/register, auto-claim
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && status === "login_required") {
        const pendingCode = localStorage.getItem("pending_lead_link");
        if (pendingCode) {
          setStatus("claiming");
          try {
            const res = await supabase.functions.invoke("claim-lead-link", {
              body: { link_code: pendingCode },
            });
            if (res.error || res.data?.error) {
              setStatus("error");
              setErrorMsg(res.data?.error || "Failed to claim");
            } else {
              setLinkLabel(res.data?.label || "");
              setStatus("success");
              localStorage.removeItem("pending_lead_link");
              toast({ title: "🎉 Custom pricing applied!" });
            }
          } catch {
            setStatus("error");
            setErrorMsg("Something went wrong");
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Link2 className="w-10 h-10 mx-auto mb-2 text-primary" />
          <CardTitle className="text-xl">Special Pricing Link</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Verifying link...</p>
            </div>
          )}

          {status === "claiming" && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Applying your custom pricing...</p>
            </div>
          )}

          {status === "login_required" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please login or register to claim your special pricing.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate("/login")}>Login</Button>
                <Button variant="outline" onClick={() => navigate("/register")}>Register</Button>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-semibold text-green-700">Custom pricing activated!</p>
              {linkLabel && <p className="text-sm text-muted-foreground">{linkLabel}</p>}
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate("/order")}>Order Now</Button>
                <Button variant="outline" onClick={() => navigate("/book-event")}>Book Event</Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <p className="text-destructive font-medium">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimLink;
