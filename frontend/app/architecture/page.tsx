"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useRepo } from "@/lib/store";
import { fetchAnalysis } from "@/lib/api";
import { MermaidDiagram } from "@/components/MermaidDiagram";

export default function ArchitecturePage() {
  const { activeRepo } = useRepo();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    mermaid: string;
    folder_structure: string[];
    layers: Record<string, string[]>;
  } | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    if (!activeRepo) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchAnalysis("architecture", activeRepo.id);
      setData(res.result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!activeRepo) {
    return (
      <Shell title="Architecture" subtitle="High-level architecture generated from repository structure.">
        <section className="panel p-8 text-center">
          <p style={{ color: "#64748b", marginBottom: "16px" }}>
            No repository selected. Import one first.
          </p>
          <button
            onClick={() => router.push("/repository-upload")}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Import Repository →
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell
      title="Architecture"
      subtitle={`High-level architecture for: ${activeRepo.name}`}
    >
      <section className="panel p-6 space-y-4">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
              Analyzes the folder structure and file naming conventions to identify architectural layers.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              marginLeft: "auto",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Generating…" : "Generate Architecture"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", color: "#dc2626", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Mermaid diagram */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Architecture Diagram</h3>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", background: "#fff" }}>
                <MermaidDiagram chart={data.mermaid} />
              </div>
            </div>

            {/* Layers */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Detected Layers</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
                {Object.entries(data.layers)
                  .filter(([, files]) => files.length > 0)
                  .map(([layer, files]) => (
                    <div
                      key={layer}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#f8fafc",
                      }}
                    >
                      <p style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6366f1", margin: "0 0 8px" }}>
                        {layer}
                      </p>
                      {files.map((f) => (
                        <p key={f} style={{ fontSize: "11px", color: "#374151", margin: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          📄 {f}
                        </p>
                      ))}
                    </div>
                  ))}
              </div>
            </div>

            {/* Folder structure */}
            {data.folder_structure.length > 0 && (
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>
                  Folder Structure ({data.folder_structure.length} directories)
                </h3>
                <div
                  style={{
                    background: "#0f172a",
                    borderRadius: "12px",
                    padding: "16px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#94a3b8",
                  }}
                >
                  {data.folder_structure.map((folder) => {
                    const depth = folder.split("/").length - 1;
                    return (
                      <div key={folder} style={{ paddingLeft: `${depth * 14}px`, lineHeight: "1.8" }}>
                        <span style={{ color: "#6366f1" }}>📁</span>{" "}
                        <span style={{ color: "#e2e8f0" }}>{folder.split("/").pop()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </Shell>
  );
}
