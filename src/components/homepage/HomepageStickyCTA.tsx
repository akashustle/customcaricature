import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  if (!config?.enabled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-[72px] left-0 right-0 z-[45] md:hidden bg-background/95 backdrop-blur-lg border-t border-border p-3 flex items-center gap-2"
        >
          <Button
            onClick={() => {
              const link = config.link || "/enquiry";
              if (link.startsWith("http")) window.open(link, "_blank");
              else navigate(link);
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
                if (link.startsWith("http")) window.open(link, "_blank");
                else navigate(link);
              }}
              className="flex-1 rounded-full font-body font-semibold"
              size="lg"
            >
              {config.secondary_text}
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HomepageStickyCTA;
