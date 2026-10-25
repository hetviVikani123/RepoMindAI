"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRepo } from "@/lib/store";
import { clearTokens } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "D" },
  { href: "/repository-upload", label: "Repository Upload", icon: "R" },
  { href: "/analysis-progress", label: "Analysis Progress", icon: "A" },
  { href: "/architecture", label: "Architecture", icon: "⌂" },
  { href: "/uml", label: "UML Diagrams", icon: "U" },
  { href: "/dependency-graph", label: "Dependency Graph", icon: "G" },
  { href: "/ai-chat", label: "AI Chat", icon: "C" },
  { href: "/reports", label: "Reports", icon: "P" },
  { href: "/documentation", label: "Documentation", icon: "N" },
  { href: "/settings", label: "Settings", icon: "S" },
  { href: "/admin", label: "Admin Panel", icon: "A" },
] as const;

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export function Sidebar({ mobileOpen = false, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeRepo, clearActiveRepo } = useRepo();

  // Close mobile drawer on route change or ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen?.(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleLogout() {
    clearTokens();
    clearActiveRepo();
    setMobileOpen?.(false);
    router.push("/login");
  }

  function handleLinkClick() {
    setMobileOpen?.(false);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo & Branding */}
      <div className="mb-4 sm:mb-6 px-1 flex items-center justify-between">
        <Link href="/dashboard" onClick={handleLinkClick} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-600 font-bold shadow-sm">
            🧠
          </div>
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-slate-900 leading-none">
              RepoMind AI
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Repository Intelligence</p>
          </div>
        </Link>

        {/* Mobile close button */}
        {setMobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* Active Repo Badge */}
      {activeRepo ? (
        <div className="mb-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Active Repository
            </p>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-900 truncate" title={activeRepo.name}>
            {activeRepo.name}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            #{activeRepo.id} · {activeRepo.language || "Unknown"}
          </p>
          <Link
            href="/repository-upload"
            onClick={handleLinkClick}
            className="mt-2 inline-flex items-center text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            Switch repository →
          </Link>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            ◌ No repository selected.{" "}
            <Link
              href="/repository-upload"
              onClick={handleLinkClick}
              className="font-medium text-indigo-600 underline hover:text-indigo-800"
            >
              Import one →
            </Link>
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={handleLinkClick}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-[13px] font-medium transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition-all ${
                  active
                    ? "bg-white/20 text-white"
                    : "border border-slate-200 bg-white text-slate-700 shadow-2xs"
                }`}
              >
                {icon}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="mt-auto pt-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          type="button"
          className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all cursor-pointer shadow-2xs"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px]">
            🚪
          </span>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block lg:sticky lg:top-4 h-[calc(100vh-2rem)] w-[260px] shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen?.(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-out drawer */}
          <div className="relative flex w-[280px] max-w-[85vw] flex-col bg-white p-4 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
