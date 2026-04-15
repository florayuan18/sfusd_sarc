import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SARC Navigator",
  description: "Explore nearby schools by commute with mock SARC Navigator data."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
