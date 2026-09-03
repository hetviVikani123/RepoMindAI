"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useRepo } from "@/lib/store";
import { fetchAnalysis, repositoryStatus } from "@/lib/api";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function DashboardPage() {
  const { activeRepo } = useRepo();
  const router = useRouter();
  const [stats, setStats] = useState<{ embeddings: number; indexed: boolean } | null>(null);
  const [debt, setDebt] = useState<{ debt_score: number; maintainability: number; grade: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeRepo) return;
    setLoading(true);
    Promise.all([
      repositoryStatus(activeRepo.id).catch(() => null),
      fetchAnalysis("technical-debt", activeRepo.id).catch(() => null),
    ]).then(([statusData, debtData]) => {
      if (statusData) setStats(statusData);
      if (debtData?.result) setDebt(debtData.result);
      setLoading(false);
    });
  }, [activeRepo]);

  if (!activeRepo) {
    return (
      <Shell title="Dashboard" subtitle="Live overview of repository intelligence.">
        <section className="panel p-12 text-center">
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧠</div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>Welcome to RepoMind AI</h2>
          <p style={{ color: "#64748b", marginBottom: "24px" }}>
            Import a GitHub repository to unlock all features: architecture analysis, UML diagrams,
            AI chat, security reports, and auto-generated documentation.
          </p>
          <button
            onClick={() => router.push("/repository-upload")}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "12px 28px",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            Import Repository →
          </button>
        </section>

        <section className="panel p-6">
          <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Onboarding Flow</h2>
          <ol style={{ paddingLeft: "20px", margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              "Paste a GitHub URL in Repository Upload",
              "Wait for the analysis pipeline to complete (AST parser, embeddings, knowledge graph, static analysis)",
              "Inspect architecture diagrams and UML generated from your code",
              "Ask natural-language questions in AI Chat",
              "View technical debt score and security findings in Reports",
              "Generate README and module documentation automatically",
            ].map((step, i) => (
              <li key={i} style={{ fontSize: "14px", color: "#374151" }}>
                <strong style={{ color: "#6366f1" }}>Step {i + 1}:</strong> {step}
              </li>
            ))}
          </ol>
        </section>
      </Shell>
    );
  }

  const gradeColor: Record<string, string> = {
    A: "#16a34a", B: "#65a30d", C: "#d97706", D: "#ea580c", F: "#dc2626",
  };

  return (
    <Shell title="Dashboard" subtitle={`Repository: ${activeRepo.name}`}>
      {/* KPI Cards */}
      <section style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {[
          { label: "Repository ID", value: `#${activeRepo.id}` },
          { label: "Language", value: activeRepo.language || "—" },
          { label: "Framework", value: activeRepo.framework || "—" },
          { label: "Embeddings Indexed", value: loading ? "…" : stats ? `${stats.embeddings.toLocaleString()}` : "—" },
          { label: "Indexed", value: stats ? (stats.indexed ? "✅ Yes" : "⏳ In Progress") : "—" },
          { label: "Debt Score", value: debt ? `${debt.debt_score}/100` : loading ? "…" : "—" },
          { label: "Maintainability", value: debt ? `${debt.maintainability}%` : loading ? "…" : "—" },
          { label: "Grade", value: debt?.grade ?? (loading ? "…" : "—"), color: debt?.grade ? gradeColor[debt.grade] : undefined },
        ].map(({ label, value, color }) => (
          <article
            key={label}
            style={{
              padding: "20px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              background: "linear-gradient(140deg, #fff, #f8fafc)",
            }}
          >
            <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "0 0 8px" }}>{label}</p>
            <p style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: color ?? "#0f172a" }}>{value}</p>
          </article>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="panel p-6">
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
          {[
            { href: "/architecture", icon: "🏗️", label: "Architecture" },
            { href: "/uml", icon: "📐", label: "UML Diagrams" },
            { href: "/dependency-graph", icon: "🔗", label: "Dependencies" },
            { href: "/ai-chat", icon: "🤖", label: "AI Chat" },
            { href: "/reports", icon: "📊", label: "Reports" },
            { href: "/documentation", icon: "📄", label: "Documentation" },
          ].map(({ href, icon, label }) => (
            <a
              key={href}
              href={href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                padding: "20px 12px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                textDecoration: "none",
                color: "#0f172a",
                fontSize: "13px",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "28px" }}>{icon}</span>
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* Repo Details */}
      <section className="panel p-6">
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>Repository Details</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <tbody>
            {[
              ["Name", activeRepo.name],
              ["URL", activeRepo.url],
              ["Local Path", activeRepo.local_path],
              ["Language", activeRepo.language],
              ["Framework", activeRepo.framework],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 0", color: "#64748b", width: "140px", fontWeight: 500 }}>{k}</td>
                <td style={{ padding: "8px 0", wordBreak: "break-all" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}
