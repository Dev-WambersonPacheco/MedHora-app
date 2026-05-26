import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Header from '../components/Header.jsx'
import './CreateAccount.css'
import { formatCpf } from '../utils/cpf.js'

function CreateAccount() {
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    password: '',
    role: 'idoso'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await register(form)
    setLoading(false)

    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
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
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              disabled={loading}
            >
              <option value="idoso">Idoso</option>
              <option value="cuidador">Cuidador</option>
            </select>
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
            <label>Senha (apenas números):</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\\d{1,6}"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value.replace(/[^0-9]/g, '')})}
              placeholder="123456"
              maxLength={6}
              required
              disabled={loading}
            />
          </div>

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
