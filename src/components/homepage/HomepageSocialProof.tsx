import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Calendar, Users, Star, Award, TrendingUp } from "lucide-react";

const iconMap: Record<string, any> = {
  "Events Completed": Calendar,
  "Professional Artists": Users,
  "Happy Clients": Star,
  "Average Rating": Award,
};

const defaultStats = [
  { value: "800+", label: "Events Completed" },
  { value: "15+", label: "Professional Artists" },
  { value: "1000+", label: "Happy Clients" },
  { value: "4.9", label: "Average Rating" },
];

const AnimatedCounter = ({ value, inView }: { value: string; inView: boolean }) => {
  const numMatch = value.match(/^([\d.]+)/);
  const suffix = value.replace(/^[\d.]+/, "");
  const target = numMatch ? parseFloat(numMatch[1]) : 0;
  const isDecimal = value.includes(".");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView || !target) return;
    let start = 0;
    const duration = 2000;
    const steps = duration / 16;
    const increment = target / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  if (!target) return <span>{value}</span>;
  return <span>{isDecimal ? count.toFixed(1) : Math.floor(count)}{suffix}</span>;
};

const HomepageSocialProof = ({ config }: { config: any }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  // Use config stats or fallback to defaults
  const stats = (config?.stats && config.stats.length > 0) ? config.stats as Array<{ value: string; label: string }> : defaultStats;
  const monthlyCounter = config?.monthly_counter;
  const monthlyText = config?.monthly_text;

  return (
    <section ref={ref} className="py-16 md:py-20 bg-card/50 border-y border-border/50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, i) => {
            const Icon = iconMap[stat.label] || Award;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 60, scale: 0.5 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.12, duration: 0.7, type: "spring", bounce: 0.4 }}
                whileHover={{ y: -8, scale: 1.08, transition: { duration: 0.3 } }}
                className="text-center group cursor-default"
              >
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors"
                  whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
                >
                  <Icon className="w-6 h-6 text-primary" />
                </motion.div>
                <p className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground">
                  <AnimatedCounter value={stat.value} inView={inView} />
                </p>
                <p className="text-xs font-body text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Monthly highlight — text-only, no booking number shown */}
        {monthlyCounter && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 mt-8"
          >
            <TrendingUp className="w-5 h-5 text-primary" />
            <p className="text-sm font-body font-semibold text-primary">
              🔥 {monthlyCounter.label || "Booking fast for upcoming events — secure your date today!"}
            </p>
          </motion.div>
        )}

        {monthlyText && !monthlyCounter && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-sm font-body font-semibold text-primary mt-8"
          >
            {monthlyText}
          </motion.p>
        )}
      </div>
    </section>
  );
};

export default HomepageSocialProof;
