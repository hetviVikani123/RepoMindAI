import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-6">
      <section className="panel max-w-2xl p-8 text-center">
        <p className="mb-4 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
          AI-powered Repository Intelligence
        </p>
        <h1 className="mb-4 text-4xl">Understand Any Codebase in Minutes</h1>
        <p className="mb-8 text-slate-600">
          Import a GitHub repository, run structural and quality analysis, then chat with grounded context from your own code.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/login" className="rounded-xl bg-blue-800 px-5 py-2 font-medium text-white">
            Login
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-slate-300 px-5 py-2 font-medium">
            Open Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
