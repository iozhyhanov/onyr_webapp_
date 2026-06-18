const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

function getToken(): string | null {
  return localStorage.getItem("token")
}

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  const token = getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    // Auto-logout on invalid/expired token
    if (res.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("auth_user")
      window.location.href = "/login"
    }
    throw new Error(err.error || "Request failed")
  }

  // For endpoints that return a file (blob), caller should use fetch directly
  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return res.json()
  }
  return res as unknown as T
}

export const api = {
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T = any>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T = any>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T = any>(path: string) => request<T>("DELETE", path),
}

/** Download a file from a protected endpoint */
export async function downloadFile(path: string, filename: string) {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error("Download failed")
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
