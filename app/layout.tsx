import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SettingsEffects } from "@/components/settings/SettingsEffects";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CodeRaid — Play Like a Software Engineer",
  description:
    "CodeRaid is a software engineer simulator. Investigate production incidents, diagnose bugs, apply real fixes, and level up your backend engineering skills.",
  keywords: [
    "software engineer simulator",
    "backend engineering",
    "Node.js",
    "JavaScript",
    "SQL",
    "debugging",
    "interview preparation",
  ],
  openGraph: {
    title: "CodeRaid — Play Like a Software Engineer",
    description:
      "Investigate incidents, diagnose bugs, apply fixes, and level up your engineering skills.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <SettingsEffects />
        {children}
      </body>
    </html>
  );
}
