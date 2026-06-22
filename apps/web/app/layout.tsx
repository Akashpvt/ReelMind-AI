import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelMind AI | From Idea to Viral Reel in Minutes",
  description:
    "A cinematic AI SaaS landing page foundation for creators generating viral hooks, scripts, captions, and thumbnails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
