import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const HomepageUrgencyStrip = ({ config }: { config: any }) => {
  if (!config?.enabled || !config?.text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="bg-primary text-primary-foreground"
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs md:text-sm font-body font-semibold text-center">{config.text}</p>
      </div>
    </motion.div>
  );
};

export default HomepageUrgencyStrip;
