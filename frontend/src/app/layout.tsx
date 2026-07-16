import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAsset TaskBounty | Coston2 Verification Dashboard",
  description:
    "A read-only TaskBounty V2 dashboard that verifies Coston2 state and immutable artifact commitments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
