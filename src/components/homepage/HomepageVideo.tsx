import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

const HomepageVideo = ({ config }: { config: any }) => {
  if (!config?.enabled) return null;

  const youtubeUrl = config?.youtube_url;
  const customUrl = config?.custom_video_url;

  if (customUrl) {
    return <CustomVideoPlayer url={customUrl} />;
  }

  if (youtubeUrl) {
    return <YouTubeMinimalPlayer url={youtubeUrl} />;
  }

  return null;
};

const VideoHeader = () => (
  <div className="text-center mb-10">
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-sm font-body font-semibold uppercase tracking-widest text-primary mb-3"
    >Experience</motion.p>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="font-calligraphy text-3xl md:text-5xl font-bold text-foreground"
    >See the Experience Live 🎨</motion.h2>
  </div>
);

const CustomVideoPlayer = ({ url }: { url: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
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
            autoPlay
            loop
            muted
            preload="metadata"
          />
          {/* Controls overlay */}
          <div className={`absolute inset-0 flex items-center justify-center bg-foreground/10 transition-opacity duration-300 ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-lg">
              {playing ? <Pause className="h-6 w-6 text-foreground" /> : <Play className="ml-0.5 h-6 w-6 text-foreground" />}
            </div>
          </div>
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-md z-10 hover:bg-background transition-colors"
          >
            {muted ? <VolumeX className="h-4 w-4 text-foreground" /> : <Volume2 className="h-4 w-4 text-foreground" />}
          </button>
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
                className="absolute inset-0 cursor-pointer group bg-muted flex items-center justify-center"
                onClick={() => setStarted(true)}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 shadow-lg">
                  <Play className="ml-1 h-7 w-7 text-primary-foreground" />
                </div>
              </div>
            ) : (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&cc_load_policy=0&loop=1&playlist=${videoId}`}
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
