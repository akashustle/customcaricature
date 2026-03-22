import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

const HomepageUseCases = ({ config }: { config: any }) => {
  const navigate = useNavigate();
  if (!config?.cases?.length) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Perfect For</p>
          <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground">Every Occasion</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {(config.cases as Array<{ title: string; emoji: string; desc: string; enquiry_type: string }>).map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="cursor-pointer"
              onClick={() => navigate(`/enquiry?type=${c.enquiry_type}`)}
            >
              <Card className="card-3d h-full text-center">
                <CardContent className="pt-8 pb-6 px-5">
                  <span className="text-5xl block mb-4">{c.emoji}</span>
                  <h3 className="font-calligraphy text-2xl font-bold text-foreground mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-4">{c.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-body font-semibold text-primary">
                    Get Quote <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomepageUseCases;
