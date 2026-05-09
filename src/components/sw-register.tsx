"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NEXT_PUBLIC_DISABLE_SW === "1") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (regs.length === 0) return;
        Promise.all(regs.map((reg) => reg.unregister()))
          .then(() => {
            if ("caches" in window) {
              return caches
                .keys()
                .then((keys) =>
                  Promise.all(keys.map((key) => caches.delete(key))),
                );
            }
          })
          .then(() => {
            window.location.reload();
          });
      });
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
