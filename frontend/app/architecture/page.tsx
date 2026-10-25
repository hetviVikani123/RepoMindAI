"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (activeRepo) {
      generate();
    }
  }, [activeRepo?.id]);

  if (!activeRepo) {
    return (
      <Shell title="Architecture" subtitle="High-level architecture generated from repository structure.">
        <section className="panel p-6 sm:p-10 text-center">
          <div className="text-4xl mb-3">🏗️</div>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">
            No repository selected. Import one first.
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

  return (
    <Shell
      title="Architecture"
      subtitle={`High-level architecture for: ${activeRepo.name}`}
    >
      <section className="panel p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="m-0 text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            Analyzes the folder structure and file naming conventions to identify architectural layers.
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
            {loading ? "Generating…" : "Generate Architecture"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-600">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Mermaid diagram */}
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Architecture Diagram</h3>
              <MermaidDiagram chart={data.mermaid} />
            </div>

            {/* Layers */}
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Detected Layers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(data.layers)
                  .filter(([, files]) => files.length > 0)
                  .map(([layer, files]) => (
                    <div
                      key={layer}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 shadow-2xs"
                    >
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
                        {layer}
                      </p>
                      <div className="space-y-1">
                        {files.map((f) => (
                          <p key={f} className="text-xs text-slate-700 m-0 truncate" title={f}>
                            📄 {f}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Folder structure */}
            {data.folder_structure.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Folder Structure ({data.folder_structure.length} directories)
                </h3>
                <div className="rounded-xl bg-slate-950 p-3.5 sm:p-4 max-h-[300px] overflow-y-auto overflow-x-auto font-mono text-xs text-slate-400">
                  {data.folder_structure.map((folder) => {
                    const depth = folder.split("/").length - 1;
                    return (
                      <div key={folder} style={{ paddingLeft: `${depth * 14}px` }} className="leading-relaxed whitespace-nowrap">
                        <span className="text-indigo-400">📁</span>{" "}
                        <span className="text-slate-200">{folder.split("/").pop()}</span>
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
