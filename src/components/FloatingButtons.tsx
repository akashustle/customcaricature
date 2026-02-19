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

  // Only show on homepage and public info pages
  const allowedPaths = ["/", "/about", "/terms", "/privacy", "/refund", "/shipping", "/track-order", "/event-policy"];
  if (!allowedPaths.includes(location.pathname)) return null;

  return (
    <div className={`fixed z-50 flex flex-col gap-3 ${isMobile ? "bottom-20 right-4" : "bottom-6 right-6"}`}>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I need help with my caricature order.`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform btn-3d"
        aria-label="WhatsApp Support"
        style={{ boxShadow: "0 4px 0 #1da851, 0 6px 12px rgba(0,0,0,0.15)" }}
      >
        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
      </a>
      <button
        onClick={openLiveChat}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform relative btn-3d"
        aria-label="Live Chat"
      >
        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full px-1.5 py-0.5 animate-pulse">LIVE</span>
      </button>
    </div>
  );
};

export default FloatingButtons;
