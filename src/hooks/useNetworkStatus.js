import { useEffect, useState } from "react";

const getInitialStatus = () => {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
};

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(getInitialStatus);
  const [lastChangedAt, setLastChangedAt] = useState(() => Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChangedAt(Date.now());
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLastChangedAt(Date.now());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastChangedAt,
  };
}
