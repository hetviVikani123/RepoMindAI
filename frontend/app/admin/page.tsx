"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import {
  deleteAdminRepository,
  deleteUser,
  fetchAdminLogs,
  fetchAdminRepositories,
  fetchAdminStats,
  fetchAdminUsers,
  me,
  updateUserRole,
} from "@/lib/api";
import { useRepo } from "@/lib/store";

interface SystemStats {
  total_users: number;
  total_repositories: number;
  total_embeddings: number;
  total_analyses: number;
}

interface UserRepo {
  id: number;
  name: string;
  url: string;
  language: string;
  created_at: string;
}

interface AdminUser {
  id: number;
  email: string;
  role: string;
  created_at: string;
  repository_count: number;
  repositories?: UserRepo[];
}

interface AdminRepo {
  id: number;
  name: string;
  url: string;
  local_path: string;
  language: string;
  framework: string;
  build_system: string;
  created_at: string;
  owner_id: number;
  owner_email: string;
  owner_role: string;
  file_count: number;
}

interface AnalysisLog {
  id: number;
  repository_id: number;
  report_type: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { setActiveRepo } = useRepo();

  const [currentUser, setCurrentUser] = useState<{ id: number; email: string; role: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [repositories, setRepositories] = useState<AdminRepo[]>([]);
  const [logs, setLogs] = useState<AnalysisLog[]>([]);

  const [activeTab, setActiveTab] = useState<"repositories" | "users" | "stats">("repositories");
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check current user identity & admin role
  useEffect(() => {
    async function verifyAdmin() {
      try {
        const userProfile = await me();
        setCurrentUser(userProfile);
      } catch {
        setError("Failed to verify user credentials. Please sign in again.");
      } finally {
        setAuthChecking(false);
      }
    }
    verifyAdmin();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [statsData, userData, reposData, logData] = await Promise.all([
        fetchAdminStats().catch(() => null),
        fetchAdminUsers().catch(() => []),
        fetchAdminRepositories().catch(() => []),
        fetchAdminLogs(20).catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      setUsers(userData);
      setRepositories(reposData);
      setLogs(logData);
    } catch (e) {
      setError((e as Error).message || "Failed to load administrative data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.role === "admin") {
      loadData();
    }
  }, [currentUser]);

  function notifySuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4500);
  }

  async function handleRoleChange(userId: number, newRole: "developer" | "admin") {
    setActionLoading(`role-${userId}`);
    setError("");
    try {
      await updateUserRole(userId, newRole);
      notifySuccess(`User role successfully changed to '${newRole}'.`);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteUser(user: AdminUser) {
    if (user.id === currentUser?.id) {
      alert("You cannot delete your own administrative account.");
      return;
    }
    const confirmDelete = window.confirm(
      `Are you sure you want to delete user ${user.email}?\nAll their uploaded repositories and analysis data will be permanently removed.`
    );
    if (!confirmDelete) return;

    setActionLoading(`delete-user-${user.id}`);
    setError("");
    try {
      await deleteUser(user.id);
      notifySuccess(`User ${user.email} was successfully deleted.`);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteRepository(repo: AdminRepo) {
    const confirmDelete = window.confirm(
      `⚠️ SECURITY ACTION: Delete Repository\n\nRepository: ${repo.name} (#${repo.id})\nUploaded by: ${repo.owner_email}\nSource: ${repo.url}\n\nAre you sure you want to permanently delete this repository and purge its cloned files and database embeddings?`
    );
    if (!confirmDelete) return;

    setActionLoading(`delete-repo-${repo.id}`);
    setError("");
    try {
      await deleteAdminRepository(repo.id);
      notifySuccess(`Repository '${repo.name}' uploaded by ${repo.owner_email} was deleted.`);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  function handleInspectRepo(repo: AdminRepo) {
    setActiveRepo({
      id: repo.id,
      name: repo.name,
      url: repo.url,
      language: repo.language,
      framework: repo.framework,
      local_path: repo.local_path,
    });
    router.push("/reports");
  }

  // Filtered repositories based on search and selected user
  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        repo.name.toLowerCase().includes(q) ||
        repo.url.toLowerCase().includes(q) ||
        repo.owner_email.toLowerCase().includes(q) ||
        repo.language.toLowerCase().includes(q);

      const matchesUser = userFilter === "all" || repo.owner_email === userFilter;
      return matchesSearch && matchesUser;
    });
  }, [repositories, searchQuery, userFilter]);

  // Filtered users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.repositories && u.repositories.some((r) => r.name.toLowerCase().includes(q)))
    );
  }, [users, searchQuery]);

