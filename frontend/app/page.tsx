import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-4 sm:p-6 md:p-8">
      <section className="panel w-full max-w-2xl p-6 sm:p-10 md:p-12 text-center bg-white shadow-xl border border-slate-200/80 rounded-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 mb-4 shadow-2xs">
          <span>🧠</span>
          <span>AI-Powered Repository Intelligence</span>
        </div>

        <h1 className="mb-3 text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
          Understand Any Codebase in Minutes
        </h1>

        <p className="mx-auto max-w-lg mb-6 sm:mb-8 text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">
          Import any GitHub repository, inspect automated architecture diagrams and UML, analyze code dependencies & security vulnerabilities, and chat directly with your codebase.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm mx-auto">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all text-center"
          >
            Launch Dashboard →
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all text-center"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-base sm:text-xl font-bold text-slate-900">100%</p>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Free Tier Ready</p>
          </div>
          <div>
            <p className="text-base sm:text-xl font-bold text-slate-900">AST</p>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Code Parsing</p>
          </div>
          <div>
            <p className="text-base sm:text-xl font-bold text-slate-900">RAG</p>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Grounded Chat</p>
          </div>
        </div>
      </section>
    </main>
  );
}
