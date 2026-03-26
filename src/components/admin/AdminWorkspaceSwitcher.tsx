import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminWorkspaceSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isWorkshop = location.pathname.includes("workshop-admin");
  const isMain = location.pathname.includes("admin-panel") || location.pathname.includes("customcad75");

  const handleSwitch = (target: "main" | "workshop") => {
    if (target === "main" && !isMain) {
      navigate("/admin-panel", { replace: true });
    } else if (target === "workshop" && !isWorkshop) {
      navigate("/workshop-admin-panel", { replace: true });
    }
  };

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/30">
      <button
        onClick={() => handleSwitch("main")}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
          isMain
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {isMain && (
          <motion.div
            layoutId="workspace-bg"
            className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <LayoutDashboard className="w-3.5 h-3.5 relative z-10" />
        <span className="relative z-10">Main Admin</span>
      </button>
      <button
        onClick={() => handleSwitch("workshop")}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
          isWorkshop
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {isWorkshop && (
          <motion.div
            layoutId="workspace-bg"
            className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <GraduationCap className="w-3.5 h-3.5 relative z-10" />
        <span className="relative z-10">Workshop</span>
      </button>
    </div>
  );
};

export default AdminWorkspaceSwitcher;
