import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, Input } from '../components/ui'
import { errorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

interface Form {
  fullName: string
  username: string
  password: string
  confirm: string
}

type Errors = Partial<Record<keyof Form, string>>

function validate(form: Form): Errors {
  const errors: Errors = {}
  const user = form.username.trim()
  if (!user) errors.username = 'Elige un usuario'
  else if (user.length < 3) errors.username = 'Minimo 3 caracteres'
  else if (!/^[a-zA-Z0-9._]+$/.test(user)) errors.username = 'Solo letras, numeros, punto y guion bajo'

  if (!form.password) errors.password = 'Escribe una contrasena'
  else if (form.password.length < 6) errors.password = 'Minimo 6 caracteres'

  if (!form.confirm) errors.confirm = 'Repite la contrasena'
  else if (form.confirm !== form.password) errors.confirm = 'Las contrasenas no coinciden'
  return errors
}

export default function Register() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState<Form>({ fullName: '', username: '', password: '', confirm: '' })
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({})
  const [loading, setLoading] = useState(false)

  const errors = useMemo(() => validate(form), [form])

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const set = (key: keyof Form, value: string) => setForm((c) => ({ ...c, [key]: value }))
  const showError = (key: keyof Form) => (touched[key] ? errors[key] : undefined)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched({ fullName: true, username: true, password: true, confirm: true })
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      await register(form.username.trim().toLowerCase(), form.password, form.fullName.trim())
      toast.success('Cuenta creada, ya puedes empezar')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo crear la cuenta'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Toma menos de un minuto y llega con categorias listas."
      footer={
        <>
          Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Inicia sesion
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nombre" hint="Opcional, es como te saluda la app">
          <Input
            placeholder="Tu nombre"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
          />
        </Field>

        <Field label="Usuario" required error={showError('username')}>
          <Input
            autoCapitalize="none"
            placeholder="tu_usuario"
            value={form.username}
            error={Boolean(showError('username'))}
            onChange={(e) => set('username', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, username: true }))}
          />
        </Field>

        <Field label="Contrasena" required error={showError('password')}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Minimo 6 caracteres"
            value={form.password}
            error={Boolean(showError('password'))}
            onChange={(e) => set('password', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          />
        </Field>

        <Field label="Repite la contrasena" required error={showError('confirm')}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="********"
            value={form.confirm}
            error={Boolean(showError('confirm'))}
            onChange={(e) => set('confirm', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          />
        </Field>

        <Button type="submit" fullWidth loading={loading} icon={<UserPlus size={16} />}>
          Crear cuenta
        </Button>
      </form>
    </AuthShell>
  )
}
