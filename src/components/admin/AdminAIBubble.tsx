import { useState, lazy, Suspense } from "react";
import { Sparkles } from "lucide-react";

const AdminAIAssistant = lazy(() => import("@/components/admin/AdminAIAssistant"));

/**
 * Persistent floating Admin AI bubble — always visible bottom-right of the admin panel.
 * Opens the same Sheet as the header trigger. Hidden when the dedicated AI tab is active
 * (to avoid stacking two assistants).
 */
const AdminAIBubble = ({ activeTab }: { activeTab: string }) => {
  const [open, setOpen] = useState(false);

  if (activeTab === "ai-assistant") return null;

  return (
    <>
      {/* Sheet trigger lives inside AdminAIAssistant; we control its open state here */}
      <Suspense fallback={null}>
        <AdminAIAssistant open={open} onOpenChange={setOpen} hideTrigger />
      </Suspense>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60] h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center group"
        title="Ask Admin AI"
        aria-label="Open Admin AI Assistant"
      >
        <Sparkles className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-background animate-pulse" />
        <span className="hidden md:block absolute right-full mr-3 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-sans">
          Ask AI
        </span>
      </button>
    </>
  );
};

export default AdminAIBubble;
