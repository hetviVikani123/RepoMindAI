"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useRepo } from "@/lib/store";
import { fetchPipelineStatus, repositoryStatus, triggerPipeline } from "@/lib/api";

type Stage = {
  stage_name: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
  started_at: string | null;
  completed_at: string | null;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:   { bg: "#f1f5f9", text: "#64748b", dot: "#cbd5e1", label: "Pending" },
  running:   { bg: "#fef9c3", text: "#92400e", dot: "#f59e0b", label: "Running" },
  completed: { bg: "#dcfce7", text: "#166534", dot: "#22c55e", label: "Completed" },
  failed:    { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", label: "Failed" },
};

export default function AnalysisProgressPage() {
  const { activeRepo } = useRepo();
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [embeddings, setEmbeddings] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [done, setDone] = useState(false);

  const pollStatus = useCallback(async () => {
    if (!activeRepo) return;
    try {
      const pipelineData = await fetchPipelineStatus(activeRepo.id).catch(() => null);
      if (pipelineData?.stages) {
        setStages(pipelineData.stages);
        const allFinished = pipelineData.stages.length > 0 && pipelineData.stages.every(
          (s: Stage) => s.status === "completed" || s.status === "failed"
        );
        if (allFinished) {
          setDone(true);
        }
      }

      const statusData = await repositoryStatus(activeRepo.id).catch(() => null);
      if (statusData) {
        setEmbeddings(statusData.embeddings);
      }
    } catch (_) {}
    setLoading(false);
  }, [activeRepo]);

  useEffect(() => {
    if (!activeRepo) {
      setLoading(false);
      return;
    }

    pollStatus();
    const interval = setInterval(pollStatus, 1500);
    return () => clearInterval(interval);
  }, [activeRepo, pollStatus]);

  async function handleTrigger() {
    if (!activeRepo || triggering) return;
    setTriggering(true);
    setDone(false);
    try {
      await triggerPipeline(activeRepo.id);
      await pollStatus();
    } catch (e) {
      alert(`Failed to trigger analysis: ${(e as Error).message}`);
    } finally {
      setTriggering(false);
    }
  }

  if (!activeRepo) {
    return (
      <Shell title="Analysis Progress" subtitle="Track end-to-end AI pipeline stages.">
        <section className="panel p-8 text-center">
          <p style={{ color: "#64748b", marginBottom: "16px" }}>
            No repository selected. Import one to see analysis progress.
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

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const progress = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
  const hasRunning = stages.some((s) => s.status === "running");

  return (
    <Shell title="Analysis Progress" subtitle={`Pipeline stages for: ${activeRepo.name}`}>
      {/* Header action panel */}
      <section className="panel p-6">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>End-to-End Analysis Pipeline</h2>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
              Cloner → Language Detector → AST Parser → Embeddings → Knowledge Graph → Static Analysis → RAG Index
            </p>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering || hasRunning}
            style={{
              background: triggering || hasRunning ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: triggering || hasRunning ? "not-allowed" : "pointer",
            }}
          >
            {hasRunning ? "⚙️ Pipeline Running…" : triggering ? "Starting…" : done ? "🔄 Re-run Full Pipeline" : "▶ Start Analysis Pipeline"}
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>Overall Progress</span>
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#6366f1" }}>{progress}%</span>
        </div>
        <div style={{ background: "#e2e8f0", borderRadius: "100px", height: "10px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              borderRadius: "100px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
          <span style={{ color: "#64748b", fontSize: "12px" }}>
            {completedCount} / {stages.length} stages complete
          </span>
          <span style={{ color: "#64748b", fontSize: "12px" }}>
            {embeddings} embeddings indexed
          </span>
        </div>
      </section>

      {/* Stage list */}
      <section className="panel p-6 space-y-3">
        {loading && stages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            Loading pipeline status…
          </div>
        ) : stages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            Pipeline not yet started. Click <strong>Start Analysis Pipeline</strong> to begin.
          </div>
        ) : (
          stages.map((stage, idx) => {
            const style = STATUS_STYLES[stage.status] ?? STATUS_STYLES.pending;
            return (
              <div
                key={stage.stage_name}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: `1px solid ${stage.status === "running" ? "#f59e0b" : "#e2e8f0"}`,
                  background: stage.status === "running" ? "#fffbeb" : "#fff",
                  boxShadow: stage.status === "running" ? "0 4px 12px rgba(245,158,11,0.12)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Step number + dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", minWidth: "28px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: style.bg,
                      border: `2px solid ${style.dot}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: style.text,
                    }}
                  >
                    {stage.status === "completed" ? "✓" : stage.status === "failed" ? "✗" : idx + 1}
                  </div>
                  {idx < stages.length - 1 && (
                    <div style={{ width: "2px", height: "16px", background: "#e2e8f0" }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>{stage.stage_name}</span>
                    {stage.status === "running" && (
                      <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", animation: "pulse 1s infinite" }} />
                    )}
                    <span
                      style={{
                        background: style.bg,
                        color: style.text,
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        marginLeft: "auto",
                      }}
                    >
                      {style.label}
                    </span>
                  </div>
                  {stage.message && (
                    <p style={{ color: stage.status === "failed" ? "#dc2626" : "#64748b", fontSize: "12px", margin: 0 }}>
                      {stage.message}
                    </p>
                  )}
                  {stage.completed_at && (
                    <p style={{ color: "#94a3b8", fontSize: "11px", margin: "2px 0 0" }}>
                      Completed at: {new Date(stage.completed_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Done CTA */}
      {(done || progress === 100) && (
        <section className="panel p-6" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))", border: "1px solid rgba(99,102,241,0.2)" }}>
          <h3 style={{ margin: "0 0 8px", color: "#6366f1" }}>🎉 Analysis Complete!</h3>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 16px" }}>
            All pipeline stages finished successfully. All repository files have been indexed. Explore results:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              { href: "/architecture", label: "Architecture" },
              { href: "/uml", label: "UML Diagrams" },
              { href: "/dependency-graph", label: "Dependencies" },
              { href: "/ai-chat", label: "AI Chat" },
              { href: "/reports", label: "Reports" },
              { href: "/documentation", label: "Documentation" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
