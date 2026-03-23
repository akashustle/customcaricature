import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

const HomepageVideo = ({ config }: { config: any }) => {
  if (!config?.enabled) return null;

  const youtubeUrl = config?.youtube_url;
  const customUrl = config?.custom_video_url;

  // If custom video URL provided, render native HTML5 video
  if (customUrl) {
    return <CustomVideoPlayer url={customUrl} />;
  }

  // YouTube embed with minimal controls
  if (youtubeUrl) {
    return <YouTubeMinimalPlayer url={youtubeUrl} />;
  }

  return null;
};

const CustomVideoPlayer = ({ url }: { url: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

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
          className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-border relative group cursor-pointer"
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={url}
            className="w-full aspect-video object-cover"
            playsInline
            preload="metadata"
            onEnded={() => setPlaying(false)}
          />
          {/* Play/Pause overlay */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"} bg-black/20`}>
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
              {playing ? <Pause className="w-7 h-7 text-primary-foreground" /> : <Play className="w-7 h-7 text-primary-foreground ml-1" />}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const YouTubeMinimalPlayer = ({ url }: { url: string }) => {
  const [started, setStarted] = useState(false);

  const getYouTubeId = (u: string) => {
    const match = u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match?.[1] || "";
  };

  const videoId = getYouTubeId(url);
  if (!videoId) return null;

  // Thumbnail click-to-play to avoid showing YouTube UI initially
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

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
            {!started ? (
              <div
                className="absolute inset-0 cursor-pointer group"
                onClick={() => setStarted(true)}
              >
                <img
                  src={thumbnailUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 md:w-9 md:h-9 text-primary-foreground ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&cc_load_policy=0`}
                title="Experience Video"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen={false}
              />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomepageVideo;
