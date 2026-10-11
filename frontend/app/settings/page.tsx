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
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            background: message.type === "success" ? "#dcfce7" : "#fee2e2",
            color: message.type === "success" ? "#166534" : "#991b1b",
            fontSize: "14px",
            fontWeight: 600,
          }}
          className="panel"
        >
          {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="panel p-6 space-y-6">
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700 }}>AI & Model Provider</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Choose which AI engine powers natural-language codebase reasoning in RepoMind AI.
          </p>
        </div>

        {/* Provider Selection */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
          {[
            { id: "gemini", name: "Google Gemini", badge: "Recommended (Free Tier)" },
            { id: "openai", name: "OpenAI", badge: "GPT-4o Mini" },
            { id: "groq", name: "Groq", badge: "Fast Open Models" },
            { id: "claude", name: "Anthropic Claude", badge: "Claude 3.5" },
            { id: "ollama", name: "Ollama", badge: "Local Offline" },
          ].map((item) => (
            <label
              key={item.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "14px",
                borderRadius: "12px",
                border: provider === item.id ? "2px solid #6366f1" : "1px solid #e2e8f0",
                background: provider === item.id ? "#f5f3ff" : "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{item.name}</span>
                <input
                  type="radio"
                  name="provider"
                  value={item.id}
                  checked={provider === item.id}
                  onChange={() => setProvider(item.id)}
                />
              </div>
              <span style={{ fontSize: "11px", color: "#64748b" }}>{item.badge}</span>
            </label>
          ))}
        </div>

        {/* Google Gemini Config */}
        {provider === "gemini" && (
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }} className="space-y-3">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Google Gemini API Key</label>
              {hasGoogleKey && (
                <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "100px", fontWeight: 600 }}>
                  ✓ Key Saved in Backend
                </span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border p-3 bg-white"
              placeholder={hasGoogleKey ? "Enter new key to update, or leave blank to keep current" : "AIzaSy..."}
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
            />
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Get a free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#6366f1", textDecoration: "underline" }}>Google AI Studio</a>.
            </p>

            <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginTop: "10px" }}>Gemini Model</label>
            <select
              className="w-full rounded-xl border p-3 bg-white"
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
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }} className="space-y-3">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>OpenAI API Key</label>
              {hasOpenaiKey && (
                <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "100px", fontWeight: 600 }}>
                  ✓ Key Saved in Backend
                </span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border p-3 bg-white"
              placeholder={hasOpenaiKey ? "Enter new key to update, or leave blank to keep current" : "sk-..."}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginTop: "10px" }}>Model</label>
            <select
              className="w-full rounded-xl border p-3 bg-white"
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
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }} className="space-y-3">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Groq API Key</label>
              {hasGroqKey && (
                <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "100px", fontWeight: 600 }}>
                  ✓ Key Saved in Backend
                </span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border p-3 bg-white"
              placeholder={hasGroqKey ? "Enter new key to update, or leave blank to keep current" : "gsk_..."}
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
            />
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Create a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: "#6366f1", textDecoration: "underline" }}>console.groq.com</a>.
            </p>
          </div>
        )}

        {/* Claude Config */}
        {provider === "claude" && (
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }} className="space-y-3">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Anthropic API Key</label>
              {hasAnthropicKey && (
                <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "100px", fontWeight: 600 }}>
                  ✓ Key Saved in Backend
                </span>
              )}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border p-3 bg-white"
              placeholder={hasAnthropicKey ? "Enter new key to update, or leave blank to keep current" : "sk-ant-..."}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>
        )}

        {/* Ollama Config */}
        {provider === "ollama" && (
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600 }}>Ollama Local Endpoint</p>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Connecting to local Ollama server at <code>http://localhost:11434</code>. Ensure Ollama is running with <code>ollama run llama3.2</code>.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", paddingTop: "10px" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 24px",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            style={{
              background: "#fff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              borderRadius: "10px",
              padding: "10px 20px",
              fontWeight: 600,
              cursor: testing ? "not-allowed" : "pointer",
            }}
          >
            {testing ? "Testing Connection…" : "⚡ Test Connection"}
          </button>
        </div>

        {/* Test Result Box */}
        {testOutput && (
          <pre
            style={{
              background: "#0f172a",
              color: "#a5f3fc",
              padding: "16px",
              borderRadius: "12px",
              fontSize: "13px",
              whiteSpace: "pre-wrap",
            }}
          >
            {testOutput}
          </pre>
        )}
      </form>

      {/* Recommended Free Platforms Guide */}
      <section className="panel space-y-4 p-6">
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }}>Recommended Free-First Platform Stack</h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            You can run RepoMind AI without paying for expensive subscriptions using these free developer tiers:
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {freeApiPlatforms.map((platform) => (
            <article key={platform.name} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{platform.name}</h3>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#ede9fe", color: "#7c3aed", padding: "2px 8px", borderRadius: "6px" }}>
                  {platform.badge}
                </span>
              </div>
              <p style={{ margin: "0 0 6px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
                {platform.apis.join(" • ")}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: 1.5 }}>{platform.note}</p>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}
