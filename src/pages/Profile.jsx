import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import './Profile.css'

function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
  }

  const handleEdit = () => {
    navigate('/perfil/editar')
  }

  if (!user) return null

  return (
    <div className="profile-page">
      <Header title="MEU PERFIL" />
      <div className="page-content">
        <div className="profile-card">
          <div className="profile-avatar">👨</div>
          <div className="profile-details">
            <h1>{user.name}</h1>
            <div className="profile-cpf">
              CPF: {user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn-edit" onClick={handleEdit}>
            ✏️ EDITAR PERFIL
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 SAIR
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile
