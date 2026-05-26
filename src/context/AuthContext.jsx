import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api.js'

const AuthContext = createContext(null)

const SESSION_KEY = 'medhora_session'

function loadStoredUser() {
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
        localStorage.setItem(SESSION_KEY, JSON.stringify(response.user))
        setUser(response.user)
        return { success: true }
      })
      .catch((error) => ({
        success: false,
        error: error.message || 'CPF ou senha incorretos.'
      }))
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const register = (data) => {
    return api.register(data)
      .then((response) => {
        localStorage.setItem(SESSION_KEY, JSON.stringify(response.user))
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
      localStorage.setItem(SESSION_KEY, JSON.stringify(response.user))
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
