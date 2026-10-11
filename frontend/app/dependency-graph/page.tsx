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
        <section className="panel p-8 text-center">
          <p style={{ color: "#64748b", marginBottom: "16px" }}>No repository selected.</p>
          <button
            onClick={() => router.push("/repository-upload")}
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}
          >
            Import Repository →
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell title="Dependency Graph" subtitle={`Module dependencies for: ${activeRepo.name}`}>
      <section className="panel p-6 space-y-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            Parses import statements and builds a dependency graph. Detects circular dependencies.
          </p>
          <button
            onClick={analyze}
            disabled={loading}
            style={{
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Analyzing…" : "Analyze Dependencies"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", color: "#dc2626", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {moduleCount > 0 && (
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "Modules", value: moduleCount, color: "#6366f1" },
              { label: "Circular Deps", value: circular.length, color: circular.length > 0 ? "#dc2626" : "#16a34a" },
              { label: "Graph Nodes", value: elements.filter((e) => !e.data.source).length, color: "#0369a1" },
              { label: "Graph Edges", value: elements.filter((e) => e.data.source).length, color: "#0369a1" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", textAlign: "center", background: "#fff" }}
              >
                <p style={{ fontSize: "24px", fontWeight: 700, color, margin: 0 }}>{value}</p>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Circular dependencies warning */}
        {circular.length > 0 && (
          <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <h3 style={{ color: "#dc2626", fontSize: "14px", fontWeight: 700, margin: "0 0 8px" }}>
              ⚠️ {circular.length} Circular Dependenc{circular.length === 1 ? "y" : "ies"} Detected
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {circular.slice(0, 10).map((pair, i) => (
                <p key={i} style={{ margin: 0, fontSize: "12px", fontFamily: "monospace", color: "#7f1d1d" }}>
                  {pair[0]} ↔ {pair[1]}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Layer Color Legend */}
        {elements.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
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
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#475569" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, display: "inline-block" }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}


        {/* Cytoscape graph */}
        {elements.length > 0 && (
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>
              Dependency Graph ({elements.filter((e) => !e.data.source).length} nodes)
            </h3>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
              <CytoscapeGraph elements={elements} />
            </div>
          </div>
        )}
      </section>
    </Shell>
  );
}
