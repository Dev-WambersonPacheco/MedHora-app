import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Header from '../components/Header.jsx'
import './EditProfile.css'

function EditProfile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      })
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await updateUser(form)
      if (result.success) {
        setSuccess('Perfil atualizado com sucesso!')
        setTimeout(() => navigate('/perfil'), 1500)
      } else {
        setError(result.error || 'Nao foi possivel atualizar o perfil.')
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      setError('Nao foi possivel atualizar o perfil.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="edit-profile-page">
      <Header title="Editar Perfil" />
      <div className="page-content">
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="input-group">
            <label>Nome:</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Telefone:</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Email:</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              disabled={loading}
            />
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={() => navigate('/perfil')}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Salvando...' : 'SALVAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProfile
