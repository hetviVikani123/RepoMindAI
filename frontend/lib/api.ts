const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

const ACCESS_TOKEN_KEY = "repomind_access_token";
const REFRESH_TOKEN_KEY = "repomind_refresh_token";

export type ImportPayload = {
  url: string;
};

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function storeTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function register(email: string, password: string, role: string) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const tokens: AuthTokens = await response.json();
  storeTokens(tokens);
  return tokens;
}

export async function me() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader()
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function importRepository(payload: ImportPayload) {
  const response = await fetch(`${API_BASE}/repository/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function repositoryStatus(repositoryId: number) {
  const response = await fetch(`${API_BASE}/repository/${repositoryId}/status`, {
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function fetchPipelineStatus(repositoryId: number) {
  const response = await fetch(`${API_BASE}/repository/${repositoryId}/pipeline-status`, {
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function askQuestion(repositoryId: number, question: string) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ repository_id: repositoryId, question })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function fetchAnalysis(type: "architecture" | "uml" | "dependencies" | "technical-debt" | "security" | "report", repositoryId: number) {
  const response = await fetch(`${API_BASE}/${type}?repository_id=${repositoryId}`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function fetchDocumentation(repositoryId: number) {
  const response = await fetch(`${API_BASE}/documentation?repository_id=${repositoryId}`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function fetchAdminStats() {
  const response = await fetch(`${API_BASE}/admin/stats`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function fetchAdminLogs(limit = 25) {
  const response = await fetch(`${API_BASE}/admin/logs?limit=${limit}`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function fetchAdminUsers() {
  const response = await fetch(`${API_BASE}/admin/users`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function updateUserRole(userId: number, role: string) {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ role })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function deleteUser(userId: number) {
  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}
