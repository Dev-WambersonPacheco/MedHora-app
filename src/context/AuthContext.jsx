import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api.js'

const AuthContext = createContext(null)

const SESSION_KEY = 'medhora_session'

function loadStoredUser() {
  try {
    const session = localStorage.getItem(SESSION_KEY)
    if (!session) return null

    const parsed = JSON.parse(session)
    return {
      ...(parsed.user || parsed),
      role: (parsed.user || parsed).role || 'idoso',
      inviteCode: (parsed.user || parsed).inviteCode || null
    }
  } catch {
    return null
  }
}

function loadStoredSession() {
  try {
    const session = localStorage.getItem(SESSION_KEY)
    return session ? JSON.parse(session) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadStoredUser())

  const login = (cpf, password) => {
    return api.login(cpf, password)
      .then((response) => {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: response.user, token: response.token }))
        setUser(response.user)
        return { success: true }
      })
      .catch((error) => ({
        success: false,
        error: error.message || 'CPF ou senha incorretos.'
      }))
  }

  const logout = () => {
    api.logout().catch(() => {
      // O logout local deve acontecer mesmo se a sessao ja expirou no servidor.
    })
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const register = (data) => {
    return api.register(data)
      .then((response) => {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: response.user, token: response.token }))
        setUser(response.user)
        return { success: true }
      })
      .catch((error) => ({
        success: false,
        error: error.message || 'Nao foi possivel criar a conta.'
      }))
  }

  const updateUser = async (updates) => {
    if (!user) return { success: false, error: 'Usuario nao autenticado.' }

    try {
      const response = await api.updateUser(user.cpf, updates)
      const session = loadStoredSession()
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: response.user, token: session?.token || null }))
      setUser(response.user)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Nao foi possivel atualizar o perfil.'
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
