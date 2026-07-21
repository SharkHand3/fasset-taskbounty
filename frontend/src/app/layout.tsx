import type { Metadata } from "next";

import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fasset-taskbounty.pages.dev"),
  title: {
    default: "TaskBounty | FAsset Work Escrow",
    template: "%s | TaskBounty",
  },
  description:
    "A Coston2 marketplace for funding verifiable work with FAsset escrow.",
  openGraph: {
    description:
      "Fund verifiable work with FTestXRP escrow on Flare Testnet Coston2.",
    siteName: "TaskBounty",
    title: "TaskBounty | FAsset Work Escrow",
    type: "website",
  },
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
