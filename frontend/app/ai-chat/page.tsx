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
        <section className="panel p-6 sm:p-10 text-center">
          <div className="text-4xl mb-3">🤖</div>
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
    <Shell title="AI Chat" subtitle={`Codebase Q&A for: ${activeRepo.name}`}>
      <section className="panel flex flex-col h-[calc(100vh-200px)] min-h-[480px] sm:h-[72vh] overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-base text-white shadow-2xs">
            🤖
          </div>
          <div className="min-w-0">
            <p className="m-0 text-xs sm:text-sm font-bold text-slate-900 leading-tight">RepoMind AI</p>
            <p className="m-0 text-[11px] text-emerald-600 font-medium truncate flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              Grounded in {activeRepo.name}
            </p>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 bg-slate-50/40">
          {messages.length === 0 && (
            <div className="text-center py-6 sm:py-10 max-w-lg mx-auto">
              <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">
                Ask anything about <strong className="text-slate-800">{activeRepo.name}</strong>
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] sm:text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs"
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
              className={`flex flex-col gap-1 ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm leading-relaxed break-words shadow-2xs ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs"
                    : "bg-white text-slate-900 border border-slate-200 rounded-bl-xs"
                }`}
              >
                {msg.content}
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="max-w-[90%] sm:max-w-[80%]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                    Sources:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {msg.citations.map((c, ci) => (
                      <span
                        key={ci}
                        className="rounded-md bg-purple-50 border border-purple-200/60 px-1.5 py-0.5 font-mono text-[10px] text-purple-700 break-all"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <span className="text-[10px] text-slate-400">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs text-white">
                🤖
              </div>
              <div className="rounded-2xl rounded-bl-xs border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-500">
                Searching codebase context…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Chat Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-slate-200 bg-white p-2.5 sm:p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask about authentication, APIs, structure… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 p-2.5 sm:p-3 text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition-all max-h-24"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm transition-all ${
              loading || !input.trim()
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
            }`}
            aria-label="Send message"
          >
            ↑
          </button>
        </form>
      </section>
    </Shell>
  );
}
