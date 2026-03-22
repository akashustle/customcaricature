import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HomepageInstantQuote = ({ config }: { config: any }) => {
  const navigate = useNavigate();
  if (!config) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center bg-card border border-border rounded-3xl p-8 md:p-12 shadow-lg"
        >
          <motion.div
            className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Zap className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="font-calligraphy text-3xl md:text-4xl font-bold text-foreground mb-4">
            {config.title || "Check your event price in 30 seconds 🎨"}
          </h2>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="xl"
              onClick={() => navigate(config.link || "/enquiry")}
              className="rounded-full font-body font-semibold shadow-lg shadow-primary/20 mt-4"
            >
              {config.button_text || "Get Instant Quote"} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomepageInstantQuote;
