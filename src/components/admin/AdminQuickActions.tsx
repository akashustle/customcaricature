import { useState } from "react";
import { Plus, Package, Calendar, MessageCircle, Bell, X, UserPlus, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdminQuickActionsProps {
  onAction: (action: string) => void;
}

const ACTIONS = [
  { id: "add-order", icon: Package, label: "Add Order", color: "bg-blue-500" },
  { id: "add-event", icon: Calendar, label: "Add Event", color: "bg-emerald-500" },
  { id: "add-enquiry", icon: MessageCircle, label: "Add Lead", color: "bg-violet-500" },
  { id: "add-user", icon: UserPlus, label: "Add User", color: "bg-cyan-500" },
  { id: "assign-artist", icon: Palette, label: "Assign Artist", color: "bg-rose-500" },
  { id: "send-notification", icon: Bell, label: "Send Reminder", color: "bg-amber-500" },
];

const AdminQuickActions = ({ onAction }: AdminQuickActionsProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col-reverse items-end gap-2">
      <AnimatePresence>
        {open && ACTIONS.map((action, i) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          >
            <Button
              size="sm"
              className={cn(
                "rounded-full shadow-lg gap-2 text-xs font-medium text-white border-0 h-9 px-4",
                action.color
              )}
              onClick={() => { onAction(action.id); setOpen(false); }}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button
        size="icon"
        className={cn(
          "w-12 h-12 rounded-full shadow-xl transition-all duration-300",
          open
            ? "bg-destructive hover:bg-destructive/90 rotate-45"
            : "hover:shadow-2xl"
        )}
        style={!open ? {
          background: "linear-gradient(135deg, hsl(25 30% 40%), hsl(18 40% 50%))",
          boxShadow: "0 4px 20px hsla(25, 30%, 40%, 0.3), 0 0 0 4px hsla(0,0%,100%,0.4)",
        } : undefined}
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5 text-white" />}
      </Button>
    </div>
  );
};

export default AdminQuickActions;
