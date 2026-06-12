import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const PRIMARY_ROUTES = new Set(['/', '/horarios', '/rotina', '/lembretes', '/cuidador', '/perfil'])

function Header({ title, showBack }) {
  const navigate = useNavigate()
  const location = useLocation()
  const canShowBack = showBack ?? !PRIMARY_ROUTES.has(location.pathname)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <header className="screen-header">
      <div className="header-content">
        {canShowBack && (
          <button className="back-btn" type="button" onClick={handleBack} aria-label="Voltar">
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="page-title">{title}</h1>
      </div>
    </header>
  )
}

export default Header
