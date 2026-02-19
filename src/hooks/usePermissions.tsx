import { useEffect, useState } from "react";

export type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";

export const usePermissions = (requestOnMount = true) => {
  const [location, setLocation] = useState<PermissionStatus>("prompt");
  const [microphone, setMicrophone] = useState<PermissionStatus>("prompt");
  const [camera, setCamera] = useState<PermissionStatus>("prompt");

  useEffect(() => {
    // Check existing permissions
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then(r => setLocation(r.state as PermissionStatus)).catch(() => {});
      navigator.permissions.query({ name: "microphone" as PermissionName }).then(r => setMicrophone(r.state as PermissionStatus)).catch(() => {});
      navigator.permissions.query({ name: "camera" as PermissionName }).then(r => setCamera(r.state as PermissionStatus)).catch(() => {});
    }

    if (requestOnMount) {
      // Request location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocation("granted"),
          () => setLocation("denied"),
          { timeout: 5000 }
        );
      }

      // Request microphone
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(stream => {
          setMicrophone("granted");
          stream.getTracks().forEach(t => t.stop()); // Stop immediately, just checking
        })
        .catch(() => setMicrophone("denied"));
    }
  }, [requestOnMount]);

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophone("granted");
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      setMicrophone("denied");
      return false;
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCamera("granted");
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      setCamera("denied");
      return false;
    }
  };

  return { location, microphone, camera, requestMicrophone, requestCamera };
};
