import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex"
});

export const metadata: Metadata = {
  title: "Project Planner",
  description: "Turn prompts into structured epics, stories, and tasks."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={ibmPlex.variable}>
      <body className="min-h-screen font-[var(--font-ibm-plex)]">
        {children}
      </body>
    </html>
  );
}
