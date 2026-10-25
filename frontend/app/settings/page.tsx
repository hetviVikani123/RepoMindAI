"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { fetchSettings, testSettings, updateSettings } from "@/lib/api";

const freeApiPlatforms = [
  {
    name: "Google AI Studio (Gemini)",
    apis: ["Gemini 1.5 Flash", "Gemini 2.0 Flash"],
    note: "Recommended free provider! Free tier offers 15 RPM with no credit card required at aistudio.google.com.",
    badge: "Recommended",
  },
  {
    name: "Groq Cloud",
    apis: ["Llama 3.3 70B", "Mixtral 8x7B"],
    note: "Ultra-fast LLM inference with a generous free developer tier at console.groq.com.",
    badge: "Fast & Free",
  },
  {
    name: "OpenAI",
    apis: ["GPT-4o mini", "text-embedding-3-small"],
    note: "Standard commercial provider for chat completions and vector embeddings.",
    badge: "Standard",
  },
  {
    name: "Ollama (Local LLM)",
    apis: ["Llama 3.2", "Mistral", "Qwen"],
    note: "Run models locally on your machine with 0 API costs. Runs via localhost:11434.",
    badge: "100% Offline",
  },
];

export default function SettingsPage() {
  const [provider, setProvider] = useState("gemini");
  const [googleKey, setGoogleKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [localOnly, setLocalOnly] = useState(false);

  const [hasGoogleKey, setHasGoogleKey] = useState(false);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [hasGroqKey, setHasGroqKey] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((cfg) => {
        if (cfg) {
          setProvider(cfg.llm_provider || "gemini");
          setGeminiModel(cfg.gemini_model || "gemini-1.5-flash");
          setOpenaiModel(cfg.openai_model || "gpt-4o-mini");
          setLocalOnly(Boolean(cfg.local_only));
          setHasGoogleKey(Boolean(cfg.has_google_key));
          setHasOpenaiKey(Boolean(cfg.has_openai_key));
          setHasGroqKey(Boolean(cfg.has_groq_key));
          setHasAnthropicKey(Boolean(cfg.has_anthropic_key));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, any> = {
        llm_provider: provider,
        gemini_model: geminiModel,
        openai_model: openaiModel,
        local_only: localOnly,
      };
      if (googleKey.trim()) payload.google_api_key = googleKey.trim();
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();
      if (groqKey.trim()) payload.groq_api_key = groqKey.trim();
      if (anthropicKey.trim()) payload.anthropic_api_key = anthropicKey.trim();

      const res = await updateSettings(payload);
      if (res?.settings) {
        setHasGoogleKey(res.settings.has_google_key);
        setHasOpenaiKey(res.settings.has_openai_key);
        setHasGroqKey(res.settings.has_groq_key);
        setHasAnthropicKey(res.settings.has_anthropic_key);
      }
      setGoogleKey("");
      setOpenaiKey("");
      setGroqKey("");
      setAnthropicKey("");
      setMessage({ text: "Settings saved successfully! Runtime and configuration updated.", type: "success" });
    } catch (err) {
      setMessage({ text: `Failed to save settings: ${(err as Error).message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestOutput(null);
    try {
      const res = await testSettings();
      if (res.status === "ok") {
        setTestOutput(`✅ AI Provider Connected!\nResponse: ${res.response}`);
      } else {
        setTestOutput(`⚠️ Test Warning: ${res.message || "Provider returned an error."}`);
      }
    } catch (err) {
      setTestOutput(`❌ Connection Failed: ${(err as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Shell title="Settings" subtitle="Configure AI models, API keys, and pipeline preferences.">
      {/* Notifications */}
      {message && (
        <div
          className={`rounded-xl border p-3.5 sm:p-4 text-xs sm:text-sm font-semibold shadow-2xs ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="panel p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-1">AI & Model Provider</h2>
          <p className="m-0 text-xs text-slate-500">
            Choose which AI engine powers natural-language codebase reasoning in RepoMind AI.
          </p>
        </div>

        {/* Provider Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {[
            { id: "gemini", name: "Google Gemini", badge: "Recommended (Free Tier)" },
            { id: "openai", name: "OpenAI", badge: "GPT-4o Mini" },
            { id: "groq", name: "Groq", badge: "Fast Open Models" },
            { id: "claude", name: "Anthropic Claude", badge: "Claude 3.5" },
            { id: "ollama", name: "Ollama", badge: "Local Offline" },
          ].map((item) => (
            <label
              key={item.id}
              className={`flex flex-col gap-1 p-3.5 rounded-xl border cursor-pointer transition-all ${
                provider === item.id
                  ? "border-indigo-600 bg-indigo-50/50 shadow-2xs"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-900">{item.name}</span>
                <input
                  type="radio"
                  name="provider"
                  value={item.id}
                  checked={provider === item.id}
                  onChange={() => setProvider(item.id)}
                  className="h-4 w-4 text-indigo-600"
                />
              </div>
              <span className="text-[11px] text-slate-500">{item.badge}</span>
            </label>
          ))}
        </div>

        {/* Google Gemini Config */}
        {provider === "gemini" && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs sm:text-sm font-semibold text-slate-800">
                Google Gemini API Key
              </label>
              {hasGoogleKey && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  ✓ Key Saved in Backend
                </span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm"
              placeholder={hasGoogleKey ? "Enter new key to update, or leave blank to keep current" : "AIzaSy..."}
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
            />
            <p className="m-0 text-[11px] sm:text-xs text-slate-500">
              Get a free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium">Google AI Studio</a>.
            </p>

            <label className="block text-xs sm:text-sm font-semibold text-slate-800 pt-1">
              Gemini Model
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm"
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Free Tier)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Latest Speed & Quality)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</option>
            </select>
          </div>
        )}

        {/* OpenAI Config */}
        {provider === "openai" && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs sm:text-sm font-semibold text-slate-800">
                OpenAI API Key
              </label>
              {hasOpenaiKey && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  ✓ Key Saved in Backend
                </span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm"
              placeholder={hasOpenaiKey ? "Enter new key to update, or leave blank to keep current" : "sk-..."}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 pt-1">
              Model
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
            >
              <option value="gpt-4o-mini">gpt-4o-mini (Recommended)</option>
              <option value="gpt-4o">gpt-4o</option>
            </select>
          </div>
        )}

        {/* Groq Config */}
        {provider === "groq" && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs sm:text-sm font-semibold text-slate-800">
                Groq API Key
              </label>
              {hasGroqKey && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  ✓ Key Saved in Backend
                </span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm"
              placeholder={hasGroqKey ? "Enter new key to update, or leave blank to keep current" : "gsk_..."}
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
            />
            <p className="m-0 text-[11px] sm:text-xs text-slate-500">
              Create a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium">console.groq.com</a>.
            </p>
          </div>
        )}

        {/* Claude Config */}
        {provider === "claude" && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs sm:text-sm font-semibold text-slate-800">
                Anthropic API Key
              </label>
              {hasAnthropicKey && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  ✓ Key Saved in Backend
                </span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm"
              placeholder={hasAnthropicKey ? "Enter new key to update, or leave blank to keep current" : "sk-ant-..."}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>
        )}

        {/* Ollama Config */}
        {provider === "ollama" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
            <p className="m-0 mb-1 text-xs sm:text-sm font-semibold text-slate-800">Ollama Local Endpoint</p>
            <p className="m-0 text-xs text-slate-500 leading-relaxed">
              Connecting to local Ollama server at <code>http://localhost:11434</code>. Ensure Ollama is running with <code>ollama run llama3.2</code>.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className={`w-full sm:w-auto rounded-xl px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all ${
              saving
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
            }`}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className={`w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all ${
              testing ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
          >
            {testing ? "Testing Connection…" : "⚡ Test Connection"}
          </button>
        </div>

        {/* Test Result Box */}
        {testOutput && (
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3.5 sm:p-4 font-mono text-xs text-cyan-200 leading-relaxed overflow-x-auto max-w-full">
            {testOutput}
          </pre>
        )}
      </form>

      {/* Recommended Free Platforms Guide */}
      <section className="panel p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
            Recommended Free-First Platform Stack
          </h2>
          <p className="m-0 text-xs text-slate-500">
            You can run RepoMind AI without paying for expensive subscriptions using these free developer tiers:
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {freeApiPlatforms.map((platform) => (
            <article
              key={platform.name}
              className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {platform.name}
                </h3>
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 shrink-0">
                  {platform.badge}
                </span>
              </div>
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {platform.apis.join(" • ")}
              </p>
              <p className="m-0 text-xs text-slate-600 leading-relaxed">{platform.note}</p>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}
