import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { Sparkles } from "lucide-react";

const Icon = ({ name, className }: { name?: string; className?: string }) => {
  const Comp = (name && (LucideIcons as any)[name]) || Sparkles;
  return <Comp className={className} />;
};

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const alignText = (a?: string) => a === "left" ? "text-left" : a === "right" ? "text-right" : "text-center";
const alignFlex = (a?: string) => a === "left" ? "justify-start" : a === "right" ? "justify-end" : "justify-center";

/**
 * Renders a single generic homepage block (heading, paragraph, image, button,
 * card-grid, spacer, html). Used by the homepage builder for arbitrary content
 * inserted between the canonical homepage sections.
 */
const HomepageGenericBlock = ({ type, content }: { type: string; content: any }) => {
  const navigate = useNavigate();
  const c = content || {};
  const motionProps = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.5 },
  };
  const handleClick = (href?: string) => {
    if (!href) return;
    if (href.startsWith("http")) window.open(href, "_blank");
    else navigate(href);
  };

  switch (type) {
    case "heading": {
      const level = Math.min(Math.max(c.level || 2, 1), 4);
      const Tag = (`h${level}`) as keyof JSX.IntrinsicElements;
      const sizeMap: Record<number, string> = {
        1: "text-4xl md:text-6xl",
        2: "text-3xl md:text-5xl",
        3: "text-2xl md:text-4xl",
        4: "text-xl md:text-2xl",
      };
      return (
        <motion.section {...motionProps} className="px-3 sm:px-4 my-5 sm:my-6">
          <div className="mx-auto max-w-7xl">
            <Tag
              className={cx("font-extrabold tracking-tight text-foreground", sizeMap[level], alignText(c.align))}
              style={c.color ? { color: c.color } : undefined}
            >
              {c.text || "Heading"}
            </Tag>
          </div>
        </motion.section>
      );
    }
    case "paragraph":
      return (
        <motion.section {...motionProps} className="px-3 sm:px-4 my-3">
          <div className="mx-auto max-w-3xl">
            <p
              className={cx("text-base md:text-lg text-muted-foreground leading-relaxed", alignText(c.align))}
              style={c.color ? { color: c.color } : undefined}
            >
              {c.text}
            </p>
          </div>
        </motion.section>
      );
    case "image":
      if (!c.url) return null;
      return (
        <motion.section {...motionProps} className="px-3 sm:px-4 my-5">
          <figure className="mx-auto max-w-5xl">
            <img
              src={c.url}
              alt={c.alt || ""}
              loading="lazy"
              className={cx("w-full object-cover", c.rounded !== false ? "rounded-3xl" : "")}
              style={{ height: c.height || 360, maxHeight: "70vh" }}
            />
            {c.caption && (
              <figcaption className="mt-2 text-center text-xs text-muted-foreground">{c.caption}</figcaption>
            )}
          </figure>
        </motion.section>
      );
    case "button": {
      const variant = c.variant || "primary";
      const cls = variant === "gradient"
        ? "bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground hover:opacity-90 shadow-lg"
        : "";
      const btnVariant: any = variant === "outline" ? "outline" : variant === "ghost" ? "ghost" : "default";
      return (
        <motion.section {...motionProps} className={cx("px-3 sm:px-4 my-4 flex", alignFlex(c.align))}>
          <Button size="lg" variant={btnVariant} className={cx("rounded-full h-12 px-8", cls)} onClick={() => handleClick(c.href)}>
            {c.text || "Click"}
          </Button>
        </motion.section>
      );
    }
    case "card_grid": {
      const cols = Math.min(Math.max(c.columns || 3, 1), 4);
      const colsClass = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[cols];
      return (
        <motion.section {...motionProps} className="px-3 sm:px-4 my-6">
          <div className="mx-auto max-w-7xl">
            {c.title && (
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground text-center mb-7">
                {c.title}
              </h2>
            )}
            <div className={cx("grid grid-cols-1 gap-4", colsClass)}>
              {(c.cards || []).map((card: any, ci: number) => (
                <motion.div
                  key={ci}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: ci * 0.07 }}
                  className="rounded-2xl bg-card border border-border p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Icon name={card.icon} className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      );
    }
    case "spacer":
      return <div style={{ height: c.height || 48 }} />;
    case "html":
      return (
        <motion.section {...motionProps} className="px-3 sm:px-4 my-3">
          <div className="mx-auto max-w-7xl" dangerouslySetInnerHTML={{ __html: c.html || "" }} />
        </motion.section>
      );
    default:
      return null;
  }
};

export default HomepageGenericBlock;
