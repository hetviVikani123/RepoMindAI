"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (activeRepo) {
      generate();
    }
  }, [activeRepo?.id]);

  if (!activeRepo) {
    return (
      <Shell title="UML Diagrams" subtitle="Class and relationship diagrams from source code.">
        <section className="panel p-6 sm:p-10 text-center">
          <div className="text-4xl mb-3">📐</div>
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
    <Shell title="UML Diagrams" subtitle={`Class diagrams for: ${activeRepo.name}`}>
      <section className="panel p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="m-0 text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            Generates class diagrams and inheritance relationships from the parsed AST.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className={`w-full sm:w-auto rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all whitespace-nowrap ${
              loading
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
            }`}
          >
            {loading ? "Generating…" : "Generate UML"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Mermaid diagram */}
        <div className="space-y-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900">Mermaid Class Diagram</h3>
          <MermaidDiagram chart={mermaid} />
        </div>

        {/* Stats row */}
        {classes.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Detected Classes", value: classes.length },
              { label: "Inheritance Relations", value: relations.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-4 text-center shadow-2xs"
              >
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{value}</p>
                <p className="mt-1 text-xs text-slate-600 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Class table */}
        {classes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Detected Classes ({classes.length})
            </h3>
            <div className="overflow-x-auto w-full rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[440px] border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3.5 text-left font-semibold text-slate-600">Class Name</th>
                    <th className="py-2.5 px-3.5 text-left font-semibold text-slate-600">File</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.slice(0, 50).map((c, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-none">
                      <td className="py-2 px-3.5 font-mono text-indigo-600 font-semibold break-all">
                        {c.name}
                      </td>
                      <td className="py-2 px-3.5 text-slate-500 font-mono text-xs break-all">
                        {c.file}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Relations table */}
        {relations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Inheritance Relations</h3>
            <div className="overflow-x-auto w-full rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[440px] border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3.5 text-left font-semibold text-slate-600">From</th>
                    <th className="py-2.5 px-3.5 text-left font-semibold text-slate-600">Type</th>
                    <th className="py-2.5 px-3.5 text-left font-semibold text-slate-600">To</th>
                  </tr>
                </thead>
                <tbody>
                  {relations.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-none">
                      <td className="py-2 px-3.5 font-mono text-slate-900 font-semibold">{r.from}</td>
                      <td className="py-2 px-3.5">
                        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                          {r.type}
                        </span>
                      </td>
                      <td className="py-2 px-3.5 font-mono text-slate-900">{r.to}</td>
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
