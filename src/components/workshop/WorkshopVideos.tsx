import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, SkipBack, Maximize, Lock, Clock, AlertTriangle, Download, ExternalLink } from "lucide-react";

const WorkshopVideos = ({ user, darkMode = false }: { user: any; darkMode?: boolean }) => {
  const dm = darkMode;
  const [videos, setVideos] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);

  // Booking-dashboard parity: white 3D cards with brand semantic tokens so
  // the workshop tabs feel identical to the user's booking home tab.
  const cardBg = "bg-card border border-border/50 shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.18)]";
  const textPrimary = "text-foreground font-bold";
  const textSecondary = "text-muted-foreground font-medium";
  const textMuted = "text-muted-foreground/70";

  useEffect(() => {
    fetchVideos(); fetchAccess(); fetchSettings();
    const t = setInterval(() => setNow(new Date()), 1000);
    const ch = supabase.channel("ws-videos-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_videos" }, fetchVideos)
      .on("postgres_changes", { event: "*", schema: "public", table: "workshop_settings" }, fetchSettings)
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  const fetchVideos = async () => {
    const { data } = await supabase.from("workshop_videos" as any).select("*").order("workshop_date");
    if (data) setVideos(data as any[]);
  };
  const fetchAccess = async () => {
    const { data } = await supabase.from("workshop_user_video_access" as any).select("*").eq("user_id", user.id);
    if (data) setUserAccess(data as any[]);
  };
  const fetchSettings = async () => {
    const { data } = await supabase.from("workshop_settings" as any).select("*");
    if (data) {
      const map: any = {};
      (data as any[]).forEach((s: any) => { map[s.id] = s.value; });
      setGlobalSettings(map);
    }
  };

  // Filter videos by user's slot
  const filteredVideos = videos.filter(v => {
    if (!v.slot) return true; // No slot = visible to all
    return v.slot === user.slot;
  });

  const getVideoExpiry = (video: any) => {
    const access = userAccess.find((a: any) => a.video_id === video.id);
    if (access?.custom_expiry) return new Date(access.custom_expiry);
    if (video.expiry_date) return new Date(video.expiry_date);
    return null;
  };

  const isVideoAccessible = (video: any) => {
    if (!globalSettings.global_video_access?.enabled) return false;
    if (!user.video_access_enabled) return false;
    const access = userAccess.find((a: any) => a.video_id === video.id);
    if (access && !access.access_enabled) return false;
    const expiry = getVideoExpiry(video);
    if (expiry && now > expiry) return false;
    return true;
  };

  const canDownload = (video: any) => {
    if (!video.global_download_allowed) return false;
    if (user.video_download_allowed) return true;
    const access = userAccess.find((a: any) => a.video_id === video.id);
    if (access?.download_allowed) return true;
    if (globalSettings.global_video_download?.enabled) return true;
    return false;
  };

  const getCountdown = (expiry: Date) => {
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  const skip = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime += seconds;
  };

  const isYouTube = (url: string) => url?.includes("youtube.com") || url?.includes("youtu.be");
  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const handleDownload = async (video: any) => {
    if (video.video_type === "file" && video.video_url) {
      try {
        const { data } = await supabase.storage.from("workshop-files").download(video.video_url);
        if (data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = video.title || "video";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch {}
    }
  };

  const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>
  );

  if (!globalSettings.global_video_access?.enabled) {
    return null;
  }

  return (
    <GlassCard>
      <h2 className={`${textPrimary} text-lg flex items-center gap-2 mb-4`}>
        <Play className="w-5 h-5 text-primary" /> Workshop Videos
      </h2>
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <Play className="w-16 h-16 text-primary/30 mx-auto mb-3" />
          <p className={textSecondary}>No videos available for your slot yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVideos.map((video: any) => {
            const accessible = isVideoAccessible(video);
            const expiry = getVideoExpiry(video);
            const countdown = expiry ? getCountdown(expiry) : null;
            const download = canDownload(video);
            const isActive = activeVideo === video.id;
            const isExternal = video.video_type === "external_link" || video.video_type === "link";
            const isEmbeddable = video.video_type === "embed_link" || isYouTube(video.video_url || "");

            return (
              <div key={video.id} className={`rounded-xl p-4 border ${
                accessible
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-border/60 opacity-60"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`${textPrimary} text-sm`}>{video.title}</h3>
                    <p className={`${textMuted} text-xs`}>
                      {new Date(video.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      {video.slot && ` · ${video.slot === "12pm-3pm" ? "12–3 PM" : "6–9 PM"}`}
                    </p>
                  </div>
                  {!accessible ? (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs font-bold"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                  ) : (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-bold">Available</Badge>
                  )}
                </div>

                {accessible && countdown && (
                  <div className="mt-2 bg-amber-500/10 border-amber-500/30 border rounded-lg p-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Video access expires in:</p>
                      <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">{countdown}</p>
                    </div>
                  </div>
                )}

                {!accessible && expiry && now > expiry && (
                  <div className="mt-2 bg-destructive/10 border-destructive/30 border rounded-lg p-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    <p className="text-xs text-destructive font-medium">Video access has expired</p>
                  </div>
                )}

                {accessible && (
                  <>
                    {isExternal ? (
                      <Button onClick={() => window.open(video.video_url, "_blank")}
                        className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold">
                        <ExternalLink className="w-4 h-4 mr-2" /> Open Link
                      </Button>
                    ) : !isActive ? (
                      <Button onClick={() => setActiveVideo(video.id)}
                        className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold">
                        <Play className="w-4 h-4 mr-2" /> Watch Video
                      </Button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                          {isEmbeddable ? (
                            <iframe src={getYouTubeEmbed(video.video_url)} className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen />
                          ) : (
                            <video ref={videoRef} src={video.video_url} controls
                              controlsList={download ? "" : "nodownload"}
                              onContextMenu={download ? undefined : (e) => e.preventDefault()}
                              className="w-full h-full" playsInline />
                          )}
                        </div>
                        {!isEmbeddable && (
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => skip(-10)} className={`${textMuted} hover:${textSecondary} rounded-lg`}>
                              <SkipBack className="w-4 h-4 mr-1" />10s
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); }}
                              className={`${textMuted} hover:${textSecondary} rounded-lg`}>
                              <Pause className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => skip(10)} className={`${textMuted} hover:${textSecondary} rounded-lg`}>
                              10s<SkipForward className="w-4 h-4 ml-1" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (videoRef.current) { document.fullscreenElement ? document.exitFullscreen() : videoRef.current.requestFullscreen(); }}}
                              className={`${textMuted} hover:${textSecondary} rounded-lg`}>
                              <Maximize className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {download && (
                          <Button variant="outline" size="sm" onClick={() => handleDownload(video)}
                            className="w-full text-primary border-primary/30 hover:bg-primary/5 rounded-lg font-bold">
                            <Download className="w-4 h-4 mr-1" /> Download Video
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};

export default WorkshopVideos;