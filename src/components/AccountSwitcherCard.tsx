/**
 * Card shown inside the user-dashboard "Me" tab that lets the user discover
 * & jump to their linked workshop account. If they don't have one yet we
 * still surface a CTA that will auto-create + link one in a single click.
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, Loader2, Sparkles, Link2 } from "lucide-react";
import { useWorkshopLink } from "@/hooks/useWorkshopLink";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import WorkshopLinkRecoveryBanner from "@/components/WorkshopLinkRecoveryBanner";

const palette = {
  ivory: "hsl(38 60% 96%)",
  coral: "hsl(8 78% 70%)",
  gold: "hsl(36 78% 60%)",
  sage: "hsl(150 30% 65%)",
  sky: "hsl(200 70% 70%)",
  plum: "hsl(335 45% 55%)",
};

type Props = {
  authUserId: string;
  fullName?: string | null;
  email?: string | null;
  mobile?: string | null;
};

const AccountSwitcherCard = ({ authUserId, fullName, email, mobile }: Props) => {
  const { hasWorkshop, workshopUser, switchToWorkshop } = useWorkshopLink(authUserId);
  // Avoid lint warnings for props we no longer surface in the UI (we used to
  // expose a "Create & Link" CTA that auto-created a workshop account for any
  // user — that's been removed because it should only appear for actual
  // workshop students). Keep the props in the signature for API stability.
  void fullName; void email; void mobile;

  // Only render this card for users who already have a linked workshop
  // account (i.e. genuine workshop students). For caricature/event-only
  // users, this card is hidden entirely so the dashboard stays focused.
  if (!hasWorkshop) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[24px] p-5 border-2 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.18)]"
      style={{ background: `linear-gradient(135deg, hsl(150 50% 95%), hsl(150 40% 88%))`, borderColor: palette.sage }}>
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: palette.sage }} />
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${palette.sage}, hsl(150 40% 45%))` }}>
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base flex items-center gap-1.5" style={{ color: "hsl(150 40% 22%)" }}>
            Workshop Account Linked <Link2 className="w-4 h-4" style={{ color: palette.sage }} />
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "hsl(150 30% 35%)" }}>
            {workshopUser?.name || "Your"} workshop dashboard is ready. Switch any time.
          </p>
        </div>
        <Button onClick={() => { void switchToWorkshop(); }} size="sm"
          className="rounded-full font-semibold shadow-md text-white border-0"
          style={{ background: `linear-gradient(135deg, ${palette.sage}, hsl(150 40% 45%))` }}>
          Switch <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </motion.div>
  );
};

export default AccountSwitcherCard;
