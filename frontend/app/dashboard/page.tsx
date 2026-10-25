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
        <section className="panel p-6 sm:p-10 md:p-12 text-center">
          <div className="text-4xl sm:text-5xl mb-4">🧠</div>
          <h2 className="text-lg sm:text-2xl font-bold mb-2 text-slate-900">Welcome to RepoMind AI</h2>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            Import a GitHub repository to unlock all features: architecture analysis, UML diagrams,
            AI chat, security reports, and auto-generated documentation.
          </p>
          <button
            onClick={() => router.push("/repository-upload")}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer"
          >
            Import Repository →
          </button>
        </section>

        <section className="panel p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-4">Onboarding Flow</h2>
          <ol className="m-0 pl-4 sm:pl-5 flex flex-col gap-3">
            {[
              "Paste a GitHub URL in Repository Upload",
              "Wait for the analysis pipeline to complete (AST parser, embeddings, knowledge graph, static analysis)",
              "Inspect architecture diagrams and UML generated from your code",
              "Ask natural-language questions in AI Chat",
              "View technical debt score and security findings in Reports",
              "Generate README and module documentation automatically",
            ].map((step, i) => (
              <li key={i} className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="text-indigo-600 font-semibold">Step {i + 1}:</strong> {step}
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
      <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-3.5 sm:p-5 shadow-2xs"
          >
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {label}
            </p>
            <p
              className="text-lg sm:text-2xl font-bold truncate mt-1"
              style={{ color: color ?? "#0f172a" }}
              title={String(value)}
            >
              {value}
            </p>
          </article>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="panel p-4 sm:p-6">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {[
            { href: "/analysis-progress", icon: "📊", label: "Analysis" },
            { href: "/architecture", icon: "🏗️", label: "Architecture" },
            { href: "/uml", icon: "📐", label: "UML" },
            { href: "/dependency-graph", icon: "🔗", label: "Dependencies" },
            { href: "/ai-chat", icon: "🤖", label: "AI Chat" },
            { href: "/reports", icon: "📋", label: "Reports" },
            { href: "/documentation", icon: "📄", label: "Docs" },
          ].map(({ href, icon, label }) => (
            <a
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-slate-800 shadow-2xs hover:bg-indigo-50/50 hover:border-indigo-200 hover:text-indigo-600 transition-all text-center"
            >
              <span className="text-2xl sm:text-3xl">{icon}</span>
              <span className="text-xs font-semibold leading-tight">{label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Repo Details */}
      <section className="panel p-4 sm:p-6">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Repository Details</h2>
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <tbody>
              {[
                ["Name", activeRepo.name],
                ["URL", activeRepo.url],
                ["Local Path", activeRepo.local_path],
                ["Language", activeRepo.language],
                ["Framework", activeRepo.framework],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-slate-100 last:border-none">
                  <td className="py-2.5 pr-4 text-slate-500 font-medium whitespace-nowrap w-28 sm:w-36">
                    {k}
                  </td>
                  <td className="py-2.5 text-slate-900 font-mono text-[11px] sm:text-xs break-all">
                    {v || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
