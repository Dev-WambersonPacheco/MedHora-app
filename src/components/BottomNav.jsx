import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarClock, HeartHandshake, Home, Pill, PlusCircle, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import './BottomNav.css'

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const isCaregiver = user?.role === 'cuidador'

  const navItems = isCaregiver
    ? [
        { path: '/', icon: Home, label: 'Inicio', match: ['/'] },
        { path: '/horarios', icon: CalendarClock, label: 'Horarios', match: ['/horarios'] },
        { path: '/cuidador', icon: HeartHandshake, label: 'Cuidar', match: ['/cuidador'] },
        { path: '/perfil', icon: User, label: 'Perfil', match: ['/perfil', '/perfil/editar'] }
      ]
    : [
        { path: '/', icon: Home, label: 'Inicio', match: ['/'] },
        { path: '/horarios', icon: CalendarClock, label: 'Horarios', match: ['/horarios'] },
        { path: '/adicionar', icon: PlusCircle, label: 'Adicionar', match: ['/adicionar'] },
        { path: '/rotina', icon: Pill, label: 'Rotina', match: ['/rotina', '/lembretes'] },
        { path: '/perfil', icon: User, label: 'Perfil', match: ['/perfil', '/perfil/editar'] }
      ]

  return (
    <nav className="bottom-nav" aria-label="Navegacao principal">
      {navItems.map(({ path, icon: Icon, label, match }) => {
        const active = match.includes(location.pathname)

        return (
          <button
            key={path}
            type="button"
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => {
              if (location.pathname !== path) navigate(path)
            }}
            title={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={23} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
