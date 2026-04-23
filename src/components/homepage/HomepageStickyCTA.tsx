import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { normalizeInternalNavigationTarget } from "@/lib/internal-navigation";
import { gtagCtaClick } from "@/lib/gtag";

const HomepageStickyCTA = ({ config }: { config: any }) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < 200 || y < lastY);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hidden by default — admin must explicitly enable BOTH
  // `homepage_sticky_cta.enabled` AND `homepage_sticky_cta.admin_visible`
  // to surface the floating mobile bar above the bottom nav.
  if (!config?.enabled || !config?.admin_visible || !visible) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-[56px] left-0 right-0 z-[44] md:hidden bg-background/95 backdrop-blur-lg border-t border-border p-3 flex items-center gap-2"
    >
      <Button
        onClick={() => {
          gtagCtaClick(config.text || "Get Quote", "homepage_sticky");
          const link = config.link || "/enquiry";
          const internalTarget = normalizeInternalNavigationTarget(link);
          if (internalTarget) navigate(internalTarget);
          else window.location.assign(link);
        }}
        className="flex-1 rounded-full font-body font-semibold gap-1"
        size="lg"
      >
        {config.text || "🎨 Get Quote"} <ArrowRight className="w-4 h-4" />
      </Button>
      {config.secondary_text && (
        <Button
          variant="outline"
          onClick={() => {
            const link = config.secondary_link || "/book-event";
            const internalTarget = normalizeInternalNavigationTarget(link);
            if (internalTarget) navigate(internalTarget);
            else window.location.assign(link);
          }}
          className="flex-1 rounded-full font-body font-semibold"
          size="lg"
        >
          {config.secondary_text}
        </Button>
      )}
    </motion.div>
  );
};

export default HomepageStickyCTA;