  if (authChecking) {
    return (
      <Shell title="Admin Panel" subtitle="Verifying permissions…">
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            Verifying administrative access…
          </div>
        </div>
      </Shell>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <Shell title="Admin Panel" subtitle="Restricted Access">
        <section className="panel mx-auto max-w-lg p-6 sm:p-8 text-center space-y-4 my-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 text-2xl border border-amber-200 shadow-sm">
            🛡️
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your current account (<strong className="text-slate-800">{currentUser?.email || "Guest"}</strong>) has the{" "}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 capitalize">
              {currentUser?.role || "user"}
            </span>{" "}
            role and does not have administrative privileges.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-all shadow-sm"
            >
              Return to Dashboard
            </Link>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell
      title="Admin Control Center"
      subtitle="Audit user repository uploads, prevent malicious scanning, and manage user roles."
    >
      {/* Toast Alerts */}
      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 shadow-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-2">
            ✕
          </button>
        </section>
      )}

      {successMessage && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-600 hover:text-emerald-800 font-bold ml-2">
            ✕
          </button>
        </section>
      )}

      {/* Top Admin Summary Bar */}
      <section
        style={{
          background: "linear-gradient(135deg, #090d16 0%, #1e1b4b 55%, #0f172a 100%)",
          color: "#ffffff",
        }}
        className="p-5 sm:p-7 space-y-5 rounded-2xl shadow-xl border border-slate-800 text-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/90 px-3 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/50 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Admin Active
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Logged in as <strong className="text-white font-semibold">{currentUser.email}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              Repository & Security Governance
            </h1>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md ${
              loading
                ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 active:scale-95"
            }`}
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            {loading ? "Refreshing Data…" : "Refresh Audit"}
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-750/80">
            <div className="rounded-xl bg-slate-900/90 p-4 border border-slate-700/80 shadow-md">
              <p className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-indigo-300 m-0">Uploaded Repos</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 m-0 tracking-tight">{stats.total_repositories}</p>
            </div>
            <div className="rounded-xl bg-slate-900/90 p-4 border border-slate-700/80 shadow-md">
              <p className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-indigo-300 m-0">Platform Users</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 m-0 tracking-tight">{stats.total_users}</p>
            </div>
            <div className="rounded-xl bg-slate-900/90 p-4 border border-slate-700/80 shadow-md">
              <p className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-indigo-300 m-0">Embeddings Stored</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 m-0 tracking-tight">{Number(stats.total_embeddings).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-900/90 p-4 border border-slate-700/80 shadow-md">
              <p className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-indigo-300 m-0">Security Scans</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 m-0 tracking-tight">{stats.total_analyses}</p>
            </div>
          </div>
        )}
      </section>

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-2">
        <button
          onClick={() => {
            setActiveTab("repositories");
            setSearchQuery("");
          }}
          className={`flex items-center gap-2 border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "repositories"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🛡️ Ingestion & Security Audit</span>
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            {repositories.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("users");
            setSearchQuery("");
          }}
          className={`flex items-center gap-2 border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "users"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>👥 User Management</span>
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "stats"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>📊 Activity Logs & Stats</span>
        </button>
      </div>

      {/* TAB 1: REPOSITORY SECURITY & AUDIT (The requested core feature) */}
      {activeTab === "repositories" && (
        <section className="space-y-4">
          {/* Security Notice Callout */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-purple-50/50 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="text-xl">🛡️</span>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                  User Repository Provenance & Threat Prevention
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed m-0">
                  Inspect which user uploaded each codebase to ensure no unauthorized, rogue, or malicious repositories are ingested into the platform. If an unauthorized repository is detected, use the <strong>Delete Repository</strong> action to permanently purge its files and embeddings from the system.
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Tools */}
          <div className="panel p-3.5 sm:p-4 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter by repository name, source URL, or user email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Filter by User:</label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="all">All Uploaders ({repositories.length})</option>
                  {Array.from(new Set(repositories.map((r) => r.owner_email))).map((email) => (
                    <option key={email} value={email}>
                      {email} ({repositories.filter((r) => r.owner_email === email).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Repositories Audit Table */}
          <div className="overflow-x-auto w-full rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full min-w-[760px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-left">
                  <th className="py-3 px-4 font-semibold">Repository</th>
                  <th className="py-3 px-4 font-semibold">Uploaded By (User)</th>
                  <th className="py-3 px-4 font-semibold">Source Origin</th>
                  <th className="py-3 px-4 font-semibold">Tech Stack</th>
                  <th className="py-3 px-4 font-semibold">Upload Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRepositories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No repositories found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRepositories.map((repo) => (
                    <tr key={repo.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Repo Name & ID */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs shrink-0 border border-indigo-100">
                            📦
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">{repo.name}</span>
                            <span className="text-[11px] font-normal text-slate-500">ID #{repo.id} · {repo.file_count} files</span>
                          </div>
                        </div>
                      </td>

                      {/* Uploaded By */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900 break-all">{repo.owner_email}</span>
                          </div>
                          <span
                            className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              repo.owner_role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {repo.owner_role} (User #{repo.owner_id})
                          </span>
                        </div>
                      </td>

                      {/* Source URL or Local Path */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 shrink-0">
                              {repo.url.startsWith("http") ? "Git URL" : "Local Path"}
                            </span>
                          </div>
                          <p
                            className="font-mono text-[11px] text-slate-600 truncate m-0"
                            title={repo.url}
                          >
                            {repo.url}
                          </p>
                        </div>
                      </td>

                      {/* Stack */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            {repo.language || "Unknown"}
                          </span>
                          {repo.framework && repo.framework !== "unknown" && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {repo.framework}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Upload Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(repo.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        <span className="block text-[11px] text-slate-400">
                          {new Date(repo.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleInspectRepo(repo)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs"
                            title="Inspect security and architecture reports"
                          >
                            🔍 Inspect
                          </button>
                          <button
                            onClick={() => handleDeleteRepository(repo)}
                            disabled={actionLoading === `delete-repo-${repo.id}`}
                            className="rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer shadow-2xs"
                            title="Purge repository and delete cloned files"
                          >
                            {actionLoading === `delete-repo-${repo.id}` ? "Purging…" : "🗑️ Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: USER MANAGEMENT (Admin-only actions, developer & admin roles only) */}
      {activeTab === "users" && (
        <section className="space-y-4">
          <div className="panel p-3.5 sm:p-4 bg-white flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <input
              type="text"
              placeholder="Search users by email or role…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all"
            />
            <p className="text-xs text-slate-500 m-0">
              Only <strong>Developer</strong> and <strong>Admin</strong> roles are active.
            </p>
          </div>

          <div className="overflow-x-auto w-full rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full min-w-[680px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-left">
                  <th className="py-3 px-4 font-semibold">User Account</th>
                  <th className="py-3 px-4 font-semibold">Active Role</th>
                  <th className="py-3 px-4 font-semibold">Uploaded Repositories</th>
                  <th className="py-3 px-4 font-semibold">Registration Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Email */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold text-xs shrink-0">
                            👤
                          </span>
                          <div>
                            <span className="font-medium text-slate-900">{user.email}</span>
                            {user.id === currentUser?.id && (
                              <span className="ml-2 rounded-md bg-indigo-50 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
                                You
                              </span>
                            )}
                            <span className="block text-[11px] text-slate-400 font-normal">ID #{user.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Current Role */}
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold capitalize ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Repos uploaded */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-900">{user.repository_count} repo(s)</span>
                          {user.repositories && user.repositories.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {user.repositories.map((r) => (
                                <span
                                  key={r.id}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 truncate max-w-[120px]"
                                  title={`${r.name} (${r.url})`}
                                >
                                  {r.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions: Developer / Admin role buttons & Delete */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role toggles: Developer and Admin only */}
                          {(["developer", "admin"] as const).map((r) => (
                            <button
                              key={r}
                              disabled={actionLoading !== null || user.role === r}
                              onClick={() => handleRoleChange(user.id, r)}
                              className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                user.role === r
                                  ? "border border-indigo-300 bg-indigo-50 text-indigo-700 shadow-2xs"
                                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              {r === "developer" ? "Developer" : "Admin"}
                            </button>
                          ))}

                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.id === currentUser?.id || actionLoading !== null}
                            className={`rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold transition-all ${
                              user.id === currentUser?.id
                                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer shadow-2xs"
                            }`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: SYSTEM STATS & LOGS */}
      {activeTab === "stats" && (
        <section className="space-y-4">
          <div className="panel p-4 sm:p-6 bg-white space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">Recent Analysis Records</h2>
            <div className="flex flex-col gap-2">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No analysis logs available yet.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-3 text-xs gap-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        Repo #{log.repository_id}
                      </span>
                      <span className="font-semibold text-slate-900 capitalize">{log.report_type}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </Shell>
  );
}
