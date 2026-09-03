"use client";

import { useState } from "react";
import { Shell } from "@/components/Shell";
import { importRepository, repositoryStatus } from "@/lib/api";
import { useRepo } from "@/lib/store";

export default function RepositoryUploadPage() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("No repository imported yet.");
  const { setActiveRepo } = useRepo();

  return (
    <Shell title="Repository Upload" subtitle="Clone and index any GitHub repository for analysis.">
      <section className="panel p-5">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const data = await importRepository({ url });
              setActiveRepo(data);
              setMessage(`Imported #${data.id}: ${data.name} (${data.language}/${data.framework}) — indexing started`);

              // Poll for indexing status
              const repoId = data.id;
              let attempts = 0;
              const interval = setInterval(async () => {
                attempts += 1;
                try {
                  const status = await repositoryStatus(repoId);
                  if (status.indexed) {
                    setMessage(`Imported #${data.id}: ${data.name} — indexing complete (${status.embeddings} embeddings)`);
                    clearInterval(interval);
                  } else {
                    setMessage(`Imported #${data.id}: ${data.name} — indexing in progress (${status.embeddings} embeddings)`);
                  }
                } catch (err) {
                  setMessage(`Imported #${data.id}: ${data.name} — indexing (status error)`);
                  clearInterval(interval);
                }
                if (attempts > 30) {
                  clearInterval(interval);
                  setMessage(`Imported #${data.id}: ${data.name} — indexing taking longer than expected`);
                }
              }, 2000);
            } catch (error) {
              setMessage(`Import failed: ${(error as Error).message}`);
            }
          }}
        >
          <label className="block text-sm font-semibold">GitHub Repository URL</label>
          <input
            className="w-full rounded-xl border p-3"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="rounded-xl bg-blue-800 px-5 py-2 font-medium text-white" type="submit">
            Analyze Repository
          </button>
        </form>
      </section>
      <section className="panel p-5 text-sm text-slate-700">{message}</section>
    </Shell>
  );
}
