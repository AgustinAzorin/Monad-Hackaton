// Cliente HTTP mínimo para hablar con el backend NestJS autenticando con el
// access_token de Supabase guardado en localStorage.

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      const data = await res.json()
      message = Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message ?? message
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
