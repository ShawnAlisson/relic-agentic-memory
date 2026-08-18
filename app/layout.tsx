import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relic — Agentic memory that does not go down",
  description:
    "On-call agents that store, retrieve, and act on memory in CockroachDB. Built for the CockroachDB × AWS Hackathon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&family=Newsreader:opsz,wght@6..72,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
