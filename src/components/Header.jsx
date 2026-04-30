import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function Header({ title, showBack = true }) {
  const navigate = useNavigate()

  return (
    <header className="screen-header">
      <div className="header-content">
        {showBack && (
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="page-title">{title}</h1>
      </div>
    </header>
  )
}

export default Header
