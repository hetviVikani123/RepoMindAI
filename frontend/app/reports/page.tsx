"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useRepo } from "@/lib/store";
import { fetchAnalysis } from "@/lib/api";

type DebtResult = {
  debt_score: number;
  maintainability: number;
  grade: string;
  evidence: {
    long_files: string[];
    duplicate_line_candidates: number;
    total_lines: number;
    complex_functions: { file: string; deep_indent_lines: number }[];
  };
};

type SecurityResult = {
  severity: string;
  findings_count: number;
  findings: { file: string; type: string; pattern: string; line: number; snippet: string }[];
};

type ActiveTab = "debt" | "security" | "report";

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "#dcfce7", text: "#166534" },
  B: { bg: "#d1fae5", text: "#065f46" },
  C: { bg: "#fef9c3", text: "#713f12" },
  D: { bg: "#ffedd5", text: "#7c2d12" },
  F: { bg: "#fee2e2", text: "#7f1d1d" },
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#fee2e2", text: "#7f1d1d" },
  high:     { bg: "#ffedd5", text: "#7c2d12" },
  medium:   { bg: "#fef9c3", text: "#713f12" },
  low:      { bg: "#dcfce7", text: "#166534" },
};

export default function ReportsPage() {
  const { activeRepo } = useRepo();
  const router = useRouter();
  const [tab, setTab] = useState<ActiveTab>("debt");
  const [loadingDebt, setLoadingDebt] = useState(false);
  const [loadingSec, setLoadingSec] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [debt, setDebt] = useState<DebtResult | null>(null);
  const [security, setSecurity] = useState<SecurityResult | null>(null);
  const [latestReport, setLatestReport] = useState<string>("");
  const [error, setError] = useState("");

  async function loadDebt() {
    if (!activeRepo) return;
    setLoadingDebt(true); setError("");
    try {
      const d = await fetchAnalysis("technical-debt", activeRepo.id);
      setDebt(d.result);
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingDebt(false); }
  }

  async function loadSecurity() {
    if (!activeRepo) return;
    setLoadingSec(true); setError("");
    try {
      const d = await fetchAnalysis("security", activeRepo.id);
      setSecurity(d.result);
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingSec(false); }
  }

  async function loadReport() {
    if (!activeRepo) return;
    setLoadingReport(true); setError("");
    try {
      const d = await fetchAnalysis("report", activeRepo.id);
      setLatestReport(JSON.stringify(d, null, 2));
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingReport(false); }
  }

  useEffect(() => {
    if (!activeRepo) return;
    if (tab === "debt" && !debt) {
      loadDebt();
    } else if (tab === "security" && !security) {
      loadSecurity();
    } else if (tab === "report" && !latestReport) {
      loadReport();
    }
  }, [activeRepo?.id, tab]);

  if (!activeRepo) {
    return (
      <Shell title="Reports" subtitle="Technical debt, security findings, and analysis snapshots.">
        <section className="panel p-6 sm:p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
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
    <Shell title="Reports" subtitle={`Analysis reports for: ${activeRepo.name}`}>
      {/* Tabs */}
      <section className="panel p-1.5 sm:p-2 flex overflow-x-auto no-scrollbar gap-1 bg-white">
        {([
          { id: "debt" as const, label: "🔧 Technical Debt" },
          { id: "security" as const, label: "🔒 Security" },
          { id: "report" as const, label: "📋 Latest Report" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              tab === id
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </section>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Technical Debt Tab */}
      {tab === "debt" && (
        <section className="panel p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Technical Debt Analysis</h2>
            <button
              onClick={loadDebt}
              disabled={loadingDebt}
              className={`w-full sm:w-auto rounded-xl px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all ${
                loadingDebt
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
              }`}
            >
              {loadingDebt ? "Analyzing…" : "Run Analysis"}
            </button>
          </div>

          {debt && (
            <>
              {/* Score cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 text-center shadow-2xs">
                  <p
                    className="text-2xl sm:text-3xl font-bold truncate"
                    style={{ color: debt.debt_score > 60 ? "#dc2626" : debt.debt_score > 30 ? "#d97706" : "#16a34a" }}
                  >
                    {debt.debt_score}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Debt Score
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 text-center shadow-2xs">
                  <p className="text-2xl sm:text-3xl font-bold text-indigo-600 truncate">
                    {debt.maintainability}%
                  </p>
                  <p className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Maintainability
                  </p>
                </div>

                {debt.grade && (
                  <div
                    className="rounded-xl border border-slate-200 p-3.5 sm:p-4 text-center shadow-2xs"
                    style={{ background: GRADE_COLORS[debt.grade]?.bg ?? "#fff" }}
                  >
                    <p
                      className="text-2xl sm:text-3xl font-bold"
                      style={{ color: GRADE_COLORS[debt.grade]?.text ?? "#0f172a" }}
                    >
                      {debt.grade}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Grade
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 text-center shadow-2xs">
                  <p className="text-2xl sm:text-3xl font-bold text-slate-800 truncate">
                    {debt.evidence.total_lines.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Lines
                  </p>
                </div>
              </div>

              {/* Evidence */}
              {debt.evidence.long_files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Large Files (&gt;400 lines)
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {debt.evidence.long_files.map((f) => (
                      <div
                        key={f}
                        className="rounded-lg border border-orange-200 bg-orange-50/70 p-2.5 font-mono text-[11px] sm:text-xs text-orange-950 break-all"
                      >
                        ⚠️ {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debt.evidence.duplicate_line_candidates > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 sm:p-4">
                  <p className="m-0 text-xs sm:text-sm text-amber-900 leading-relaxed">
                    <strong>{debt.evidence.duplicate_line_candidates}</strong> potential duplicate lines detected across repository.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <section className="panel p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Security Analysis</h2>
            <button
              onClick={loadSecurity}
              disabled={loadingSec}
              className={`w-full sm:w-auto rounded-xl px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all ${
                loadingSec
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
              }`}
            >
              {loadingSec ? "Scanning…" : "Run Security Scan"}
            </button>
          </div>

          {security && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className="rounded-xl border p-4 text-center shadow-2xs"
                  style={{
                    background: SEVERITY_COLORS[security.severity]?.bg ?? "#f1f5f9",
                    borderColor: "#e2e8f0",
                  }}
                >
                  <p
                    className="text-2xl sm:text-3xl font-bold uppercase truncate"
                    style={{ color: SEVERITY_COLORS[security.severity]?.text ?? "#374151" }}
                  >
                    {security.severity}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 font-medium">Overall Severity</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-2xs">
                  <p
                    className="text-2xl sm:text-3xl font-bold truncate"
                    style={{ color: security.findings_count > 0 ? "#dc2626" : "#16a34a" }}
                  >
                    {security.findings_count}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 font-medium">Findings</p>
                </div>
              </div>

              {security.findings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Findings Details</h3>
                  <div className="flex flex-col gap-2">
                    {security.findings.map((f, i) => (
                      <div key={i} className="rounded-xl border border-red-200 bg-white p-3 sm:p-4 shadow-2xs space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 uppercase">
                            {f.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-slate-500 font-mono break-all">
                            {f.file}:{f.line}
                          </span>
                        </div>
                        <p className="m-0 rounded-lg bg-slate-50 border border-slate-200/60 p-2 font-mono text-[11px] sm:text-xs text-slate-800 overflow-x-auto break-all">
                          {f.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {security.findings_count === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-center">
                  <p className="m-0 text-sm font-semibold text-emerald-800">
                    ✅ No security vulnerabilities detected in repository!
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Latest Report Tab */}
      {tab === "report" && (
        <section className="panel p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Latest Analysis Report</h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={loadReport}
                disabled={loadingReport}
                className={`flex-1 sm:flex-initial rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all ${
                  loadingReport
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
                }`}
              >
                {loadingReport ? "Loading…" : "Load Report"}
              </button>
              {latestReport && (
                <button
                  onClick={() => window.print()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                >
                  🖨️ Print
                </button>
              )}
            </div>
          </div>
          {latestReport && (
            <pre className="rounded-xl bg-slate-950 p-3.5 sm:p-5 font-mono text-xs text-cyan-200 overflow-x-auto max-w-full max-h-[500px] overflow-y-auto leading-relaxed">
              {latestReport}
            </pre>
          )}
        </section>
      )}
    </Shell>
  );
}
