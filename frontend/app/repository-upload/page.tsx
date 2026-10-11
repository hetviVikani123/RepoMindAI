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
      <section className="panel p-6 space-y-4">
        <form className="space-y-4" onSubmit={handleImport}>
          <div>
            <label className="block text-sm font-semibold mb-2">GitHub Repository URL or Local Path</label>
            <input
              className="w-full rounded-xl border p-3 bg-white"
              placeholder="https://github.com/owner/repository"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Supports public repositories (e.g. <code>https://github.com/pallets/flask</code>) or local directories.
            </p>
          </div>

          <button
            className="rounded-xl px-6 py-3 font-semibold text-white transition-all"
            style={{
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            type="submit"
            disabled={loading}
          >
            {loading ? "Cloning & Indexing…" : "Analyze Repository →"}
          </button>
        </form>
      </section>

      {/* Status & CTA Panel */}
      <section className="panel p-6 space-y-3">
        <p className="text-sm text-slate-700 m-0">{message}</p>

        {importedRepo && (
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => router.push("/analysis-progress")}
              className="rounded-xl px-5 py-2.5 font-semibold text-white text-sm"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", cursor: "pointer" }}
            >
              📊 View Real-Time Analysis Progress →
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-sm bg-white"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </section>
    </Shell>
  );
}
