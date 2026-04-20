import { useEffect, useState } from "react";

export type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";

export const usePermissions = (requestOnMount = false) => {
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

      if (navigator.permissions) {
        navigator.permissions.query({ name: "microphone" as PermissionName }).then(r => {
          if (r.state === "granted") {
            navigator.mediaDevices?.getUserMedia({ audio: true })
              .then(stream => {
                setMicrophone("granted");
                stream.getTracks().forEach(t => t.stop());
              })
              .catch(() => setMicrophone("denied"));
          }
        }).catch(() => {});

        navigator.permissions.query({ name: "camera" as PermissionName }).then(r => {
          if (r.state === "granted") {
            navigator.mediaDevices?.getUserMedia({ video: true })
              .then(stream => {
                setCamera("granted");
                stream.getTracks().forEach(t => t.stop());
              })
              .catch(() => setCamera("denied"));
          }
        }).catch(() => {});
      }
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

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocation("unsupported");
      return false;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocation("granted");
            resolve();
          },
          () => {
            setLocation("denied");
            reject(new Error("Location denied"));
          },
          { timeout: 10000 }
        );
      });
      return true;
    } catch {
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

  return { location, microphone, camera, requestMicrophone, requestCamera, requestLocation };
};
