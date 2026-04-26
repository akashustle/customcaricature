/**
 * WorkshopReferCard — share-with-friends card for the Workshop dashboard.
 * Mirrors the booking ReferAFriendCard's white 3D look + golden palette,
 * but with workshop-focused copy. No earnings/cashback wording — purely
 * "share the joy" framing per user request.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Share2, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface Props {
  fullName?: string | null;
  secretCode?: string | null;
}

const WorkshopReferCard = ({ fullName, secretCode }: Props) => {
  const [copied, setCopied] = useState(false);

  const referralCode = useMemo(() => {
    if (secretCode) return `WS-${secretCode}`;
    return "WS-FRIEND";
  }, [secretCode]);

  const referralUrl = useMemo(() => {
    return `https://creativecaricatureclub.com/workshop?ref=${referralCode}`;
  }, [referralCode]);

  const firstName = fullName ? fullName.split(" ")[0] : "";
  const shareText =
    `Hey! 🎨 I joined the Creative Caricature Club™ Workshop and honestly — it changed how I draw. ` +
    `The teachers are super patient, the live sessions are pure magic, and you get a real artist community to grow with.\n\n` +
    `If you've ever wanted to learn caricature (even as a beginner), you HAVE to try it. ` +
    `Use my code ${referralCode} when you sign up — they'll know I sent you 💛\n\n` +
    `${referralUrl}\n\n— ${firstName || "Sent with love"}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast({ title: "📋 Copied!", description: "Share this with a friend who'd love to learn." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Long-press the code to copy manually.", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Creative Caricature Club™ Workshop",
          text: shareText,
          url: referralUrl,
        });
      } catch {/* user dismissed */}
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-[0_20px_40px_-25px_hsl(var(--primary)/0.45)]"
    >
      {/* Floating brand orbs */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 right-6 w-20 h-20 rounded-full bg-primary/15 blur-2xl" />
        <div className="absolute -bottom-8 -left-6 w-28 h-28 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="relative p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-md">
            <Gift className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] font-sans font-semibold text-primary/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Share the joy
            </p>
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">
              Share with a friend who loves art
            </h3>
            <p className="text-xs font-sans text-muted-foreground mt-0.5">
              Help them join the workshop family — live sessions, live mentors, and a creative community to grow with.
            </p>
          </div>
        </div>

        {/* Referral code chip */}
        <div className="rounded-2xl bg-card/85 backdrop-blur border border-primary/20 p-3.5 flex items-center justify-between mb-3 shadow-inner">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-sans font-semibold text-muted-foreground">
              Your code
            </p>
            <p className="font-display text-xl font-bold text-primary tracking-wide">{referralCode}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-primary/40 bg-card hover:bg-primary/10"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <Button
          className="w-full h-12 rounded-2xl bg-gradient-to-br from-primary to-accent hover:brightness-105 text-primary-foreground font-sans font-semibold shadow-md"
          onClick={handleShare}
        >
          <Share2 className="w-4 h-4 mr-2" /> Share with a friend
        </Button>

        {fullName && (
          <p className="text-[10px] text-center font-sans text-muted-foreground/70 mt-3">
            From <strong className="text-foreground/80">{fullName.split(" ")[0]}</strong> · Creative Caricature Club™ Workshop
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default WorkshopReferCard;
