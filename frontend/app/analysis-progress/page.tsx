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
        <section className="panel p-6 sm:p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">
            No repository selected. Import one to see analysis progress.
          </p>
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

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const progress = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
  const hasRunning = stages.some((s) => s.status === "running");

  return (
    <Shell title="Analysis Progress" subtitle={`Pipeline stages for: ${activeRepo.name}`}>
      {/* Header action panel */}
      <section className="panel p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">End-to-End Analysis Pipeline</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Cloner → Language Detector → AST Parser → Embeddings → Knowledge Graph → Static Analysis → RAG Index
            </p>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering || hasRunning}
            className={`w-full sm:w-auto rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all ${
              triggering || hasRunning
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
            }`}
          >
            {hasRunning ? "⚙️ Pipeline Running…" : triggering ? "Starting…" : done ? "🔄 Re-run Full Pipeline" : "▶ Start Analysis Pipeline"}
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="font-semibold text-slate-800">Overall Progress</span>
            <span className="font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-[11px] sm:text-xs text-slate-500 pt-0.5">
            <span>{completedCount} of {stages.length} stages complete</span>
            <span>{embeddings.toLocaleString()} embeddings indexed</span>
          </div>
        </div>
      </section>

      {/* Stage list */}
      <section className="panel p-3.5 sm:p-6 space-y-2.5 sm:space-y-3">
        {loading && stages.length === 0 ? (
          <div className="text-center py-10 text-xs sm:text-sm text-slate-500">
            Loading pipeline status…
          </div>
        ) : stages.length === 0 ? (
          <div className="text-center py-10 text-xs sm:text-sm text-slate-500">
            Pipeline not yet started. Click <strong>Start Analysis Pipeline</strong> to begin.
          </div>
        ) : (
          stages.map((stage, idx) => {
            const style = STATUS_STYLES[stage.status] ?? STATUS_STYLES.pending;
            const isRunning = stage.status === "running";
            return (
              <div
                key={stage.stage_name}
                className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
                  isRunning
                    ? "border-amber-300 bg-amber-50/40 shadow-xs"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* Step number badge */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: style.bg,
                      border: `2px solid ${style.dot}`,
                      color: style.text,
                    }}
                  >
                    {stage.status === "completed" ? "✓" : stage.status === "failed" ? "✗" : idx + 1}
                  </div>
                  {idx < stages.length - 1 && (
                    <div className="h-4 w-0.5 bg-slate-200" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {stage.stage_name}
                      </span>
                      {isRunning && (
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </div>
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] sm:text-xs font-semibold shrink-0"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                  </div>

                  {stage.message && (
                    <p
                      className={`text-[11px] sm:text-xs leading-relaxed m-0 break-words ${
                        stage.status === "failed" ? "text-red-600" : "text-slate-600"
                      }`}
                    >
                      {stage.message}
                    </p>
                  )}

                  {stage.completed_at && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Completed: {new Date(stage.completed_at).toLocaleTimeString()}
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
        <section className="panel p-4 sm:p-6 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 border border-indigo-100">
          <h3 className="text-sm sm:text-base font-bold text-indigo-900 mb-1">🎉 Analysis Complete!</h3>
          <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
            All pipeline stages finished successfully. All repository files have been indexed. Explore results:
          </p>
          <div className="flex flex-wrap gap-2">
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
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:from-indigo-700 hover:to-purple-700 transition-all"
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
