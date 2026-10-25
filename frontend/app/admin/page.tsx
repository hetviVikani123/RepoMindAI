"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { deleteUser, fetchAdminLogs, fetchAdminStats, fetchAdminUsers, updateUserRole } from "@/lib/api";

export default function AdminPage() {
  const [stats, setStats] = useState<{ total_users: number; total_repositories: number; total_embeddings: number; total_analyses: number } | null>(null);
  const [users, setUsers] = useState<Array<{ id: number; email: string; role: string; repository_count: number; created_at: string }>>([]);
  const [logs, setLogs] = useState<Array<{ id: number; repository_id: number; report_type: string; created_at: string }>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [statsData, userData, logData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminLogs(25),
      ]);
      setStats(statsData);
      setUsers(userData);
      setLogs(logData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Shell title="Admin Panel" subtitle="Manage users, roles, and system activity.">
      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-600">
          {error}
        </section>
      )}

      <section className="panel p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">System Stats</h2>
          <button
            onClick={refresh}
            disabled={loading}
            className={`w-full sm:w-auto rounded-xl px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all whitespace-nowrap ${
              loading
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 cursor-pointer"
            }`}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {[
              ["Users", stats.total_users],
              ["Repositories", stats.total_repositories],
              ["Embeddings", stats.total_embeddings],
              ["Analyses", stats.total_analyses],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs"
              >
                <p className="m-0 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {label as string}
                </p>
                <p className="m-0 mt-1 text-xl sm:text-2xl font-bold text-slate-900 truncate">
                  {Number(value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel p-4 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">Users</h2>
        <div className="overflow-x-auto w-full rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[540px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3.5 text-left font-semibold">Email</th>
                <th className="py-2.5 px-3.5 text-left font-semibold">Role</th>
                <th className="py-2.5 px-3.5 text-left font-semibold">Repos</th>
                <th className="py-2.5 px-3.5 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-none">
                  <td className="py-2.5 px-3.5 font-medium text-slate-900 break-all">{user.email}</td>
                  <td className="py-2.5 px-3.5">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-600 font-medium">{user.repository_count}</td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["developer", "analyst", "admin"].map((role) => (
                        <button
                          key={role}
                          onClick={async () => {
                            await updateUserRole(user.id, role);
                            await refresh();
                          }}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                            user.role === role
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                      <button
                        onClick={async () => {
                          if (confirm(`Delete user ${user.email}?`)) {
                            await deleteUser(user.id);
                            await refresh();
                          }
                        }}
                        className="rounded-lg border border-red-200 bg-red-50/70 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 transition-all cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-4 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">Recent Analysis Logs</h2>
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-2xs space-y-1"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-900">
                  {log.report_type}
                </span>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 w-fit">
                  Repo #{log.repository_id}
                </span>
              </div>
              <p className="m-0 text-[11px] text-slate-400">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
