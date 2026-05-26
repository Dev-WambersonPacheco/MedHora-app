import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { cancelRoutineAlerts, scheduleRoutineAlert } from '../utils/alerts.js'
import { requestNotificationPermission } from '../utils/notifications.js'
import './Reminders.css'

const STORAGE_KEY = 'medhora_routines_v1'

const ICONS = ['💧', '🍽️', '🏃', '🌙', '🧘', '🚶', '📚', '☀️']
const FREQUENCIES = [
  { value: 'daily', label: 'Diariamente' },
  { value: 'interval', label: 'A cada intervalo' }
]
const INTERVAL_OPTIONS = [2, 3, 4, 6]

function makeId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function emptyForm() {
  return {
    icon: '💧',
    title: '',
    description: '',
    time: '08:00',
    frequency: 'daily',
    repeatEveryHours: 2,
    amount: '',
    unit: ''
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

function Routine() {
  const [items, setItems] = useState(() => loadItems())
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    requestNotificationPermission()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    cancelRoutineAlerts()
    items.forEach((item) => scheduleRoutineAlert(item))
  }, [items])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.title.localeCompare(b.title))
  }, [items])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      icon: item.icon,
      title: item.title,
      description: item.description,
      time: item.time,
      frequency: item.frequency,
      repeatEveryHours: item.repeatEveryHours || 2,
      amount: item.amount || '',
      unit: item.unit || ''
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!form.title.trim() || !form.description.trim()) {
      setMessage('Preencha título e descrição da rotina.')
      return
    }

    const payload = {
      id: editingId || makeId(),
      icon: form.icon,
      title: form.title.trim().toUpperCase(),
      description: form.description.trim(),
      time: form.time,
      frequency: form.frequency,
      repeatEveryHours: form.frequency === 'interval' ? Number(form.repeatEveryHours) : null,
      amount: form.amount.trim(),
      unit: form.unit.trim()
    }

    setItems((prev) => {
      const next = prev.filter((item) => item.id !== payload.id)
      return [...next, payload]
    })

    setMessage(editingId ? 'Rotina atualizada.' : 'Rotina adicionada.')
    resetForm()
  }

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setMessage('Rotina removida.')
  }

  return (
    <div className="routine-page">
      <Header title="ROTINA" />
      <div className="page-content">
        <section className="routine-hero">
          <div>
            <h2>Hábitos do dia</h2>
            <p>Cadastre água, refeições, exercícios, descanso e o que mais fizer parte da rotina.</p>
          </div>
          <div className="routine-hero-badge">Notificações automáticas</div>
        </section>

        <form className="routine-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Ícone do hábito</label>
            <div className="icon-grid">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-chip ${form.icon === icon ? 'active' : ''}`}
                  onClick={() => handleChange('icon', icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ex.: Beber água"
            />
          </div>

          <div className="input-group">
            <label>Descrição</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Ex.: 2 copos ao acordar e antes do almoço"
            />
          </div>

          <div className="routine-grid">
            <div className="input-group">
              <label>Frequência</label>
              <select className="field-select" value={form.frequency} onChange={(e) => handleChange('frequency', e.target.value)}>
                {FREQUENCIES.map((frequency) => (
                  <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Horário</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => handleChange('time', e.target.value)}
              />
            </div>

            {form.frequency === 'interval' && (
              <div className="input-group">
                <label>Intervalo</label>
                <select
                  className="field-select"
                  value={form.repeatEveryHours}
                  onChange={(e) => handleChange('repeatEveryHours', e.target.value)}
                >
                  {INTERVAL_OPTIONS.map((hours) => (
                    <option key={hours} value={hours}>{`A cada ${hours} horas`}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="input-group">
              <label>Quantidade</label>
              <input
                type="text"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="Ex.: 2"
              />
            </div>

            <div className="input-group">
              <label>Unidade</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                placeholder="Ex.: copos"
              />
            </div>
          </div>

          <div className="routine-actions">
            <button type="submit" className="btn-primary">
              {editingId ? 'Salvar alteração' : 'Adicionar rotina'}
            </button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar edição
              </button>
            )}
          </div>

          {message && <div className="routine-message">{message}</div>}
        </form>

        <section className="routine-cards">
          {sortedItems.map((item) => (
            <article key={item.id} className="routine-card">
              <div className="routine-card-icon">{item.icon}</div>
              <div className="routine-card-body">
                <div className="routine-card-top">
                  <h3>{item.title}</h3>
                  <span className="routine-frequency">
                    {item.frequency === 'daily' ? 'Diariamente' : `A cada ${item.repeatEveryHours} horas`}
                  </span>
                </div>
                <p>{item.description}</p>
                <div className="routine-meta">
                  <span>⏰ {item.time}</span>
                  {item.amount && item.unit && <span>💡 {item.amount} {item.unit}</span>}
                </div>
              </div>
              <div className="routine-card-actions">
                <button type="button" className="mini-btn" onClick={() => handleEdit(item)}>Editar</button>
                <button type="button" className="mini-btn danger" onClick={() => handleDelete(item.id)}>Excluir</button>
              </div>
            </article>
          ))}

          {sortedItems.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>Nenhuma rotina cadastrada</h3>
              <p>Adicione hábitos para receber alertas automáticos.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Routine