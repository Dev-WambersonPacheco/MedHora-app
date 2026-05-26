import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../services/api.js'
import { cancelReminderAlerts, scheduleReminderAlert } from '../utils/alerts.js'
import { requestNotificationPermission } from '../utils/notifications.js'
import './Caregiver.css'

const STORAGE_KEY = 'medhora_caregiver_reminders_v1'

const PRIORITIES = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' }
]

function makeId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function emptyForm() {
  return {
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    priority: 'media'
  }
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function Caregiver() {
  const { user } = useAuth()
  const [items, setItems] = useState(() => loadItems())
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [dashboardError, setDashboardError] = useState('')
  const [loadingDashboard, setLoadingDashboard] = useState(false)

  useEffect(() => {
    requestNotificationPermission()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    cancelReminderAlerts()
    items.forEach((item) => scheduleReminderAlert(item))
  }, [items])

  useEffect(() => {
    if (!user?.cpf) return

    let mounted = true

    const loadDashboard = async () => {
      setLoadingDashboard(true)
      setDashboardError('')
      try {
        const response = await api.getUserDashboard(user.cpf)
        if (mounted) setDashboard(response)
      } catch (error) {
        if (mounted) setDashboardError(error.message || 'Nao foi possivel carregar os idosos vinculados.')
      } finally {
        if (mounted) setLoadingDashboard(false)
      }
    }

    loadDashboard()
    const interval = setInterval(loadDashboard, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user?.cpf])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [items])

  const linkedElders = useMemo(() => dashboard?.elders || [], [dashboard])
  const reportCards = useMemo(() => {
    return linkedElders.map((elder) => ({
      cpf: elder.cpf,
      name: elder.name,
      weekly: elder.reports?.weekly,
      monthly: elder.reports?.monthly
    }))
  }, [linkedElders])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description,
      date: item.date,
      time: item.time,
      priority: item.priority
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!form.title.trim() || !form.description.trim() || !form.date || !form.time) {
      setMessage('Informe título, descrição, data e hora.')
      return
    }

    const payload = {
      id: editingId || makeId(),
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      time: form.time,
      priority: form.priority
    }

    setItems((prev) => {
      const next = prev.filter((item) => item.id !== payload.id)
      return [...next, payload]
    })

    setMessage(editingId ? 'Lembrete atualizado.' : 'Lembrete criado.')
    resetForm()
  }

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setMessage('Lembrete removido.')
  }

  return (
    <div className="caregiver-page reminders-page">
      <Header title="LEMBRETES DO CUIDADOR" />
      <div className="page-content">
        <section className="caregiver-hero">
          <div>
            <h2>Mensagem de apoio ao idoso</h2>
            <p>Crie lembretes personalizados com data, hora e prioridade para reforçar os cuidados diários.</p>
          </div>
          <div className="caregiver-hero-badge">Alertas automáticos</div>
        </section>

        <section className="caregiver-live-panel">
          <div className="caregiver-live-header">
            <div>
              <h2>Acompanhamento em tempo real</h2>
              <p>Veja os idosos vinculados, os medicamentos pendentes e o status de cumprimento sem sair do app.</p>
            </div>
            <div className="caregiver-live-badge">
              {loadingDashboard ? 'Atualizando...' : `${linkedElders.length} idoso(s)`}
            </div>
          </div>

          {dashboardError && <div className="success-message">{dashboardError}</div>}

          <div className="caregiver-live-grid">
            {linkedElders.map((elder) => (
              <article key={elder.cpf} className="caregiver-live-card">
                <div className="caregiver-live-card-top">
                  <div>
                    <h3>{elder.name}</h3>
                    <p>{elder.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                  </div>
                  {elder.inviteCode && <span className="caregiver-live-code">{elder.inviteCode}</span>}
                </div>

                <div className="caregiver-live-stats">
                  <span>Pendentes: {elder.pendingMedications || 0}</span>
                  <span>Concluídos: {elder.completedMedications || 0}</span>
                  <span>Total: {elder.medicationCount || 0}</span>
                </div>

                <div className="caregiver-live-feed">
                  <h4>Próximas doses</h4>
                  {elder.pendingItems?.length ? elder.pendingItems.slice(0, 4).map((medication) => (
                    <div key={medication.id} className="caregiver-feed-item">
                      <strong>{medication.name}</strong>
                      <span>{medication.dose} • {medication.time}</span>
                    </div>
                  )) : (
                    <p className="caregiver-feed-empty">Nenhuma dose pendente agora.</p>
                  )}
                </div>
              </article>
            ))}

            {!linkedElders.length && !loadingDashboard && (
              <div className="empty-state caregiver-live-empty">
                <div className="empty-icon">📡</div>
                <h3>Nenhum idoso vinculado</h3>
                <p>Vincule um idoso para acompanhar medicamentos e alertas em tempo real.</p>
              </div>
            )}
          </div>
        </section>

        <section className="caregiver-reports-panel">
          <div className="caregiver-live-header">
            <div>
              <h2>Relatórios de tratamento</h2>
              <p>Resumo semanal e mensal gerado automaticamente para cada idoso vinculado.</p>
            </div>
          </div>

          <div className="caregiver-report-list">
            {reportCards.map((report) => (
              <article key={report.cpf} className="caregiver-report-card">
                <h3>{report.name}</h3>
                <div className="report-period-grid">
                  {[
                    ['Semanal', report.weekly],
                    ['Mensal', report.monthly]
                  ].map(([label, data]) => (
                    <div key={label} className="report-period-card">
                      <div className="report-period-title">{label}</div>
                      <div className="report-score">{data?.adherenceRate || 0}%</div>
                      <div className="report-stats">
                        <span>Tomadas: {data?.takenDoses || 0}</span>
                        <span>Não tomadas: {data?.missedDoses || 0}</span>
                        <span>Pendentes: {data?.pendingMedications || 0}</span>
                      </div>
                      <div className="report-trend" aria-label={`Evolução ${label.toLowerCase()}`}>
                        {(data?.adherenceTrend || []).slice(-7).map((day) => (
                          <span
                            key={day.date}
                            style={{ height: `${Math.max(8, Number(day.adherence || 0))}%` }}
                            title={`${day.date}: ${day.adherence}%`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}

            {!reportCards.length && !loadingDashboard && (
              <div className="empty-state caregiver-live-empty">
                <div className="empty-icon">%</div>
                <h3>Sem relatórios ainda</h3>
                <p>Os relatórios aparecem quando houver idosos vinculados com medicamentos ativos.</p>
              </div>
            )}
          </div>
        </section>

        <form className="caregiver-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ex.: Tomar remédio do almoço"
            />
          </div>

          <div className="input-group">
            <label>Descrição</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Ex.: Lembrar de tomar com água"
            />
          </div>

          <div className="caregiver-grid">
            <div className="input-group">
              <label>Data</label>
              <input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} />
            </div>

            <div className="input-group">
              <label>Hora</label>
              <input type="time" value={form.time} onChange={(e) => handleChange('time', e.target.value)} />
            </div>

            <div className="input-group">
              <label>Prioridade</label>
              <select className="field-select" value={form.priority} onChange={(e) => handleChange('priority', e.target.value)}>
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="caregiver-actions">
            <button type="submit" className="btn-save-caregiver">
              {editingId ? 'Salvar lembrete' : 'Criar lembrete'}
            </button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar edição
              </button>
            )}
          </div>

          {message && <div className="success-message">{message}</div>}
        </form>

        <section className="caregiver-reminders-list">
          {sortedItems.map((item) => (
            <article key={item.id} className={`caregiver-reminder-card priority-${item.priority}`}>
              <div className="reminder-header">
                <div>
                  <h3>{item.title}</h3>
                  <span className="reminder-date">{item.date} às {item.time}</span>
                </div>
                <span className="priority-badge">{item.priority}</span>
              </div>
              <p>{item.description}</p>
              <div className="reminder-card-actions">
                <button type="button" className="mini-btn" onClick={() => handleEdit(item)}>Editar</button>
                <button type="button" className="mini-btn danger" onClick={() => handleDelete(item.id)}>Excluir</button>
              </div>
            </article>
          ))}

          {sortedItems.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>Nenhum lembrete cadastrado</h3>
              <p>Crie lembretes simples com data, hora e prioridade.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Caregiver
