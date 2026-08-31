import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, Input } from '../components/ui'
import { errorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const submit = async (event: React.FormEvent, demo = false) => {
    event.preventDefault()
    const name = demo ? 'demo' : username.trim()
    const pass = demo ? 'demo1234' : password

    const found: { username?: string; password?: string } = {}
    if (!name) found.username = 'Escribe tu usuario'
    if (!pass) found.password = 'Escribe tu contrasena'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      await login(name, pass)
      toast.success('Bienvenido de vuelta')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo iniciar sesion'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Inicia sesion"
      subtitle="Entra para ver el resumen de tus finanzas."
      footer={
        <>
          No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-primary hover:underline">
            Crea una gratis
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Usuario" error={errors.username}>
          <Input
            autoComplete="username"
            autoCapitalize="none"
            placeholder="tu_usuario"
            value={username}
            error={Boolean(errors.username)}
            onChange={(e) => {
              setUsername(e.target.value)
              if (errors.username) setErrors((c) => ({ ...c, username: undefined }))
            }}
          />
        </Field>

        <Field label="Contrasena" error={errors.password}>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="********"
              className="pr-11"
              value={password}
              error={Boolean(errors.password)}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((c) => ({ ...c, password: undefined }))
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-muted transition-colors hover:text-ink"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        <Button type="submit" fullWidth loading={loading} icon={<LogIn size={16} />}>
          Entrar
        </Button>

        <div className="relative py-1 text-center">
          <span className="relative z-10 bg-canvas px-3 text-xs text-muted">o</span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
        </div>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={loading}
          onClick={(e) => submit(e, true)}
        >
          Probar con la cuenta demo
        </Button>
      </form>
    </AuthShell>
  )
}
