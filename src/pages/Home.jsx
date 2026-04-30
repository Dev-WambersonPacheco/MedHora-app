import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useMedications } from '../context/MedicationContext.jsx'
import Header from '../components/Header.jsx'
import './Home.css'

function Home() {
  const { user } = useAuth()
  const { pendingCount } = useMedications()

  return (
    <div className="home-page">
      <Header title="Início" />
      <div className="page-content">
        <div className="welcome-section">
          <h1>BEM VINDO,</h1>
          <h2>{user?.name}!</h2>
        </div>

        <div className="pending-meds">
          <div className="pending-card">
            <div className="pending-icon">🔔</div>
            <div className="pending-info">
              <div className="pending-title">Medicamentos</div>
              <div className="pending-subtitle">PENDENTES</div>
              <span className="pending-count">{pendingCount}</span>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <Link to="/adicionar" className="btn-add-med">
            <span>+</span>
            <div>
              <div className="btn-title">ADICIONAR</div>
              <div className="btn-subtitle">MEDICAMENTO</div>
            </div>
          </Link>

          <div className="row-buttons">
            <Link to="/lembretes" className="btn-secondary-large">
              ROTINA
            </Link>
            <Link to="/cuidador" className="btn-secondary-large">
              CUIDADOR
            </Link>
          </div>

          <Link to="/horarios" className="btn-reminder">
            🔔 LEMBRETE
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
