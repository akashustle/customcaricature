import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, SkipBack, Maximize, Lock, Clock, AlertTriangle } from "lucide-react";

const WorkshopVideos = ({ user }: { user: any }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchVideos();
    fetchAccess();
    fetchSettings();
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
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
    if (user.video_download_allowed) return true;
    const access = userAccess.find((a: any) => a.video_id === video.id);
    if (access?.download_allowed) return true;
    if (video.global_download_allowed) return true;
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
    return `${days.toString().padStart(2, "0")} Days ${hours.toString().padStart(2, "0")} Hours ${mins.toString().padStart(2, "0")} Minutes ${secs.toString().padStart(2, "0")} Seconds`;
  };

  const skip = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime += seconds;
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) document.exitFullscreen();
      else videoRef.current.requestFullscreen();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" /> Workshop Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <Play className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-sans">No videos uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video: any) => {
                const accessible = isVideoAccessible(video);
                const expiry = getVideoExpiry(video);
                const countdown = expiry ? getCountdown(expiry) : null;
                const download = canDownload(video);
                const isActive = activeVideo === video.id;

                return (
                  <Card key={video.id} className={`overflow-hidden ${!accessible ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-sans font-semibold text-foreground">{video.title}</h3>
                          <p className="text-xs text-muted-foreground font-sans">
                            {new Date(video.workshop_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            {video.slot && ` · ${video.slot === "12pm-3pm" ? "12 PM – 3 PM" : "6 PM – 9 PM"}`}
                          </p>
                        </div>
                        {!accessible ? (
                          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                            <Lock className="w-3 h-3" /> Locked
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/20 text-primary border-none text-xs">Available</Badge>
                        )}
                      </div>

                      {/* Countdown Timer */}
                      {accessible && countdown && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-amber-600 font-sans font-medium">Video access expires in:</p>
                            <p className="text-sm font-mono font-bold text-amber-700 dark:text-amber-400">{countdown}</p>
                          </div>
                        </div>
                      )}

                      {!accessible && expiry && now > expiry && (
                        <div className="bg-destructive/10 rounded-xl p-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                          <p className="text-xs text-destructive font-sans">Video access has expired</p>
                        </div>
                      )}

                      {/* Video Player */}
                      {accessible && (
                        <>
                          {!isActive ? (
                            <Button onClick={() => setActiveVideo(video.id)} className="w-full font-sans">
                              <Play className="w-4 h-4 mr-2" /> Watch Video
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                                <video
                                  ref={videoRef}
                                  src={video.video_url}
                                  controls
                                  controlsList={download ? "" : "nodownload"}
                                  onContextMenu={download ? undefined : (e) => e.preventDefault()}
                                  className="w-full h-full"
                                  playsInline
                                />
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => skip(-10)} className="font-sans">
                                  <SkipBack className="w-4 h-4 mr-1" /> 10s
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => { if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); }}>
                                  <Pause className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => skip(10)} className="font-sans">
                                  10s <SkipForward className="w-4 h-4 ml-1" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                                  <Maximize className="w-4 h-4" />
                                </Button>
                              </div>
                              {!download && (
                                <p className="text-[10px] text-center text-muted-foreground font-sans">Download is disabled for this video</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkshopVideos;
