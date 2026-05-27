import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Header from '../components/Header.jsx'
import PasswordField from '../components/PasswordField.jsx'
import ProfileTypeToggle from '../components/ProfileTypeToggle.jsx'
import './CreateAccount.css'
import { formatCpf, formatPhone } from '../utils/cpf.js'

function CreateAccount() {
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    password: '',
    role: 'idoso'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { register } = useAuth()

  const getFriendlyError = (message) => {
    if (message?.includes('CPF ja cadastrado') || message?.includes('CPF já cadastrado')) {
      return 'Esse CPF já está cadastrado. Faça login ou recupere sua senha por SMS.'
    }

    return message || 'Nao foi possivel criar a conta.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await register(form)
    setLoading(false)

    if (result.success) {
      navigate('/')
    } else {
      setError(getFriendlyError(result.error))
    }
  }

  // usa formatCpf de util

  return (
    <div className="create-account-page">
      <Header title="Criar Conta" />
      <div className="page-content">
        <form onSubmit={handleSubmit} className="create-form">
          <div className="profile-hint-card">
            <strong>Escolha o tipo de conta</strong>
            <p>O idoso pode vincular cuidadores e o cuidador pode acompanhar mais de um idoso.</p>
          </div>

          <div className="input-group">
            <label>Tipo de perfil:</label>
            <ProfileTypeToggle value={form.role} onChange={(role) => setForm({ ...form, role })} disabled={loading} />
            <small>Toque em uma opção para definir o tipo de conta.</small>
          </div>

          <div className="input-group">
            <label>Nome Completo:</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="Digite seu nome"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>CPF:</label>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => setForm({...form, cpf: formatCpf(e.target.value)})}
              placeholder="000.000.000-00"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Telefone para recuperação por SMS:</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              placeholder="(11) 99999-9999"
              inputMode="tel"
              maxLength={15}
              required
              disabled={loading}
            />
            <small>Esse telefone será usado para recuperar a senha por SMS.</small>
          </div>

          <PasswordField
            label="Senha (apenas números, até 6 dígitos):"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value.replace(/[^0-9]/g, '')})}
            placeholder="123456"
            disabled={loading}
            autoComplete="new-password"
            name="password"
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'CRIAR CONTA'}
          </button>
        </form>

        <button 
          className="btn-back" 
          onClick={() => navigate('/login')}
          disabled={loading}
        >
          ← Voltar ao Login
        </button>
      </div>
    </div>
  )
}

export default CreateAccount
