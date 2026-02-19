import { MessageCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";

const WHATSAPP_NUMBER = "918369594271";

const FloatingButtons = () => {
  const isMobile = useIsMobile();
  const location = useLocation();

  const openLiveChat = () => {
    window.dispatchEvent(new CustomEvent("open-live-chat"));
  };

  const allowedPaths = ["/", "/about", "/terms", "/privacy", "/refund", "/shipping", "/track-order", "/event-policy"];
  if (!allowedPaths.includes(location.pathname)) return null;

  return (
    <div className={`fixed z-50 flex flex-col gap-3 ${isMobile ? "bottom-20 right-4" : "bottom-6 right-6"}`}>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I need help with my caricature order.`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="WhatsApp Support"
        style={{ boxShadow: "0 2px 10px hsl(28 27% 72% / 0.3)" }}
      >
        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
      </a>
      <button
        onClick={openLiveChat}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-card border border-border text-foreground flex items-center justify-center hover:opacity-90 transition-opacity relative"
        aria-label="Live Chat"
        style={{ boxShadow: "0 2px 10px hsl(28 27% 72% / 0.2)" }}
      >
        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
        <span className="absolute -top-1 -right-1 text-[8px] font-bold rounded-full px-1.5 py-0.5 bg-primary text-primary-foreground">LIVE</span>
      </button>
    </div>
  );
};

export default FloatingButtons;
