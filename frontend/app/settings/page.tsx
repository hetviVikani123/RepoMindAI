"use client";

import { useState } from "react";
import { Shell } from "@/components/Shell";

const freeApiPlatforms = [
  {
    name: "Google AI Studio",
    apis: ["Gemini API"],
    note: "Best free general-purpose LLM API for this app. Free tier available with rate limits.",
  },
  {
    name: "Qdrant Cloud",
    apis: ["Vector DB"],
    note: "Free tier for vector search and embeddings storage.",
  },
  {
    name: "Neo4j AuraDB Free",
    apis: ["Graph DB"],
    note: "Free graph database tier for small knowledge graphs.",
  },
  {
    name: "Hugging Face",
    apis: ["Embeddings", "Inference"],
    note: "Has free hosted inference options and community-hosted models.",
  },
  {
    name: "Groq",
    apis: ["LLM inference"],
    note: "Often offers free developer access/credits for fast open models, depending on current program availability.",
  },
  {
    name: "OpenRouter",
    apis: ["Multi-model gateway"],
    note: "Can sometimes route to free/community models; availability changes frequently.",
  },
  {
    name: "GitHub",
    apis: ["Repository import"],
    note: "GitHub personal access token is free to create and use for repo access within limits.",
  },
  {
    name: "Google Cloud / Gemini",
    apis: ["Gemini API"],
    note: "Google AI Studio is the simplest free path for Gemini; Cloud billing is separate.",
  },
];

export default function SettingsPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");
  const [llmProvider, setLlmProvider] = useState("OpenAI");

  return (
    <Shell title="Settings" subtitle="Configure platform integrations, model provider, and runtime defaults.">
      <section className="panel space-y-4 p-5">
        <label className="block text-sm font-semibold">Backend API Base URL</label>
        <input className="w-full rounded-xl border p-3" value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} />

        <label className="block text-sm font-semibold">LLM Provider</label>
        <select className="w-full rounded-xl border p-3" value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)}>
          <option>OpenAI</option>
          <option>Gemini</option>
          <option>Claude</option>
        </select>

        <button className="rounded-xl bg-blue-800 px-5 py-2 text-white" type="button">
          Save Settings
        </button>
      </section>

      <section className="panel space-y-4 p-5">
        <div>
          <h2 className="text-xl">Free API Platforms</h2>
          <p className="text-sm text-slate-600">
            These are the practical free or free-tier options you can use for the APIs in this app. Availability and limits change often, so verify the current plan before building on it.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {freeApiPlatforms.map((platform) => (
            <article key={platform.name} className="rounded-xl border bg-white p-4">
              <h3 className="text-lg">{platform.name}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{platform.apis.join(" • ")}</p>
              <p className="mt-2 text-sm text-slate-700">{platform.note}</p>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}
