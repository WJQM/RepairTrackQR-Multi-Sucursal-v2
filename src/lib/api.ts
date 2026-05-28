// Helper to get stored user/token/branch
export function getStoredAuth() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = sessionStorage.getItem("token");
  const raw = sessionStorage.getItem("user");
  let user = null;
  try { user = raw ? JSON.parse(raw) : null; } catch { user = null; }
  return { token, user };
}

export function getActiveBranchId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("user") || "{}";
    const user = JSON.parse(raw);
    if (user.role === "superadmin") {
      return sessionStorage.getItem("activeBranchId") || null;
    }
    return user.branchId || null;
  } catch {
    return null;
  }
}

export function setActiveBranchId(id: string) {
  sessionStorage.setItem("activeBranchId", id);
}

// Authenticated fetch with auto branch header
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { token } = getStoredAuth();
  const branchId = getActiveBranchId();
  const headers: any = { ...(options.headers || {}) };
  
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (branchId) headers["x-branch-id"] = branchId;
  
  // Only set Content-Type for non-FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, { ...options, headers });
}
