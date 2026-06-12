import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../services/api.js'
import { cancelRoutineAlerts, scheduleRoutineAlert } from '../utils/alerts.js'
import { requestNotificationPermission } from '../utils/notifications.js'
import './Reminders.css'

const CATEGORIES = [
  { value: 'agua', label: 'Agua', mark: 'AG' },
  { value: 'refeicao', label: 'Refeicao', mark: 'RF' },
  { value: 'movimento', label: 'Movimento', mark: 'MV' },
  { value: 'sono', label: 'Sono', mark: 'SN' },
  { value: 'bem-estar', label: 'Bem-estar', mark: 'BE' },
  { value: 'caminhada', label: 'Caminhada', mark: 'CM' },
  { value: 'leitura', label: 'Leitura', mark: 'LT' },
  { value: 'sol', label: 'Sol', mark: 'SL' }
]

const FREQUENCIES = [
  { value: 'daily', label: 'Todo dia' },
  { value: 'interval', label: 'Por intervalo' }
]

const INTERVAL_OPTIONS = [2, 3, 4, 6]

function makeId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function emptyForm() {
  return {
    category: 'agua',
    title: '',
    description: '',
    time: '08:00',
    frequency: 'daily',
    repeatEveryHours: 2,
    amount: '',
    unit: ''
  }
}

function minutesFromTime(time = '00:00') {
  const [hours = 0, minutes = 0] = String(time).split(':').map(Number)
  return hours * 60 + minutes
}

function getCategory(value) {
  return CATEGORIES.find((category) => category.value === value) || CATEGORIES[0]
}

