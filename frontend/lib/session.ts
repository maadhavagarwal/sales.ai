const TOKEN_KEYS = ["token", "auth_token"] as const

export const ORG_ID_KEY = "org_id"

function _base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  return atob(`${base64}${padding}`)
}

function _isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return true
    const payload = JSON.parse(_base64UrlDecode(parts[1]))
    const exp = Number(payload?.exp)
    if (!Number.isFinite(exp) || exp <= 0) return false
    return Math.floor(Date.now() / 1000) >= exp
  } catch {
    return true
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key)
    if (!token) continue
    if (_isTokenExpired(token)) {
      localStorage.removeItem(key)
      continue
    }
    return token
  }

  return null
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return
  for (const key of TOKEN_KEYS) {
    localStorage.setItem(key, token)
  }
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key)
  }
}
