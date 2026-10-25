"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { importRepository } from "@/lib/api";
import { useRepo } from "@/lib/store";

export default function RepositoryUploadPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [importedRepo, setImportedRepo] = useState<any | null>(null);
  const [message, setMessage] = useState("Enter a GitHub repository URL or local folder path to begin analysis.");
  const { setActiveRepo } = useRepo();
  const router = useRouter();

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setMessage("Cloning repository and initializing analysis pipeline…");
    try {
      const data = await importRepository({ url: url.trim() });
      setActiveRepo(data);
      setImportedRepo(data);
      setMessage(`Successfully imported #${data.id}: ${data.name} (${data.language} / ${data.framework}). Analysis pipeline has started!`);
    } catch (error) {
      setMessage(`Import failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title="Repository Upload" subtitle="Clone and index any GitHub repository for complete analysis.">
      <section className="panel p-4 sm:p-6 space-y-4">
        <form className="space-y-4" onSubmit={handleImport}>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
              GitHub Repository URL or Local Path
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition-all"
              placeholder="https://github.com/owner/repository"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              required
            />
            <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
              Supports public repositories (e.g. <code>https://github.com/pallets/flask</code>) or local directories.
            </p>
          </div>

          <button
            className={`w-full sm:w-auto rounded-xl px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all ${
              loading
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
            }`}
            type="submit"
            disabled={loading}
          >
            {loading ? "Cloning & Indexing…" : "Analyze Repository →"}
          </button>
        </form>
      </section>

      {/* Status & CTA Panel */}
      <section className="panel p-4 sm:p-6 space-y-3">
        <p className="text-xs sm:text-sm text-slate-700 m-0 leading-relaxed">{message}</p>

        {importedRepo && (
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <button
              onClick={() => router.push("/analysis-progress")}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer"
            >
              📊 View Real-Time Analysis Progress →
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </section>
    </Shell>
  );
}