function Routine() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    requestNotificationPermission()
    cancelRoutineAlerts()
    items.forEach((item) => scheduleRoutineAlert(item))
  }, [items])

  useEffect(() => {
    if (!user?.cpf) {
      setItems([])
      return
    }

    let mounted = true

    api.getRoutines(user.cpf)
      .then((response) => {
        if (mounted) {
          setItems(response.routines || [])
          setError('')
        }
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Nao foi possivel carregar as rotinas.')
      })

    return () => {
      mounted = false
    }
  }, [user?.cpf])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time))
  }, [items])

  const summary = useMemo(() => {
    const intervalCount = items.filter((item) => item.frequency === 'interval').length
    return {
      total: items.length,
      daily: items.length - intervalCount,
      interval: intervalCount
    }
  }, [items])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      category: item.category || item.icon || 'agua',
      title: item.title,
      description: item.description,
      time: item.time,
      frequency: item.frequency,
      repeatEveryHours: item.repeatEveryHours || 2,
      amount: item.amount || '',
      unit: item.unit || ''
    })
    setFormOpen(true)
    setMessage('')
    setError('')
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormOpen(false)
    setMessage('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.title.trim() || !form.description.trim()) {
      setMessage('Preencha titulo e descricao da rotina.')
      return
    }

    if (!user?.cpf) {
      setError('Usuario nao autenticado.')
      return
    }

    const payload = {
      id: editingId || makeId(),
      category: form.category,
      icon: form.category,
      title: form.title.trim().toUpperCase(),
      description: form.description.trim(),
      time: form.time,
      frequency: form.frequency,
      repeatEveryHours: form.frequency === 'interval' ? Number(form.repeatEveryHours) : null,
      amount: form.amount.trim(),
      unit: form.unit.trim()
    }

    setSaving(true)
    setError('')

    try {
      const response = await api.saveRoutine(user.cpf, payload)
      const saved = response.routine
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== saved.id)
        return [...next, saved]
      })
      setMessage(editingId ? 'Rotina atualizada.' : 'Rotina adicionada.')
      setEditingId(null)
      setForm(emptyForm())
      setFormOpen(false)
    } catch (saveError) {
      setError(saveError.message || 'Nao foi possivel salvar a rotina.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!user?.cpf) return

    try {
      await api.deleteRoutine(user.cpf, id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setMessage('Rotina removida.')
    } catch (deleteError) {
      setError(deleteError.message || 'Nao foi possivel remover a rotina.')
    }
  }

  return (
    <div className="routine-page">
      <Header title="ROTINA" />
      <div className="page-content">
        <section className="routine-summary">
          <div>
            <span className="routine-eyebrow">Plano diario</span>
            <h2>Rotina do dia</h2>
          </div>
          <div className="routine-summary-grid">
            <div>
              <strong>{summary.total}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{summary.daily}</strong>
              <span>Diarias</span>
            </div>
            <div>
              <strong>{summary.interval}</strong>
              <span>Intervalo</span>
            </div>
          </div>
        </section>

        {message && <div className="routine-message routine-page-message">{message}</div>}
        {error && <div className="routine-message routine-page-message">{error}</div>}

        <section className="routine-list-section">
          <div className="routine-list-header">
            <div>
              <h2>Rotinas cadastradas</h2>
              <p>{sortedItems.length ? 'Ordenadas pelo horario inicial.' : 'Nenhuma rotina ativa.'}</p>
            </div>
            <button
              type="button"
              className="routine-new-btn"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm())
                setFormOpen(true)
                setMessage('')
                setError('')
              }}
            >
              Nova rotina
            </button>
          </div>

          <div className="routine-cards">
            {sortedItems.map((item) => {
              const category = getCategory(item.category || item.icon)
              return (
                <article key={item.id} className="routine-card">
                  <div className="routine-card-icon">{category.mark}</div>
                  <div className="routine-card-body">
                    <div className="routine-card-top">
                      <div>
                        <span className="routine-category">{category.label}</span>
                        <h3>{item.title}</h3>
                      </div>
                      <span className="routine-time">{item.time}</span>
                    </div>
                    <p>{item.description}</p>
                    <div className="routine-meta">
                      <span>{item.frequency === 'daily' ? 'Todo dia' : `A cada ${item.repeatEveryHours} horas`}</span>
                      {item.amount && item.unit && <span>{item.amount} {item.unit}</span>}
                    </div>
                  </div>
                  <div className="routine-card-actions">
                    <button type="button" className="mini-btn" onClick={() => handleEdit(item)}>Editar</button>
                    <button type="button" className="mini-btn danger" onClick={() => handleDelete(item.id)}>Excluir</button>
                  </div>
                </article>
              )
            })}

            {sortedItems.length === 0 && (
              <div className="empty-state routine-empty">
                <div className="empty-icon">+</div>
                <h3>Nenhuma rotina cadastrada</h3>
                <p>Adicione habitos para receber alertas automaticos.</p>
              </div>
            )}
          </div>
        </section>

        {formOpen && (
          <div className="routine-modal-backdrop" role="dialog" aria-modal="true" aria-label={editingId ? 'Editar rotina' : 'Nova rotina'}>
            <form className="routine-form routine-modal" onSubmit={handleSubmit}>
              <div className="routine-form-header">
                <div>
                  <h2>{editingId ? 'Editar rotina' : 'Nova rotina'}</h2>
                  <p>Defina o habito, horario e repeticao.</p>
                </div>
                <button type="button" className="routine-close-btn" onClick={resetForm} aria-label="Fechar">
                  x
                </button>
              </div>

              <fieldset className="routine-fieldset">
                <legend>Tipo</legend>
                <div className="category-grid">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      className={`category-chip ${form.category === category.value ? 'active' : ''}`}
                      onClick={() => handleChange('category', category.value)}
                    >
                      <span>{category.mark}</span>
                      {category.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="routine-form-block">
                <div className="input-group">
                  <label>Titulo</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Ex.: Beber agua"
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label>Descricao</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Ex.: 2 copos ao acordar"
                  />
                </div>
              </div>

              <div className="routine-grid">
                <div className="input-group">
                  <label>Frequencia</label>
                  <select className="field-select" value={form.frequency} onChange={(e) => handleChange('frequency', e.target.value)}>
                    {FREQUENCIES.map((frequency) => (
                      <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Horario inicial</label>
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
                    inputMode="decimal"
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

              <button type="submit" className="routine-submit" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar alteracao' : 'Adicionar rotina'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default Routine
