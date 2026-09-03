import type { Metadata } from "next";
import "./globals.css";
import { RepoProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "RepoMind AI — Repository Intelligence Platform",
  description: "Upload any GitHub repository and get automated architecture diagrams, UML, security analysis, and an AI chatbot grounded in your codebase."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RepoProvider>{children}</RepoProvider>
      </body>
    </html>
  );
}
