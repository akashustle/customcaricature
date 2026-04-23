import { AlertTriangle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const HomepageUrgencyStrip = ({ config }: { config: any }) => {
  const { settings } = useSiteSettings();
  // Admin master toggle — hidden by default; admin can re-enable
  if ((settings as any).homepage_urgency_strip?.enabled !== true) return null;
  if (!config?.enabled || !config?.text) return null;

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs md:text-sm font-body font-semibold text-center">{config.text}</p>
      </div>
    </div>
  );
};

export default HomepageUrgencyStrip;
