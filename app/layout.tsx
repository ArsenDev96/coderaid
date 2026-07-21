import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ProgressProvider } from "@/components/progress/ProgressProvider";
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
  title: "CodeRaid — Master Node.js Through Real Production Incidents",
  description:
    "CodeRaid is a Node.js backend debugging and interview-preparation simulator. Investigate logs, metrics, traces and backend code, diagnose the root cause of realistic production incidents, and ship the fix.",
  keywords: [
    "Node.js",
    "Node.js debugging",
    "backend engineering",
    "production incidents",
    "event loop",
    "async JavaScript in Node.js",
    "API performance",
    "backend interview preparation",
  ],
  openGraph: {
    title: "CodeRaid — Master Node.js Through Real Production Incidents",
    description:
      "Debug realistic Node.js production incidents: investigate logs, metrics and traces, diagnose the root cause, apply the fix and verify the result.",
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
        {/* One hydrated progression ledger for the whole app. */}
        <ProgressProvider>{children}</ProgressProvider>
      </body>
    </html>
  );
}
