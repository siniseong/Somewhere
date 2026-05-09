"use client";

// HeroUI v3 doesn't ship a single global provider — components work standalone.
// Keep this file so we have a single seam to add Toast/I18n providers later.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
