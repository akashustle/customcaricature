import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type StreamStatus = "idle" | "connecting" | "streaming" | "error";

export const useVoiceStream = (userId: string | null, enabled = true) => {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!userId || !enabled) return;

    // Announce availability via presence
    const presenceCh = supabase.channel(`voice-presence-${userId}`);
    presenceCh.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceCh.track({ user_id: userId, mic_available: true, timestamp: Date.now() });
      }
    });

    // Listen for admin requesting a voice connection
    const signalingCh = supabase.channel(`voice-signal-${userId}`);
    channelRef.current = signalingCh;

    signalingCh.on("broadcast", { event: "offer" }, async ({ payload }) => {
      try {
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: "microphone" as PermissionName });
            if (permission.state !== "granted") {
              setStatus("idle");
              return;
            }
          } catch {}
        }

        setStatus("connecting");

        // Get mic stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Create peer connection
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        // Add audio track
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Send ICE candidates
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            signalingCh.send({ type: "broadcast", event: "ice-candidate-user", payload: { candidate: e.candidate.toJSON() } });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") setStatus("streaming");
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            cleanup();
            setStatus("error");
          }
        };

        // Set remote offer and create answer
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        signalingCh.send({ type: "broadcast", event: "answer", payload: { sdp: answer } });
      } catch (err) {
        console.error("Voice stream error:", err);
        setStatus("error");
      }
    });

    signalingCh.on("broadcast", { event: "ice-candidate-admin" }, async ({ payload }) => {
      try {
        if (pcRef.current && payload.candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      } catch (err) {
        console.error("ICE candidate error:", err);
      }
    });

    signalingCh.on("broadcast", { event: "stop" }, () => {
      cleanup();
    });

    signalingCh.subscribe();

    return () => {
      cleanup();
      supabase.removeChannel(presenceCh);
    };
  }, [userId, enabled, cleanup]);

  return { status, cleanup };
};

// Admin-side hook to listen to a user's voice
export const useAdminVoiceListener = () => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listeningToRef = useRef<string | null>(null);
  const [listeningTo, setListeningTo] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");

  const doCleanup = useCallback(() => {
    try {
      if (channelRef.current && listeningToRef.current) {
        channelRef.current.send({ type: "broadcast", event: "stop", payload: {} });
      }
    } catch {}
    audioRef.current?.pause();
    audioRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    listeningToRef.current = null;
    setListeningTo(null);
    setStatus("idle");
  }, []);

  const startListening = useCallback(async (targetUserId: string) => {
    // Always cleanup previous connection first
    doCleanup();

    // Small delay to ensure channel cleanup completes
    await new Promise(r => setTimeout(r, 300));

    setStatus("connecting");
    setListeningTo(targetUserId);
    listeningToRef.current = targetUserId;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.addTransceiver("audio", { direction: "recvonly" });

    // Use a unique channel name to avoid conflicts
    const channelName = `voice-signal-${targetUserId}`;
    const signalingCh = supabase.channel(channelName, { config: { broadcast: { self: false } } });
    channelRef.current = signalingCh;

    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.play().catch(() => {});
      audioRef.current = audio;
      setStatus("streaming");
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalingCh.send({ type: "broadcast", event: "ice-candidate-admin", payload: { candidate: e.candidate.toJSON() } });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        doCleanup();
      }
    };

    signalingCh.on("broadcast", { event: "answer" }, async ({ payload }) => {
      try {
        if (pcRef.current && pcRef.current.signalingState !== "closed") {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } catch (err) {
        console.error("Answer error:", err);
      }
    });

    signalingCh.on("broadcast", { event: "ice-candidate-user" }, async ({ payload }) => {
      try {
        if (pcRef.current && pcRef.current.signalingState !== "closed" && payload.candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      } catch (err) {
        console.error("ICE candidate error:", err);
      }
    });

    await signalingCh.subscribe();

    // Create offer after subscribe completes
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    signalingCh.send({ type: "broadcast", event: "offer", payload: { sdp: offer } });
  }, [doCleanup]);

  const stopListening = useCallback(() => {
    doCleanup();
  }, [doCleanup]);

  return { startListening, stopListening, listeningTo, status };
};
