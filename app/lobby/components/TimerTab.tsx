import { useEffect } from "react";

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export default function TimerTab() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!isMobileDevice()) {
        window.open("https://cstimer.net", "_blank");
      } else {
        window.location.href = "https://cstimer.net";
      }
    }
  }, []);
  return null;
}
