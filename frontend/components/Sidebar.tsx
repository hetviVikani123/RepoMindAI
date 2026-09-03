"use client";

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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeRepo, clearActiveRepo } = useRepo();

  function handleLogout() {
    clearTokens();
    clearActiveRepo();
    router.push("/login");
  }

  return (
    <aside
      style={{
        background: "#fff",
        borderRight: "1px solid #e5e7eb",
        borderRadius: "20px",
        boxShadow: "0 12px 28px rgba(17,17,17,0.04)",
      }}
      className="h-fit p-4 lg:sticky lg:top-4"
    >
      {/* Logo */}
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2">
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#111111",
            }}
          >
            ◌
          </div>
          <div>
            <h2 style={{ color: "#111111", fontSize: "15px", fontWeight: 700, margin: 0 }}>
              RepoMind AI
            </h2>
            <p style={{ color: "#6b7280", fontSize: "10px", margin: 0 }}>Repository Intelligence</p>
          </div>
        </div>
      </div>

      {/* Active Repo Badge */}
      {activeRepo ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "10px 12px",
            marginBottom: "16px",
          }}
        >
          <p style={{ color: "#6b7280", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>
            Active Repository
          </p>
          <p style={{ color: "#111111", fontSize: "12px", fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeRepo.name}
          </p>
          <p style={{ color: "#6b7280", fontSize: "10px", margin: 0 }}>
            #{activeRepo.id} · {activeRepo.language}
          </p>
          <Link
            href="/repository-upload"
            style={{
              display: "inline-block",
              marginTop: "8px",
              color: "#818cf8",
              fontSize: "10px",
              textDecoration: "underline",
            }}
          >
            Switch repository →
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "10px 12px",
            marginBottom: "16px",
          }}
        >
          <p style={{ color: "#6b7280", fontSize: "11px", margin: 0 }}>
            ◌ No repository selected. {" "}
            <Link href="/repository-upload" style={{ textDecoration: "underline" }}>
              Import one →
            </Link>
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: active ? 600 : 400,
                  color: active ? "#111111" : "#6b7280",
                  background: active ? "#f9fafb" : "transparent",
                  border: active ? "1px solid #e5e7eb" : "1px solid transparent",
                transition: "all 0.15s ease",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "9999px",
                  border: "1px solid #d1d5db",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  color: "#111111",
                  background: "#fff",
                  flex: "0 0 auto",
                }}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: "10px",
            fontSize: "13px",
            color: "#111111",
            background: "#fff",
            border: "1px solid #e5e7eb",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          ◌ Sign Out
        </button>
      </div>
    </aside>
  );
}
