import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
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
  const [items, setItems] = useState(() => loadItems())
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    requestNotificationPermission()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    cancelReminderAlerts()
    items.forEach((item) => scheduleReminderAlert(item))
  }, [items])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [items])

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
              <select value={form.priority} onChange={(e) => handleChange('priority', e.target.value)}>
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