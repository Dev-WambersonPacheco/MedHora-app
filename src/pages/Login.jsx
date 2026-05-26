import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Header from '../components/Header.jsx'
import { api } from '../services/api.js'
import './Login.css'
import { formatCpf } from '../utils/cpf.js'

function Login() {
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryCpf, setRecoveryCpf] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const [a11yMode, setA11yMode] = useState(false)

  useEffect(() => {
    try {
      const root = document.documentElement
      if (a11yMode) root.classList.add('a11y-mode')
      else root.classList.remove('a11y-mode')
    } catch (e) {
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
      setError(
        result.error === 'CPF ou senha incorretos.'
          ? 'CPF ou senha incorretos. Se esqueceu a senha, use Recuperar por SMS.'
          : result.error
      )
    }
  }

  const handleRequestRecovery = async (e) => {
    e.preventDefault()
    setRecoveryError('')
    setRecoveryMessage('')
    setRecoveryLoading(true)

    try {
      const response = await api.requestPasswordRecovery(recoveryCpf)
      setRecoveryMessage(`${response.message} Enviado para ${response.phoneHint}.`)
    } catch (error) {
      setRecoveryError(error.message || 'Nao foi possivel enviar o SMS de recuperacao.')
    } finally {
      setRecoveryLoading(false)
    }
  }

  const handleConfirmRecovery = async (e) => {
    e.preventDefault()
    setRecoveryError('')
    setRecoveryMessage('')
    setRecoveryLoading(true)

    try {
      const response = await api.confirmPasswordRecovery(recoveryCpf, recoveryCode, recoveryPassword)
      setRecoveryMessage(response.message || 'Senha redefinida com sucesso.')
      setRecoveryCode('')
      setRecoveryPassword('')
    } catch (error) {
      setRecoveryError(error.message || 'Nao foi possivel redefinir a senha.')
    } finally {
      setRecoveryLoading(false)
    }
  }

  // usa formatCpf de util

  return (
    <div className="login-page">
      <Header title="MedHora" showBack={false} />
      <div className="page-content">
        <div className="logo-container">
          <div className="logo">
            <svg viewBox="0 0 200 200" width="120" height="120">
              <defs>
                <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1566a8"/>
                  <stop offset="100%" stopColor="#4cc47a"/>
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="90" fill="white" stroke="url(#g1)" strokeWidth="10"/>
              <g transform="translate(100 100) rotate(-45)">
                <rect x="-35" y="-18" width="70" height="36" rx="18" fill="#1566a8"/>
                <rect x="0" y="-18" width="35" height="36" rx="18" fill="#4cc47a"/>
              </g>
              <circle cx="100" cy="100" r="55" fill="none" stroke="url(#g1)" strokeWidth="6"/>
              <line x1="100" y1="60" x2="100" y2="100" stroke="#1566a8" strokeWidth="5" strokeLinecap="round"/>
              <line x1="100" y1="100" x2="128" y2="115" stroke="#1566a8" strokeWidth="5" strokeLinecap="round"/>
              <circle cx="100" cy="100" r="5" fill="#1566a8"/>
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

          <div className="input-group">
            <label>Por favor, digite sua senha:</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\\d{1,6}"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="******"
              maxLength={6}
              required
              disabled={loading}
            />
            <small>Senha: apenas dígitos, máximo 6 caracteres.</small>
          </div>

          {error && <div className="error">{error}</div>}

          <button
            type="button"
            className="btn-link-recovery"
            onClick={() => {
              setRecoveryCpf(cpf)
              setRecoveryOpen(true)
              setRecoveryError('')
              setRecoveryMessage('')
            }}
            disabled={loading}
          >
            Esqueceu a senha? Recuperar por SMS
          </button>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'ENTRAR'}
          </button>
        </form>

        {recoveryOpen && (
          <section className="recovery-card" aria-live="polite">
            <h2>Recuperar senha por SMS</h2>
            <p>Informe o CPF. O código será enviado para o telefone cadastrado no perfil.</p>
            <p className="recovery-note">Se o seu telefone não estiver atualizado, ajuste-o em Editar Perfil antes de continuar.</p>

            <form className="recovery-form" onSubmit={handleRequestRecovery}>
              <div className="input-group">
                <label>CPF</label>
                <input
                  type="text"
                  value={recoveryCpf}
                  onChange={(e) => setRecoveryCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  disabled={recoveryLoading}
                />
              </div>
              <button type="submit" className="btn-secondary" disabled={recoveryLoading || !recoveryCpf.trim()}>
                {recoveryLoading ? 'Enviando SMS...' : 'Enviar código por SMS'}
              </button>
            </form>

            <form className="recovery-form recovery-confirm" onSubmit={handleConfirmRecovery}>
              <div className="input-group">
                <label>Código recebido por SMS</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  disabled={recoveryLoading}
                />
              </div>
              <div className="input-group">
                <label>Nova senha</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\\d{1,6}"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  disabled={recoveryLoading}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={recoveryLoading || !recoveryCode || !recoveryPassword}>
                {recoveryLoading ? 'Redefinindo...' : 'Redefinir senha'}
              </button>
            </form>

            {recoveryMessage && <div className="success recovery-status">{recoveryMessage}</div>}
            {recoveryError && <div className="error recovery-status">{recoveryError}</div>}
          </section>
        )}

        <div className="login-actions">
          <button
            className="btn-secondary"
            disabled={loading}
            aria-pressed={a11yMode}
            aria-label={a11yMode ? 'Desativar modo acessibilidade' : 'Ativar modo acessibilidade (TalkBack)'}
            title={a11yMode ? 'Desativar Acessibilidade' : 'Ativar Acessibilidade'}
            onClick={() => setA11yMode((v) => !v)}
          >
            <span aria-hidden>👁️</span>
            <span style={{marginLeft:8}}>{a11yMode ? 'Acessibilidade ativada' : 'Acessibilidade'}</span>
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
