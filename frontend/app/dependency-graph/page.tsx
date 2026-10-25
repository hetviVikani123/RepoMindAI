"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CytoscapeGraph } from "@/components/CytoscapeGraph";
import { Shell } from "@/components/Shell";
import { useRepo } from "@/lib/store";
import { fetchAnalysis } from "@/lib/api";

export default function DependencyGraphPage() {
  const { activeRepo } = useRepo();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [elements, setElements] = useState<Array<{ data: { id: string; source?: string; target?: string; label?: string } }>>([]);
  const [circular, setCircular] = useState<string[][]>([]);
  const [moduleCount, setModuleCount] = useState(0);
  const [error, setError] = useState("");

  async function analyze() {
    if (!activeRepo) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAnalysis("dependencies", activeRepo.id);
      setElements(data.result.cytoscape_elements || []);
      setCircular(data.result.circular_dependencies || []);
      setModuleCount(data.result.module_count || 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeRepo) {
      analyze();
    }
  }, [activeRepo?.id]);

  if (!activeRepo) {
    return (
      <Shell title="Dependency Graph" subtitle="Inspect imports and circular module relationships.">
        <section className="panel p-6 sm:p-10 text-center">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">No repository selected.</p>
          <button
            onClick={() => router.push("/repository-upload")}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer"
          >
            Import Repository →
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell title="Dependency Graph" subtitle={`Module dependencies for: ${activeRepo.name}`}>
      <section className="panel p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="m-0 text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            Parses import statements and builds a dependency graph. Detects circular dependencies.
          </p>
          <button
            onClick={analyze}
            disabled={loading}
            className={`w-full sm:w-auto rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all whitespace-nowrap ${
              loading
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
            }`}
          >
            {loading ? "Analyzing…" : "Analyze Dependencies"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-600">
            {error}
          </div>
        )}

        {moduleCount > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {[
              { label: "Modules", value: moduleCount, color: "#6366f1" },
              { label: "Circular Deps", value: circular.length, color: circular.length > 0 ? "#dc2626" : "#16a34a" },
              { label: "Graph Nodes", value: elements.filter((e) => !e.data.source).length, color: "#0369a1" },
              { label: "Graph Edges", value: elements.filter((e) => e.data.source).length, color: "#0369a1" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-center shadow-2xs"
              >
                <p className="text-xl sm:text-2xl font-bold truncate" style={{ color }}>{value}</p>
                <p className="mt-1 text-[11px] sm:text-xs text-slate-500 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Circular dependencies warning */}
        {circular.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-3.5 sm:p-4">
            <h3 className="text-xs sm:text-sm font-bold text-red-700 mb-2">
              ⚠️ {circular.length} Circular Dependenc{circular.length === 1 ? "y" : "ies"} Detected
            </h3>
            <div className="flex flex-col gap-1">
              {circular.slice(0, 10).map((pair, i) => (
                <p key={i} className="m-0 font-mono text-[11px] sm:text-xs text-red-900 break-all">
                  {pair[0]} ↔ {pair[1]}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Layer Color Legend */}
        {elements.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 sm:p-3">
            {[
              { label: "Entry", color: "#8b5cf6" },
              { label: "API / Routes", color: "#3b82f6" },
              { label: "Services", color: "#10b981" },
              { label: "Models", color: "#f59e0b" },
              { label: "UI / Views", color: "#ec4899" },
              { label: "Config", color: "#64748b" },
              { label: "Utilities", color: "#06b6d4" },
              { label: "Tests", color: "#6366f1" },
              { label: "Scripts", color: "#f97316" },
              { label: "Data", color: "#14b8a6" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cytoscape graph */}
        {elements.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Dependency Graph ({elements.filter((e) => !e.data.source).length} nodes)
            </h3>
            <CytoscapeGraph elements={elements} />
          </div>
        )}
      </section>
    </Shell>
  );
}
