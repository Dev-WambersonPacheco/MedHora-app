import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const USERS_KEY = 'medhora_users'
const SESSION_KEY = 'medhora_session'

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) {
      // Cria um usuário demo padrão
      const demo = [{
        cpf: '12345678900',
        password: '123456',
        name: 'SEBASTIÃO',
        caregiver: {
          name: 'MARIA OLIVEIRA',
          role: 'Cuidadora Responsável',
          phone: '(92) 98765-4321',
          email: 'maria.oliveira@gmail.com',
          address: 'Itacoatiara - AM'
        }
      }]
      localStorage.setItem(USERS_KEY, JSON.stringify(demo))
      return demo
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY)
    if (session) {
      try {
        setUser(JSON.parse(session))
      } catch {}
    }
  }, [])

  const login = (cpf, password) => {
    const cleanCpf = cpf.replace(/\D/g, '')
    const users = loadUsers()
    const found = users.find(u => u.cpf === cleanCpf && u.password === password)
    if (!found) return { success: false, error: 'CPF ou senha incorretos.' }
    localStorage.setItem(SESSION_KEY, JSON.stringify(found))
    setUser(found)
    return { success: true }
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const register = (data) => {
    const cleanCpf = data.cpf.replace(/\D/g, '')
    const users = loadUsers()
    if (users.find(u => u.cpf === cleanCpf)) {
      return { success: false, error: 'CPF já cadastrado.' }
    }
    const newUser = {
      cpf: cleanCpf,
      password: data.password,
      name: data.name.toUpperCase(),
      caregiver: data.caregiver || null
    }
    users.push(newUser)
    saveUsers(users)
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser))
    setUser(newUser)
    return { success: true }
  }

  const updateUser = (updates) => {
    if (!user) return
    const users = loadUsers()
    const idx = users.findIndex(u => u.cpf === user.cpf)
    if (idx === -1) return
    const updated = { ...users[idx], ...updates }
    users[idx] = updated
    saveUsers(users)
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
    setUser(updated)
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
