import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Clock, User } from 'lucide-react'
import './BottomNav.css'

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'Início' },
    { path: '/horarios', icon: Clock, label: 'Horários' },
    { path: '/perfil', icon: User, label: 'Perfil' }
  ]

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          className={`nav-item ${location.pathname === path ? 'active' : ''}`}
          onClick={() => navigate(path)}
          title={label}
        >
          <Icon size={24} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
