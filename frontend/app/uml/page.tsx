"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { Shell } from "@/components/Shell";
import { useRepo } from "@/lib/store";
import { fetchAnalysis } from "@/lib/api";

export default function UMLPage() {
  const { activeRepo } = useRepo();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mermaid, setMermaid] = useState("classDiagram\n  class RepoMind");
  const [classes, setClasses] = useState<{ name: string; file: string }[]>([]);
  const [relations, setRelations] = useState<{ from: string; to: string; type: string }[]>([]);
  const [error, setError] = useState("");

  async function generate() {
    if (!activeRepo) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAnalysis("uml", activeRepo.id);
      setMermaid(data.result.mermaid || "classDiagram\n  class RepoMind");
      setClasses(data.result.classes || []);
      setRelations(data.result.relations || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!activeRepo) {
    return (
      <Shell title="UML Diagrams" subtitle="Class and relationship diagrams from source code.">
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
    <Shell title="UML Diagrams" subtitle={`Class diagrams for: ${activeRepo.name}`}>
      <section className="panel p-6 space-y-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            Generates class diagrams and inheritance relationships from the parsed AST.
          </p>
          <button
            onClick={generate}
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
            {loading ? "Generating…" : "Generate UML"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", color: "#dc2626", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* Mermaid diagram */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", background: "#fff" }}>
          <MermaidDiagram chart={mermaid} />
        </div>

        {/* Stats row */}
        {classes.length > 0 && (
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "Classes", value: classes.length },
              { label: "Relations", value: relations.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  background: "linear-gradient(140deg, #f0f0ff, #f8f6ff)",
                  border: "1px solid #ddd6fe",
                  borderRadius: "12px",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "28px", fontWeight: 700, color: "#6366f1", margin: 0 }}>{value}</p>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Class table */}
        {classes.length > 0 && (
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>Detected Classes</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>Class Name</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>File</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.slice(0, 50).map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#6366f1", fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: "8px 12px", color: "#64748b", fontSize: "12px" }}>{c.file}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Relations table */}
        {relations.length > 0 && (
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>Inheritance Relations</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>From</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>Type</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>To</th>
                  </tr>
                </thead>
                <tbody>
                  {relations.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#0f172a" }}>{r.from}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}>
                          {r.type}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#0f172a" }}>{r.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </Shell>
  );
}
