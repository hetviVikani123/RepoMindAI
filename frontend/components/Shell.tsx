"use client";

import { Sidebar } from "@/components/Sidebar";

export function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 p-4 lg:grid-cols-[260px_1fr]">
      <Sidebar />
      <section className="space-y-4">
        <header className="panel p-5" style={{ background: "#fff" }}>
          <h1 className="text-3xl">{title}</h1>
          <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>{subtitle}</p>
        </header>
        {children}
      </section>
    </main>
  );
}
