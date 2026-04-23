import { useState, useEffect } from "react";

const LiveGreeting = ({ name }: { name?: string }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const wave = hour < 12 ? "🌅" : hour < 17 ? "👋" : "🌙";
  const firstName = name?.split(" ")[0] || "there";

  return (
    <div className="leading-tight">
      <p className="text-xs text-muted-foreground font-sans">{greeting}</p>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
        {firstName} <span className="text-xl">{wave}</span>
      </h2>
    </div>
  );
};

export default LiveGreeting;
