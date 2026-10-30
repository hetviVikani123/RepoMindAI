"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { login, register } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("developer");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("Use your RepoMind account credentials.");
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-3.5 sm:p-6">
      <section className="panel w-full p-5 sm:p-8 bg-white shadow-xl border border-slate-200/80 rounded-2xl space-y-4">
        {/* Branding */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 font-bold border border-indigo-100 shadow-2xs">
            🧠
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-none">RepoMind AI</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Repository Intelligence</p>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Access your codebase intelligence workspace.
          </p>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Register
          </button>
        </div>

        <form
          className="space-y-3.5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (mode === "register") {
                await register(email, password, role);
                setMessage("Registration succeeded. You can now log in.");
              } else {
                await login(email, password);
                setMessage("Login successful. Redirecting…");
                router.push("/dashboard");
              }
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition-all"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition-all"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition-all"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <button
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-2.5 sm:p-3 text-xs sm:text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer mt-2"
            type="submit"
          >
            {mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 text-center text-xs text-slate-600">
          {message}
        </div>
      </section>
    </main>
  );
}
