import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import defaultThumbnail from "@/assets/video-thumbnail.jpeg";

const HomepageVideo = ({ config }: { config: any }) => {
  if (!config?.enabled) return null;

  const youtubeUrl = config?.youtube_url;
  const customUrl = config?.custom_video_url;
  const thumbnailUrl = config?.thumbnail_url || defaultThumbnail;

  if (customUrl) {
    return <CustomVideoPlayer url={customUrl} thumbnailUrl={thumbnailUrl} />;
  }

  if (youtubeUrl) {
    return <YouTubeMinimalPlayer url={youtubeUrl} thumbnailUrl={thumbnailUrl} />;
  }

  return null;
};

const VideoHeader = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="text-center mb-10"
  >
    <p className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3">Experience</p>
    <h2 className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground">See the Experience Live 🎨</h2>
  </motion.div>
);

const ThumbnailOverlay = ({ thumbnailUrl, playing }: { thumbnailUrl: string; playing: boolean }) => (
  <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
    <img src={thumbnailUrl} alt="CCC event video thumbnail" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
    <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-background/10 to-background/70" />
    <div className="relative flex flex-col items-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 shadow-lg ring-4 ring-background/40">
        {playing ? <Pause className="h-7 w-7 text-primary-foreground" /> : <Play className="ml-1 h-7 w-7 text-primary-foreground" />}
      </div>
      <div>
        <p className="text-lg font-semibold text-primary-foreground">Play to view one of our events</p>
        <p className="text-sm text-primary-foreground/80">Creative Caricature Club live moments</p>
      </div>
    </div>
  </div>
);

const CustomVideoPlayer = ({ url, thumbnailUrl }: { url: string; thumbnailUrl: string }) => {
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
        <VideoHeader />
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
            poster={thumbnailUrl}
            onEnded={() => setPlaying(false)}
          />
          <ThumbnailOverlay thumbnailUrl={thumbnailUrl} playing={playing} />
        </motion.div>
      </div>
    </section>
  );
};

const YouTubeMinimalPlayer = ({ url, thumbnailUrl }: { url: string; thumbnailUrl: string }) => {
  const [started, setStarted] = useState(false);

  const getYouTubeId = (u: string) => {
    const match = u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match?.[1] || "";
  };

  const videoId = getYouTubeId(url);
  if (!videoId) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <VideoHeader />
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
                <ThumbnailOverlay thumbnailUrl={thumbnailUrl} playing={false} />
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
