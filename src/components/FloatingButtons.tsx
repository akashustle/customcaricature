import { MessageCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const WHATSAPP_NUMBER = "918369594271";

const FloatingButtons = () => {
  const isMobile = useIsMobile();

  // Hide on mobile to avoid overlapping bottom nav
  if (isMobile) return null;

  const openLiveChat = () => {
    window.dispatchEvent(new CustomEvent("open-live-chat"));
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I need help with my caricature order.`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="WhatsApp Support"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
      <button
        onClick={openLiveChat}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform relative"
        aria-label="Live Chat"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full px-1.5 py-0.5">LIVE</span>
      </button>
    </div>
  );
};

export default FloatingButtons;
