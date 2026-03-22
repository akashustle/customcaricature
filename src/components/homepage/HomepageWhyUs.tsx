import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const HomepageWhyUs = ({ config }: { config: any }) => {
  if (!config?.points?.length) return null;

  return (
    <section className="py-16 md:py-24 bg-card/50 border-y border-border/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Our Promise</p>
          <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground">Why Choose Us</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {(config.points as string[]).map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="flex items-center gap-3 bg-background border border-border rounded-xl p-4"
            >
              <Shield className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="font-body text-foreground text-sm">{point}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomepageWhyUs;
