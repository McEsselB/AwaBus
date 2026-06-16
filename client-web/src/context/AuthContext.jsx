import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('awa_token')
    const stored = localStorage.getItem('awa_user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('awa_token')
        localStorage.removeItem('awa_user')
      }
    }
    setLoading(false)
  }, [])

//   useEffect(() => {
//   // Temporary: mock a logged-in admin so you can view the portal
//   setUser({ name: 'David Laryea', role: 'admin' })
//   setLoading(false)
// }, [])

  const login = useCallback(async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password })
    localStorage.setItem('awa_token', data.token)
    localStorage.setItem('awa_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('awa_token')
    localStorage.removeItem('awa_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}