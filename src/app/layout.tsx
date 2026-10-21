import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lessonova — AI ESL Teaching Assistant",
    template: "%s · Lessonova",
  },
  description:
    "Lessonova helps Filipino online English teachers record lessons, transcribe conversations, analyze grammar, and generate personalized student reports.",
  icons: {
    icon: "/lessonova-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
