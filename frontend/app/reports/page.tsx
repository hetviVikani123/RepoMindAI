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
    <Shell title="Reports" subtitle={`Analysis reports for: ${activeRepo.name}`}>
      {/* Tabs */}
      <section className="panel p-2" style={{ display: "flex", gap: "4px" }}>
        {([
          { id: "debt" as const, label: "🔧 Technical Debt" },
          { id: "security" as const, label: "🔒 Security" },
          { id: "report" as const, label: "📋 Latest Report" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              background: tab === id ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: tab === id ? "#fff" : "#64748b",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </section>

      {error && (
        <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", color: "#dc2626", fontSize: "13px" }} className="panel">
          {error}
        </div>
      )}

      {/* Technical Debt Tab */}
      {tab === "debt" && (
        <section className="panel p-6 space-y-4">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Technical Debt Analysis</h2>
            <button
              onClick={loadDebt}
              disabled={loadingDebt}
              style={{ background: loadingDebt ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 600, cursor: loadingDebt ? "not-allowed" : "pointer" }}
            >
              {loadingDebt ? "Analyzing…" : "Run Analysis"}
            </button>
          </div>

          {debt && (
            <>
              {/* Score cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
                <div style={{ padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center", background: "#fff" }}>
                  <p style={{ fontSize: "36px", fontWeight: 700, color: debt.debt_score > 60 ? "#dc2626" : debt.debt_score > 30 ? "#d97706" : "#16a34a", margin: 0 }}>{debt.debt_score}</p>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", textTransform: "uppercase" }}>Debt Score</p>
                </div>
                <div style={{ padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center", background: "#fff" }}>
                  <p style={{ fontSize: "36px", fontWeight: 700, color: "#6366f1", margin: 0 }}>{debt.maintainability}%</p>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", textTransform: "uppercase" }}>Maintainability</p>
                </div>
                {debt.grade && (
                  <div style={{ padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center", background: GRADE_COLORS[debt.grade]?.bg ?? "#fff" }}>
                    <p style={{ fontSize: "48px", fontWeight: 700, color: GRADE_COLORS[debt.grade]?.text ?? "#0f172a", margin: 0 }}>{debt.grade}</p>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", textTransform: "uppercase" }}>Grade</p>
                  </div>
                )}
                <div style={{ padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center", background: "#fff" }}>
                  <p style={{ fontSize: "28px", fontWeight: 700, color: "#374151", margin: 0 }}>{debt.evidence.total_lines.toLocaleString()}</p>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", textTransform: "uppercase" }}>Total Lines</p>
                </div>
              </div>

              {/* Evidence */}
              {debt.evidence.long_files.length > 0 && (
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px" }}>Large Files (&gt;400 lines)</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {debt.evidence.long_files.map((f) => (
                      <div key={f} style={{ padding: "8px 12px", borderRadius: "8px", background: "#fff7ed", border: "1px solid #fed7aa", fontSize: "12px", fontFamily: "monospace", color: "#9a3412" }}>
                        ⚠️ {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debt.evidence.duplicate_line_candidates > 0 && (
                <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#fef9c3", border: "1px solid #fde047" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#713f12" }}>
                    <strong>{debt.evidence.duplicate_line_candidates}</strong> potential duplicate lines detected
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <section className="panel p-6 space-y-4">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Security Analysis</h2>
            <button
              onClick={loadSecurity}
              disabled={loadingSec}
              style={{ background: loadingSec ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 600, cursor: loadingSec ? "not-allowed" : "pointer" }}
            >
              {loadingSec ? "Scanning…" : "Run Security Scan"}
            </button>
          </div>

          {security && (
            <>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  background: SEVERITY_COLORS[security.severity]?.bg ?? "#f1f5f9",
                  border: `1px solid`,
                  flex: 1,
                  textAlign: "center",
                }}>
                  <p style={{ fontSize: "28px", fontWeight: 700, color: SEVERITY_COLORS[security.severity]?.text ?? "#374151", margin: 0, textTransform: "uppercase" }}>{security.severity}</p>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>Overall Severity</p>
                </div>
                <div style={{ padding: "16px 20px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0", flex: 1, textAlign: "center" }}>
                  <p style={{ fontSize: "28px", fontWeight: 700, color: security.findings_count > 0 ? "#dc2626" : "#16a34a", margin: 0 }}>{security.findings_count}</p>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>Findings</p>
                </div>
              </div>

              {security.findings.length > 0 && (
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px" }}>Findings</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {security.findings.map((f, i) => (
                      <div key={i} style={{ padding: "12px 14px", borderRadius: "10px", border: "1px solid #fee2e2", background: "#fff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ background: "#fee2e2", color: "#7f1d1d", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>
                            {f.type.replace(/_/g, " ")}
                          </span>
                          <span style={{ color: "#64748b", fontSize: "12px" }}>{f.file}:{f.line}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", fontFamily: "monospace", color: "#374151", background: "#f8fafc", padding: "6px 8px", borderRadius: "6px" }}>
                          {f.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {security.findings_count === 0 && (
                <div style={{ padding: "20px", borderRadius: "12px", background: "#dcfce7", border: "1px solid #86efac", textAlign: "center" }}>
                  <p style={{ color: "#166534", fontWeight: 600, margin: 0 }}>✅ No security issues detected!</p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Latest Report Tab */}
      {tab === "report" && (
        <section className="panel p-6 space-y-4">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Latest Analysis Report</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={loadReport}
                disabled={loadingReport}
                style={{ background: loadingReport ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 600, cursor: loadingReport ? "not-allowed" : "pointer" }}
              >
                {loadingReport ? "Loading…" : "Load Report"}
              </button>
              {latestReport && (
                <button
                  onClick={() => window.print()}
                  style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: "10px", padding: "10px 18px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}
                >
                  🖨️ Print
                </button>
              )}
            </div>
          </div>
          {latestReport && (
            <pre style={{ background: "#0f172a", borderRadius: "12px", padding: "20px", color: "#a5f3fc", fontSize: "12px", overflowX: "auto", maxHeight: "500px", overflowY: "auto" }}>
              {latestReport}
            </pre>
          )}
        </section>
      )}
    </Shell>
  );
}
