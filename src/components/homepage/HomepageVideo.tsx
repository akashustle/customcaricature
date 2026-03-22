import { motion } from "framer-motion";

const HomepageVideo = ({ config }: { config: any }) => {
  if (!config?.enabled || !config?.youtube_url) return null;

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match?.[1] || "";
  };

  const videoId = getYouTubeId(config.youtube_url);
  if (!videoId) return null;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&disablekb=1&fs=0&playsinline=1`;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Experience</p>
          <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground">See the Experience Live 🎨</h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-border"
        >
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={embedUrl}
              title="Creative Caricature Club Experience"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={false}
              loading="lazy"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomepageVideo;
