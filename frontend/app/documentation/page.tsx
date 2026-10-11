"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useRepo } from "@/lib/store";
import { fetchDocumentation } from "@/lib/api";

export default function DocumentationPage() {
  const { activeRepo } = useRepo();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState<{
    readme: string;
    architecture_doc: string;
    module_docs: Record<string, string>;
    api_summary: string;
  } | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    if (!activeRepo) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchDocumentation(activeRepo.id);
      setDoc(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeRepo) {
      generate();
    }
  }, [activeRepo?.id]);

  if (!activeRepo) {
    return (
      <Shell title="Documentation" subtitle="Auto-generated README, architecture, and module docs.">
        <section className="panel p-8 text-center">
          <p style={{ color: "#64748b", marginBottom: "16px" }}>No repository selected. Import one first.</p>
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
    <Shell title="Documentation" subtitle={`Generated docs for: ${activeRepo.name}`}>
      <section className="panel p-6 space-y-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            Generate README, architecture notes, module summaries, and API summaries from the imported repository.
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
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Generating…" : "Generate Documentation"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", color: "#dc2626", fontSize: "13px" }}>
            {error}
          </div>
        )}
      </section>

      {doc && (
        <>
          <section className="panel p-6 space-y-3">
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>README</h3>
            <pre style={{ whiteSpace: "pre-wrap", background: "#0f172a", color: "#e2e8f0", padding: "16px", borderRadius: "12px", overflowX: "auto" }}>{doc.readme}</pre>
          </section>

          <section className="panel p-6 space-y-3">
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Architecture Documentation</h3>
            <pre style={{ whiteSpace: "pre-wrap", background: "#0f172a", color: "#e2e8f0", padding: "16px", borderRadius: "12px", overflowX: "auto" }}>{doc.architecture_doc}</pre>
          </section>

          <section className="panel p-6 space-y-3">
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>API Summary</h3>
            <pre style={{ whiteSpace: "pre-wrap", background: "#0f172a", color: "#e2e8f0", padding: "16px", borderRadius: "12px", overflowX: "auto" }}>{doc.api_summary}</pre>
          </section>

          {Object.keys(doc.module_docs).length > 0 && (
            <section className="panel p-6 space-y-4">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Module Docs</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(doc.module_docs).map(([moduleName, content]) => (
                  <article key={moduleName} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", background: "#fff" }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 700 }}>{moduleName}</h4>
                    <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "12px", lineHeight: 1.6 }}>{content}</pre>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Shell>
  );
}
