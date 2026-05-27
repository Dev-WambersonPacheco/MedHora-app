import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useMedications } from '../context/MedicationContext.jsx'
import Header from '../components/Header.jsx'
import './Home.css'
import { playAlarmTone, requestNotificationPermission, showNotification } from '../utils/notifications'
import { api } from '../services/api.js'
import { formatPhone } from '../utils/cpf.js'

function Home() {
  const { user } = useAuth()
  const { pendingCount } = useMedications()
  const [dashboard, setDashboard] = useState(null)
  const [dashboardError, setDashboardError] = useState('')

  const isCaregiver = user?.role === 'cuidador'
  const elders = useMemo(() => dashboard?.elders || [], [dashboard])

  useEffect(() => {
    if (!isCaregiver || !user?.cpf) return

    let mounted = true
    const loadDashboard = async () => {
      setDashboardError('')
      try {
        const response = await api.getUserDashboard(user.cpf)
        if (mounted) setDashboard(response)
      } catch (error) {
        if (mounted) setDashboardError(error.message || 'Nao foi possivel carregar os idosos.')
      }
    }

    loadDashboard()
    const interval = setInterval(loadDashboard, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isCaregiver, user?.cpf])

  async function testAlarm() {
    try {
      await requestNotificationPermission()
      // notificação principal
      showNotification('Teste de Alarme', 'Este é um teste de alarme - MedHora')

      // vibração quando suportada
      if (navigator.vibrate) navigator.vibrate([180, 70, 180, 70, 260])

      // som curto via Web Audio
      playAlarmTone()
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
          <span className="welcome-role">Conta {user?.role === 'cuidador' ? 'de cuidador' : 'do idoso'}</span>
        </div>

        {isCaregiver ? (
          <div className="caregiver-home">
            <div className="caregiver-home-actions">
              <Link to="/perfil" className="btn-add-med caregiver-add-elder">
                <span>+</span>
                <div>
                  <div className="btn-title">CADASTRAR</div>
                  <div className="btn-subtitle">IDOSO</div>
                </div>
              </Link>

              <Link to="/horarios" className="btn-reminder">
                HORÁRIOS DOS IDOSOS
              </Link>
              <Link to="/cuidador" className="btn-reminder">
                LEMBRETES DO CUIDADOR
              </Link>
            </div>

            {dashboardError && <div className="home-message">{dashboardError}</div>}

            <section className="elder-list-section">
              <div className="elder-list-header">
                <h3>Idosos cadastrados</h3>
                <span>{elders.length} ativo(s)</span>
              </div>

              <div className="elder-list">
                {elders.map((elder) => (
                  <article key={elder.cpf} className="elder-card">
                    <div className="elder-photo">{elder.name?.charAt(0) || 'I'}</div>
                    <div className="elder-card-main">
                      <h4>{elder.name}</h4>
                      <p>CPF: {elder.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                      {elder.phone && <p>Telefone: {formatPhone(elder.phone)}</p>}
                      <div className="elder-status-row">
                        <span className="status-chip danger">Não tomados: {elder.pendingItems?.filter((med) => {
                          const [h = 0, m = 0] = med.time.split(':').map(Number)
                          const now = new Date()
                          return !med.takenToday && (h * 60 + m) < (now.getHours() * 60 + now.getMinutes())
                        }).length || 0}</span>
                        <span className="status-chip success">Tomados: {elder.completedMedications || 0}</span>
                        <span className="status-chip info">Próximos: {elder.pendingMedications || 0}</span>
                      </div>
                    </div>
                    <Link to="/horarios" className="elder-quick-status">
                      Ver status
                    </Link>
                  </article>
                ))}

                {elders.length === 0 && (
                  <div className="empty-state caregiver-home-empty">
                    <div className="empty-icon">+</div>
                    <h3>Nenhum idoso cadastrado</h3>
                    <p>Cadastre ou vincule um idoso para acompanhar medicamentos e relatórios.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <>

        <div className="pending-meds">
          <Link to="/horarios" className="pending-card pending-link">
            <div className="pending-icon"></div>
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

          <Link to="/rotina" className="btn-secondary-large">
            ROTINA
          </Link>

          <Link to="/horarios" className="btn-reminder">
            MEDICAMENTOS PENDENTES
          </Link>

          <button className="btn-test-alarm" onClick={testAlarm} aria-label="Testar alarme">
            Testar Alarme
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Home
