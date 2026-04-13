// src/lib/backend.ts — helper para o frontend chamar o backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'
const BACKEND_SECRET = process.env.BACKEND_SECRET!

export async function backendFetch(
  path: string,
  userId: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-backend-secret': BACKEND_SECRET,
      'x-user-id': userId,
      ...(options.headers || {})
    }
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}
