"use client";

import { useEffect, useState } from "react";

const SHOWN_KEY = "splash-shown";

type Props = {
  duration?: number;
};

export function SplashScreen({ duration = 1200 }: Props) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SHOWN_KEY);
  });

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SHOWN_KEY, "1");
    const t = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(t);
  }, [visible, duration]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#252525]">
      <svg
        width="72"
        height="72"
        viewBox="0 0 318 318"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M89 159.344L230 234.688L188.5 159.344L230 84L89 159.344Z"
          fill="white"
        />
      </svg>
      <span
        className="text-[22px] text-white"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        Somewhere
      </span>
    </div>
  );
}
