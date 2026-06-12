import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Header from '../components/Header.jsx'
import PasswordField from '../components/PasswordField.jsx'
import './Login.css'
import { formatCpf } from '../utils/cpf.js'

function Login() {
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const [a11yMode, setA11yMode] = useState(false)

  useEffect(() => {
    try {
      const root = document.documentElement
      if (a11yMode) root.classList.add('a11y-mode')
      else root.classList.remove('a11y-mode')
    } catch {
      // ignore during SSR or tests
    }
  }, [a11yMode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(cpf, password)
    setLoading(false)

    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="login-page">
      <Header title="MedHora" showBack={false} />
      <div className="page-content">
        <div className="logo-container">
          <div className="logo">
            <svg viewBox="0 0 200 200" width="120" height="120">
              <defs>
                <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1566a8" />
                  <stop offset="100%" stopColor="#4cc47a" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="90" fill="white" stroke="url(#g1)" strokeWidth="10" />
              <g transform="translate(100 100) rotate(-45)">
                <rect x="-35" y="-18" width="70" height="36" rx="18" fill="#1566a8" />
                <rect x="0" y="-18" width="35" height="36" rx="18" fill="#4cc47a" />
              </g>
              <circle cx="100" cy="100" r="55" fill="none" stroke="url(#g1)" strokeWidth="6" />
              <line x1="100" y1="60" x2="100" y2="100" stroke="#1566a8" strokeWidth="5" strokeLinecap="round" />
              <line x1="100" y1="100" x2="128" y2="115" stroke="#1566a8" strokeWidth="5" strokeLinecap="round" />
              <circle cx="100" cy="100" r="5" fill="#1566a8" />
            </svg>
          </div>
          <h1>MedHora</h1>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Por favor, insira seu CPF:</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              required
              disabled={loading}
            />
          </div>

          <PasswordField
            label="Por favor, digite sua senha:"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="******"
            disabled={loading}
            helpText="Senha: apenas digitos, maximo 6 caracteres."
            autoComplete="current-password"
            name="password"
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'ENTRAR'}
          </button>
        </form>

        <div className="login-actions">
          <button
            className="btn-secondary"
            disabled={loading}
            aria-pressed={a11yMode}
            aria-label={a11yMode ? 'Desativar modo acessibilidade' : 'Ativar modo acessibilidade'}
            title={a11yMode ? 'Desativar Acessibilidade' : 'Ativar Acessibilidade'}
            onClick={() => setA11yMode((v) => !v)}
          >
            <span>{a11yMode ? 'Acessibilidade ativada' : 'Acessibilidade'}</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/criar-conta')}
            disabled={loading}
          >
            + Criar Conta
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
