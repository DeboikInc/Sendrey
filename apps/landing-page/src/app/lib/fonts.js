import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

export const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

export const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});