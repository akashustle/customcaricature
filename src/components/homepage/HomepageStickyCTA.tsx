import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HomepageStickyCTA = ({ config }: { config: any }) => {
  const navigate = useNavigate();
  if (!config?.enabled) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-[72px] left-0 right-0 z-[45] md:hidden bg-background/95 backdrop-blur-lg border-t border-border p-3 flex items-center gap-2"
    >
      <Button
        onClick={() => navigate(config.link || "/enquiry")}
        className="flex-1 rounded-full font-body font-semibold gap-1"
        size="lg"
      >
        {config.text || "🎨 Get Quote"} <ArrowRight className="w-4 h-4" />
      </Button>
      {config.secondary_text && (
        <Button
          variant="outline"
          onClick={() => navigate(config.secondary_link || "/book-event")}
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
