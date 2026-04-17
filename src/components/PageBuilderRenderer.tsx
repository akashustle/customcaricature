import { useMemo } from "react";
import { motion } from "framer-motion";
import { useContentBlocks } from "@/hooks/useContentBlocks";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { Sparkles } from "lucide-react";

interface Props {
  page: string;
  className?: string;
}

const Icon = ({ name, className }: { name?: string; className?: string }) => {
  const Comp = (name && (LucideIcons as any)[name]) || Sparkles;
  return <Comp className={className} />;
};

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const alignToText = (a?: string) => a === "left" ? "text-left" : a === "right" ? "text-right" : "text-center";
const alignToFlex = (a?: string) => a === "left" ? "justify-start" : a === "right" ? "justify-end" : "justify-center";

/**
 * Renders all admin-built blocks for `page` in order, with framer-motion entrance.
 * Lives at the bottom of Workshop.tsx, Dashboard.tsx, WorkshopDashboard.tsx.
 */
const PageBuilderRenderer = ({ page, className = "" }: Props) => {
  const { blocks, loading } = useContentBlocks(page);
  const navigate = useNavigate();

  const visible = useMemo(
    () => blocks.filter(b => b.is_visible !== false).sort((a, b) => a.sort_order - b.sort_order),
    [blocks]
  );

  if (loading || visible.length === 0) return null;

  const handleClick = (href?: string) => {
    if (!href) return;
    if (href.startsWith("http")) window.open(href, "_blank");
    else navigate(href);
  };

  return (
    <div className={cx("w-full", className)}>
      {visible.map((b, i) => {
        const c = b.content || {};
        const motionProps = {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-50px" },
          transition: { duration: 0.5, delay: Math.min(i * 0.05, 0.3) },
        };

        switch (b.block_type) {
          case "heading": {
            const Tag = (`h${Math.min(Math.max(c.level || 2, 1), 4)}`) as keyof JSX.IntrinsicElements;
            const sizeMap: Record<number, string> = {
              1: "text-4xl md:text-6xl",
              2: "text-3xl md:text-5xl",
              3: "text-2xl md:text-4xl",
              4: "text-xl md:text-2xl",
            };
            return (
              <motion.section key={b.id} {...motionProps} className="container mx-auto px-4 py-6">
                <Tag
                  className={cx("font-calligraphy font-bold text-foreground", sizeMap[c.level || 2], alignToText(c.align))}
                  style={c.color ? { color: c.color } : undefined}
                >
                  {c.text}
                </Tag>
              </motion.section>
            );
          }
          case "paragraph":
            return (
              <motion.section key={b.id} {...motionProps} className="container mx-auto px-4 py-3 max-w-3xl">
                <p
                  className={cx("font-body text-base md:text-lg text-muted-foreground leading-relaxed", alignToText(c.align))}
                  style={c.color ? { color: c.color } : undefined}
                >
                  {c.text}
                </p>
              </motion.section>
            );
          case "image":
            return (
              <motion.section key={b.id} {...motionProps} className="container mx-auto px-4 py-6">
                {c.url && (
                  <figure className="max-w-5xl mx-auto">
                    <img
                      src={c.url}
                      alt={c.alt || ""}
                      loading="lazy"
                      className={cx("w-full object-cover", c.rounded !== false ? "rounded-2xl" : "")}
                      style={{ height: c.height || 320, maxHeight: "70vh" }}
                    />
                    {c.caption && (
                      <figcaption className="mt-2 text-center text-xs text-muted-foreground font-body">{c.caption}</figcaption>
                    )}
                  </figure>
                )}
              </motion.section>
            );
          case "button": {
            const variant = c.variant || "primary";
            const align = alignToFlex(c.align);
            const cls =
              variant === "gradient"
                ? "bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground hover:opacity-90 shadow-lg"
                : "";
            const btnVariant: any =
              variant === "outline" ? "outline" : variant === "ghost" ? "ghost" : "default";
            return (
              <motion.section key={b.id} {...motionProps} className={cx("container mx-auto px-4 py-4 flex", align)}>
                <Button size="lg" variant={btnVariant} className={cx("rounded-full font-body h-12 px-8", cls)} onClick={() => handleClick(c.href)}>
                  {c.text || "Click"}
                </Button>
              </motion.section>
            );
          }
          case "card-grid": {
            const cols = Math.min(Math.max(c.columns || 3, 1), 4);
            const colsClass = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[cols];
            return (
              <motion.section key={b.id} {...motionProps} className="container mx-auto px-4 py-6">
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
                      <h3 className="font-calligraphy text-xl font-bold text-foreground mb-1">{card.title}</h3>
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">{card.body}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            );
          }
          case "spacer":
            return <div key={b.id} style={{ height: c.height || 48 }} />;
          case "html":
            return (
              <motion.section key={b.id} {...motionProps} className="container mx-auto px-4 py-3">
                <div dangerouslySetInnerHTML={{ __html: c.html || "" }} />
              </motion.section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};

export default PageBuilderRenderer;
