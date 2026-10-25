"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { useRepo } from "@/lib/store";

export function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeRepo } = useRepo();

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Mobile & Tablet Top Bar (hidden on lg and above) */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3.5 sm:px-5 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-sm font-bold border border-indigo-100">
              🧠
            </span>
            <span className="font-bold text-slate-900 text-sm tracking-tight">RepoMind AI</span>
          </Link>
        </div>

        {/* Active Repo Pill */}
        {activeRepo ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 max-w-[130px] sm:max-w-[200px] truncate shadow-2xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{activeRepo.name}</span>
          </Link>
        ) : (
          <Link
            href="/repository-upload"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            + Import Repo
          </Link>
        )}
      </header>

      {/* Main Responsive Grid Layout */}
      <div className="mx-auto flex w-full max-w-7xl flex-col p-3 sm:p-4 md:p-6 lg:flex-row lg:gap-6">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        <main className="min-w-0 w-full flex-1 space-y-4">
          <header className="panel p-4 sm:p-6 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  {title}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {subtitle}
                </p>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
