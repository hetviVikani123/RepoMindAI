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
        <section className="panel p-5" style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626" }}>
          {error}
        </section>
      )}

      <section className="panel p-5">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>System Stats</h2>
          <button
            onClick={refresh}
            disabled={loading}
            style={{ background: loading ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {stats && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ["Users", stats.total_users],
              ["Repositories", stats.total_repositories],
              ["Embeddings", stats.total_embeddings],
              ["Analyses", stats.total_analyses],
            ].map(([label, value]) => (
              <div key={label as string} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", background: "#fff" }}>
                <p style={{ margin: 0, color: "#64748b", fontSize: "12px", textTransform: "uppercase" }}>{label as string}</p>
                <p style={{ margin: "6px 0 0", fontSize: "28px", fontWeight: 700 }}>{value as number}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel p-5 space-y-4">
        <h2 style={{ margin: 0, fontSize: "18px" }}>Users</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "10px 8px" }}>Email</th>
                <th style={{ padding: "10px 8px" }}>Role</th>
                <th style={{ padding: "10px 8px" }}>Repos</th>
                <th style={{ padding: "10px 8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 8px" }}>{user.email}</td>
                  <td style={{ padding: "10px 8px" }}>{user.role}</td>
                  <td style={{ padding: "10px 8px" }}>{user.repository_count}</td>
                  <td style={{ padding: "10px 8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["developer", "analyst", "admin"].map((role) => (
                      <button
                        key={role}
                        onClick={async () => {
                          await updateUserRole(user.id, role);
                          await refresh();
                        }}
                        style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", padding: "6px 10px", cursor: "pointer" }}
                      >
                        Set {role}
                      </button>
                    ))}
                    <button
                      onClick={async () => {
                        await deleteUser(user.id);
                        await refresh();
                      }}
                      style={{ border: "1px solid #fecaca", borderRadius: "8px", background: "#fff1f2", padding: "6px 10px", cursor: "pointer", color: "#b91c1c" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5 space-y-4">
        <h2 style={{ margin: 0, fontSize: "18px" }}>Analysis Logs</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {logs.map((log) => (
            <div key={log.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <strong>{log.report_type}</strong>
                <span style={{ color: "#64748b" }}>Repo #{log.repository_id}</span>
              </div>
              <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "12px" }}>{log.created_at}</p>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
