import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RepoProvider } from "@/lib/store";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "RepoMind AI — Repository Intelligence Platform",
  description: "Upload any GitHub repository and get automated architecture diagrams, UML, security analysis, and an AI chatbot grounded in your codebase.",
  applicationName: "RepoMind AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RepoMind AI",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full overflow-x-hidden antialiased">
        <RepoProvider>{children}</RepoProvider>
      </body>
    </html>
  );
}
