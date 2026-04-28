import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { UserCheck, Shield } from "lucide-react";

interface AdminNameGateProps {
  onNameSubmit: (name: string) => void;
}

const AdminNameGate = ({ onNameSubmit }: AdminNameGateProps) => {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    sessionStorage.setItem("admin_entered_name", name.trim());
    onNameSubmit(name.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary via-background to-muted">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Card className="border border-border shadow-2xl backdrop-blur-sm bg-card/95">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-3">
              <motion.div
                className="mx-auto w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <img src="/logo.png" alt="CCC" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
              </motion.div>
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Identity Verification</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Please enter your name before accessing the admin panel. All actions will be tracked under this identity.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Your Full Name *</Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    minLength={2}
                    className="pl-10 h-12 rounded-xl"
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" disabled={name.trim().length < 2} className="w-full h-12 rounded-xl font-semibold">
                Enter Admin Panel
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminNameGate;
