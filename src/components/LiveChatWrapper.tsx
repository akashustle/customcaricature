import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import ChatWidget from "@/components/ChatWidget";

const LiveChatWrapper = () => {
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  if (!user || !(settings as any).live_chat_visible?.enabled) return null;

  return <ChatWidget userId={user.id} userName={user.email?.split("@")[0] || "User"} />;
};

export default LiveChatWrapper;
