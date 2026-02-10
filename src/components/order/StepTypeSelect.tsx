import { Card, CardContent } from "@/components/ui/card";
import { Monitor, PenTool } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onSelect: (type: "digital" | "physical") => void;
}

const StepTypeSelect = ({ onSelect }: Props) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">What type of caricature?</h2>
        <p className="text-muted-foreground font-sans">Choose between a digital file or a hand-drawn physical artwork</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            type: "digital" as const,
            icon: Monitor,
            title: "Digital Caricature",
            desc: "High-resolution JPEG/PNG delivered digitally",
            timeline: "15–20 days",
            from: "₹3,000",
          },
          {
            type: "physical" as const,
            icon: PenTool,
            title: "Physical Caricature",
            desc: "Hand-drawn artwork delivered to your doorstep",
            timeline: "20–25 days",
            from: "₹5,000",
          },
        ].map((option, i) => (
          <motion.div
            key={option.type}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card
              className="cursor-pointer border-2 border-border hover:border-primary/50 transition-all hover:shadow-lg group"
              onClick={() => onSelect(option.type)}
            >
              <CardContent className="p-6 md:p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <option.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold mb-1">{option.title}</h3>
                <p className="text-sm text-muted-foreground font-sans mb-4">{option.desc}</p>
                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="text-muted-foreground">From {option.from}</span>
                  <span className="text-primary font-medium">{option.timeline}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StepTypeSelect;
