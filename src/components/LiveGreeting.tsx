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
    <div className="mb-4">
      <p className="font-display text-lg md:text-xl font-bold text-foreground">
        {emoji} {greeting}{name ? `, ${name.split(" ")[0]}` : ""}!
      </p>
      <p className="text-xs text-muted-foreground font-mono">
        {now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })} · {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
      </p>
    </div>
  );
};

export default LiveGreeting;
