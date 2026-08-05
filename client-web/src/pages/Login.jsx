import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import styles from './Login.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.phone, form.password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.brandMark}>
          <span className={styles.dot} />
          <span className={styles.name}>AwaBus</span>
        </div>
        <div className={styles.tagline}>
          <p>Every child reaches home.</p>
          <p>Every parent knows when.</p>
        </div>
        <div className={styles.detail}>
          Geofence-triggered proximity alerts for school transport in Ghana.
          No app required for parents — any phone, any network.
        </div>
      </div>

      <div className={styles.right}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.formHead}>
            <h1 className={styles.formTitle}>Admin sign-in</h1>
            <p className={styles.formSub}>Restricted to authorised school administrators.</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">Phone number</label>
            <input
              id="phone"
              className={styles.input}
              type="tel"
              placeholder="+233 XX XXX XXXX"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
              autoComplete="tel"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}