import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useMedications } from '../context/MedicationContext.jsx'
import Header from '../components/Header.jsx'
import './Home.css'
import { requestNotificationPermission, showNotification } from '../utils/notifications'

function Home() {
  const { user } = useAuth()
  const { pendingCount } = useMedications()

  async function testAlarm() {
    try {
      await requestNotificationPermission()
      // notificação principal
      showNotification('⏰ Teste de Alarme', 'Este é um teste de alarme - MedHora')

      // vibração quando suportada
      if (navigator.vibrate) navigator.vibrate([300, 100, 300])

      // som curto via Web Audio
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = 880
        g.gain.value = 0.1
        o.connect(g)
        g.connect(ctx.destination)
        o.start()
        setTimeout(() => { o.stop(); ctx.close() }, 400)
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error('Teste de alarme falhou', e)
    }
  }

  return (
    <div className="home-page">
      <Header title="Início" />
      <div className="page-content">
        <div className="welcome-section">
          <h1>BEM VINDO,</h1>
          <h2>{user?.name}!</h2>
        </div>

        <div className="pending-meds">
          <Link to="/horarios" className="pending-card pending-link">
            <div className="pending-icon">🔔</div>
            <div className="pending-info">
              <div className="pending-title">Medicamentos pendentes</div>
              <div className="pending-subtitle">TOQUE PARA ABRIR</div>
              <span className="pending-count">{pendingCount}</span>
            </div>
          </Link>
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
            <Link to="/cuidador" className="btn-secondary-large">
              LEMBRETES
            </Link>
            <Link to="/rotina" className="btn-secondary-large">
              ROTINA
            </Link>
          </div>

          <Link to="/horarios" className="btn-reminder">
            🔔 MEDICAMENTOS PENDENTES
          </Link>

          <button className="btn-test-alarm" onClick={testAlarm} aria-label="Testar alarme">
            Testar Alarme
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home
