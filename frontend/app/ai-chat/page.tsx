"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useRepo } from "@/lib/store";
import { askQuestion } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  timestamp: Date;
};

export default function AIChatPage() {
  const { activeRepo } = useRepo();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeRepo || loading) return;

    const userMsg: Message = { role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await askQuestion(activeRepo.id, userMsg.content);
      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer,
        citations: data.citations || [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${(e as Error).message}`, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  const suggestions = [
    "How is authentication implemented?",
    "What are the main API endpoints?",
    "Where is the database model defined?",
    "How does the payment module work?",
    "What design patterns are used?",
    "How is error handling done?",
  ];

  if (!activeRepo) {
    return (
      <Shell title="AI Chat" subtitle="Ask natural-language questions about your codebase.">
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
    <Shell title="AI Chat" subtitle={`Codebase Q&A for: ${activeRepo.name}`}>
      <section className="panel" style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
        {/* Chat Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
            🤖
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>RepoMind AI</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#22c55e" }}>● Online · Context: {activeRepo.name}</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: "40px" }}>
              <p style={{ color: "#94a3b8", marginBottom: "20px", fontSize: "14px" }}>
                Ask anything about <strong>{activeRepo.name}</strong>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "20px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "12px",
                      cursor: "pointer",
                      color: "#374151",
                      transition: "all 0.15s",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: "4px",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                    : "#f1f5f9",
                  color: msg.role === "user" ? "#fff" : "#0f172a",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <div style={{ maxWidth: "80%" }}>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "4px 0 2px" }}>Sources:</p>
                  {msg.citations.map((c, ci) => (
                    <span
                      key={ci}
                      style={{
                        display: "inline-block",
                        background: "#ede9fe",
                        color: "#7c3aed",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        marginRight: "4px",
                        marginBottom: "2px",
                        fontFamily: "monospace",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                🤖
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: "#f1f5f9", fontSize: "14px", color: "#64748b" }}>
                Searching codebase context…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "10px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask about authentication, APIs, design patterns…  (Enter to send)"
            style={{
              flex: 1,
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "12px 16px",
              fontSize: "14px",
              resize: "none",
              height: "52px",
              fontFamily: "inherit",
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "0 20px",
              fontWeight: 700,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: "16px",
            }}
          >
            ↑
          </button>
        </form>
      </section>
    </Shell>
  );
}
