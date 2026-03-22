import { useState, useEffect } from "react";

const LiveGreeting = ({ name }: { name?: string }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const emoji = hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙";

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
        {emoji} {greeting}{name ? `, ${name.split(" ")[0]}` : ""}
      </p>
      <span className="text-[10px] text-muted-foreground font-body hidden lg:inline">
        {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
      </span>
    </div>
  );
};

export default LiveGreeting;
