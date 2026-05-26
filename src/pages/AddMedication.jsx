import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMedications } from '../context/MedicationContext.jsx'
import Header from '../components/Header.jsx'
import { api } from '../services/api.js'
import './AddMedication.css'

const DEFAULT_TIME = '08:00'
const UNIT_OPTIONS = [
  'mg',
  'ml',
  'g',
  'UI',
  'comprimido(s)',
  'gota(s)',
  'cápsula(s)',
  'unidade(s)'
]

const INTERVAL_PRESETS = [
  { id: '12h', label: 'A cada 12 horas', hours: 12 },
  { id: '8h', label: 'A cada 8 horas', hours: 8 },
  { id: '6h', label: 'A cada 6 horas', hours: 6 }
]

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function generateIntervalTimes(startTime, intervalHours) {
  const [hours = 0, minutes = 0] = String(startTime || DEFAULT_TIME)
    .split(':')
    .map((value) => Number(value))

  const base = new Date()
  base.setHours(hours, minutes, 0, 0)

  const totalSlots = Math.max(1, Math.round(24 / intervalHours))
  return Array.from({ length: totalSlots }, (_, index) => {
    const next = new Date(base.getTime() + index * intervalHours * 60 * 60 * 1000)
    return formatTime(next)
  })
}

function AddMedication() {
  const [form, setForm] = useState({
    name: '',
    amount: '',
    unit: '',
    baseTime: DEFAULT_TIME
  })
  const [selectedMedication, setSelectedMedication] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [intervalPreset, setIntervalPreset] = useState('')
  const [scheduleTouched, setScheduleTouched] = useState(false)
  const [timeEntries, setTimeEntries] = useState([{ id: makeId(), time: DEFAULT_TIME }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { addMedication } = useMedications()

  useEffect(() => {
    const query = form.name.trim()

    if (query.length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      setSearching(true)
      api.searchMedicines(query)
        .then((response) => {
          if (!controller.signal.aborted) {
            setSuggestions(response.medications || [])
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            console.error('Erro ao buscar medicamentos:', error)
            setSuggestions([])
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSearching(false)
          }
        })
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [form.name])

  useEffect(() => {
    if (!selectedMedication) return
    setForm((prev) => ({
      ...prev,
      amount: '',
      unit: ''
    }))
  }, [selectedMedication])

  useEffect(() => {
    if (!intervalPreset || scheduleTouched) return
    const preset = INTERVAL_PRESETS.find((item) => item.id === intervalPreset)
    if (!preset) return
    const generatedTimes = generateIntervalTimes(form.baseTime, preset.hours)
    setTimeEntries(generatedTimes.map((time) => ({ id: makeId(), time })))
  }, [form.baseTime, intervalPreset, scheduleTouched])

  const applyMedication = (medication) => {
    setSelectedMedication(medication)
    setShowSuggestions(false)
    setForm((prev) => ({
      ...prev,
      name: medication.name,
      amount: '',
      unit: ''
    }))
  }

  const handleNameChange = (value) => {
    setForm((prev) => ({ ...prev, name: value.toUpperCase(), amount: '', unit: '' }))
    setSelectedMedication(null)
    setShowSuggestions(true)
  }

  const handleAmountChange = (value) => {
    const nextValue = value.replace(/[^0-9.]/g, '')
    const parts = nextValue.split('.')
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : nextValue
    setForm((prev) => ({ ...prev, amount: sanitized }))
  }

  const handleUnitSelect = (unit) => {
    setForm((prev) => ({ ...prev, unit }))
    setUnitModalOpen(false)
  }

  const handlePresetSelect = (preset) => {
    setIntervalPreset(preset.id)
    setScheduleTouched(false)
    setTimeEntries(generateIntervalTimes(form.baseTime, preset.hours).map((time) => ({ id: makeId(), time })))
  }

  const handleBaseTimeChange = (value) => {
    setForm((prev) => ({ ...prev, baseTime: value }))
  }

  const handleTimeChange = (id, value) => {
    setScheduleTouched(true)
    setTimeEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, time: value } : entry)))
  }

  const addTimeRow = () => {
    setScheduleTouched(true)
    setTimeEntries((prev) => [...prev, { id: makeId(), time: '' }])
  }

  const removeTimeRow = (id) => {
    setScheduleTouched(true)
    setTimeEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id)
      return next.length > 0 ? next : [{ id: makeId(), time: '' }]
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const times = timeEntries.map((entry) => entry.time.trim()).filter(Boolean)
    const amount = String(form.amount || '').trim()
    const unit = String(form.unit || '').trim()

    if (times.length === 0) {
      setLoading(false)
      setError('Adicione pelo menos um horário válido.')
      return
    }

    if (!amount || !unit) {
      setLoading(false)
      setError('Informe a quantidade e a unidade da dose.')
      return
    }
    
    try {
      await addMedication({
        name: form.name.trim().toUpperCase(),
        amount,
        unit,
        times
      })
      navigate('/horarios')
    } catch (error) {
      console.error('Erro ao adicionar:', error)
      setError(error.message || 'Nao foi possivel adicionar o medicamento.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="add-med-page">
      <Header title="ADICIONAR MEDICAMENTO" />
      <div className="page-content">
        <form onSubmit={handleSubmit} className="add-med-form">
          <div className="input-group">
            <label>Nome do Medicamento:</label>
            <div className="autocomplete-wrap">
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Ex: SINVASTATINA"
                autoComplete="off"
                required
                disabled={loading}
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-list" role="listbox" aria-label="Sugestões de medicamentos">
                  {suggestions.map((medication) => (
                    <button
                      key={medication.id}
                      type="button"
                      className="suggestion-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyMedication(medication)}
                    >
                      <strong>{medication.name}</strong>
                      <span>
                        {medication.activeIngredient || 'Princípio ativo não informado'}
                        {medication.status ? ` • ${medication.status}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showSuggestions && form.name && searching && (
                <div className="suggestions-list empty" aria-live="polite">
                  Buscando na base oficial da ANVISA...
                </div>
              )}

              {showSuggestions && form.name && !searching && suggestions.length === 0 && (
                <div className="suggestions-list empty" aria-live="polite">
                  Nenhuma sugestão encontrada para a busca atual.
                </div>
              )}
            </div>
          </div>

          <div className="input-group">
            <label>Dose:</label>
            <div className="dose-inline-group">
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="500"
                required
                disabled={loading}
                aria-label="Quantidade da dose"
              />

              <button
                type="button"
                className="unit-trigger"
                onClick={() => setUnitModalOpen(true)}
                disabled={loading}
              >
                {form.unit || 'Unidade'}
              </button>
            </div>

            <div className="dose-preview" aria-live="polite">
              {form.amount && form.unit ? `${form.amount} ${form.unit}` : 'Ex.: 500 mg'}
            </div>
          </div>

          <div className="input-group">
            <label>Horários:</label>
            <div className="schedule-presets">
              {INTERVAL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-chip ${intervalPreset === preset.id ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                  disabled={loading}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="time-grid-header">
              <label>Hora inicial:</label>
              <input
                type="time"
                value={form.baseTime}
                onChange={(e) => handleBaseTimeChange(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="time-table" aria-label="Horários configurados">
              {timeEntries.map((entry, index) => (
                <div className="time-row" key={entry.id}>
                  <span className="time-index">{index + 1}</span>
                  <input
                    type="time"
                    value={entry.time}
                    onChange={(e) => handleTimeChange(entry.id, e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="remove-time-btn"
                    onClick={() => removeTimeRow(entry.id)}
                    disabled={loading || timeEntries.length === 1}
                    aria-label={`Remover horário ${index + 1}`}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="add-time-btn" onClick={addTimeRow} disabled={loading}>
              + Adicionar horário
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Adicionando...' : 'ADICIONAR'}
          </button>
        </form>
      </div>

      {unitModalOpen && (
        <div className="unit-modal-backdrop" role="dialog" aria-modal="true" aria-label="Selecionar unidade">
          <div className="unit-modal">
            <div className="unit-modal-header">
              <h3>Selecionar unidade</h3>
              <button type="button" className="unit-modal-close" onClick={() => setUnitModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="unit-modal-grid">
              {UNIT_OPTIONS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={`unit-option ${form.unit === unit ? 'active' : ''}`}
                  onClick={() => handleUnitSelect(unit)}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddMedication
