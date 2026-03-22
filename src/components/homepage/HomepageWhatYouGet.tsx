import { motion } from "framer-motion";
import { Check } from "lucide-react";

const HomepageWhatYouGet = ({ config }: { config: any }) => {
  if (!config?.items?.length) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">The Experience</p>
          <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground">What You Get</h2>
        </motion.div>
        <div className="max-w-2xl mx-auto space-y-4">
          {(config.items as string[]).map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4 bg-card border border-border rounded-2xl p-5"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <p className="font-body text-foreground text-sm md:text-base">{item}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomepageWhatYouGet;
