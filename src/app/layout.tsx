import type { Metadata, Viewport } from "next";
import { Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { Providers } from "./providers";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "somr";
const APP_DESCRIPTION = "Places remember how you felt.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#252525",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${sourceSerif.variable} ${geistMono.variable} dark h-full bg-[#f3f4f6] antialiased`}
    >
      <body className="min-h-dvh bg-[#f3f4f6] text-zinc-100">
        <Providers>
          <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-[var(--background)]">
            {children}
          </div>
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
