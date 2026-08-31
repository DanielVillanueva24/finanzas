import axios, { AxiosError } from 'axios'

export const TOKEN_KEY = 'finanzas_token'
export const USER_KEY = 'finanzas_user'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

/** Convierte cualquier error de axios en un mensaje legible en espanol. */
export function errorMessage(error: unknown, fallback = 'Ocurrio un error inesperado'): string {
  const err = error as AxiosError<{ detail?: unknown }>
  if (err?.code === 'ERR_NETWORK') {
    return 'No se pudo conectar con el servidor. Revisa que el backend este corriendo.'
  }
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string }
    if (first?.msg) return first.msg
  }
  return fallback
}
