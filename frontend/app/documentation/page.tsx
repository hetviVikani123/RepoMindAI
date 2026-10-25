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
        <section className="panel p-6 sm:p-10 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">No repository selected. Import one first.</p>
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
    <Shell title="Documentation" subtitle={`Generated docs for: ${activeRepo.name}`}>
      <section className="panel p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="m-0 text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            Generate README, architecture notes, module summaries, and API summaries from the imported repository.
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
            {loading ? "Generating…" : "Generate Documentation"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-600">
            {error}
          </div>
        )}
      </section>

      {doc && (
        <>
          <section className="panel p-4 sm:p-6 space-y-3">
            <h3 className="m-0 text-sm sm:text-base font-bold text-slate-900">README.md</h3>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-950 text-slate-200 p-3.5 sm:p-5 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed max-w-full">
              {doc.readme}
            </pre>
          </section>

          <section className="panel p-4 sm:p-6 space-y-3">
            <h3 className="m-0 text-sm sm:text-base font-bold text-slate-900">Architecture Documentation</h3>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-950 text-slate-200 p-3.5 sm:p-5 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed max-w-full">
              {doc.architecture_doc}
            </pre>
          </section>

          <section className="panel p-4 sm:p-6 space-y-3">
            <h3 className="m-0 text-sm sm:text-base font-bold text-slate-900">API Summary</h3>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-950 text-slate-200 p-3.5 sm:p-5 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed max-w-full">
              {doc.api_summary}
            </pre>
          </section>

          {Object.keys(doc.module_docs).length > 0 && (
            <section className="panel p-4 sm:p-6 space-y-3">
              <h3 className="m-0 text-sm sm:text-base font-bold text-slate-900">Module Documentation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(doc.module_docs).map(([moduleName, content]) => (
                  <article
                    key={moduleName}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-2"
                  >
                    <h4 className="m-0 text-xs sm:text-sm font-bold text-indigo-600 truncate">
                      {moduleName}
                    </h4>
                    <pre className="whitespace-pre-wrap break-words m-0 font-mono text-[11px] sm:text-xs leading-relaxed text-slate-700 overflow-x-auto">
                      {content}
                    </pre>
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
