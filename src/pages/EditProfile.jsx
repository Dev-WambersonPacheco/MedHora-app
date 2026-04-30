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
    setSuccess('')

    try {
      await updateUser(form)
      setSuccess('Perfil atualizado com sucesso!')
      setTimeout(() => navigate('/perfil'), 1500)
    } catch (error) {
      console.error('Erro ao atualizar:', error)
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
