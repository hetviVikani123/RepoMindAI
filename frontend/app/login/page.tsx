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
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center p-6">
      <section className="panel w-full p-6">
        <h1 className="mb-2 text-3xl">Login</h1>
        <p className="mb-5 text-sm text-slate-600">Access your repository intelligence workspace.</p>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-xl px-3 py-1 text-sm ${mode === "login" ? "bg-blue-800 text-white" : "bg-slate-100"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-xl px-3 py-1 text-sm ${mode === "register" ? "bg-blue-800 text-white" : "bg-slate-100"}`}
          >
            Register
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (mode === "register") {
                await register(email, password, role);
                setMessage("Registration succeeded. You can now log in.");
              } else {
                await login(email, password);
                setMessage("Login successful.");
                router.push("/dashboard");
              }
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        >
          <input className="w-full rounded-xl border p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="w-full rounded-xl border p-3"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "register" ? (
            <select className="w-full rounded-xl border p-3" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="developer">developer</option>
              <option value="analyst">analyst</option>
              <option value="admin">admin</option>
            </select>
          ) : null}
          <button className="w-full rounded-xl bg-blue-800 p-3 font-medium text-white" type="submit">
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-600">{message}</p>
      </section>
    </main>
  );
}
