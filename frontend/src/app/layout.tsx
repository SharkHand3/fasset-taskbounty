import type { Metadata } from "next";

import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "FAsset TaskBounty | Coston2 Verification Dashboard",
  description:
    "A TaskBounty V2 dashboard that verifies Coston2 state, immutable artifact commitments, and optional browser-wallet identity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
