import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useMedications } from '../context/MedicationContext.jsx'
import { api } from '../services/api.js'
import Header from '../components/Header.jsx'
import './MedicationList.css'

const IDOSO_TABS = [
  { id: 'missed', label: 'Não tomados' },
  { id: 'completed', label: 'Tomados' },
  { id: 'upcoming', label: 'Próximos' }
]

const CAREGIVER_TABS = [
  { id: 'upcoming', label: 'Próximos' },
  { id: 'completed', label: 'Concluídos' },
  { id: 'missed', label: 'Não tomados' }
]

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function minutesFromTime(time = '00:00') {
  const [hours = 0, minutes = 0] = String(time).split(':').map(Number)
  return hours * 60 + minutes
}

function currentMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function splitMedications(medications, isTaken) {
  const nowMinutes = currentMinutes()
  const sorted = [...medications].sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time))

  return sorted.reduce((acc, med) => {
    const taken = typeof isTaken === 'function' ? isTaken(med.id, med.time) : !!med.takenToday
    const isLate = minutesFromTime(med.time) < nowMinutes
    const normalized = { ...med, takenToday: taken }

    if (taken) acc.completed.push(normalized)
    else if (isLate) acc.missed.push(normalized)
    else acc.upcoming.push(normalized)

    return acc
  }, { missed: [], completed: [], upcoming: [] })
}

function TabSwitcher({ tabs, activeTab, onChange }) {
  return (
    <div className="schedule-tabs" role="tablist" aria-label="Categorias de horários">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`schedule-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function SwipePane({ tabs, activeTab, onChange, children }) {
  const [touchStart, setTouchStart] = useState(null)

  const moveTab = (direction) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab)
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), tabs.length - 1)
    onChange(tabs[nextIndex].id)
  }

  return (
    <div
      className="schedule-swipe-pane"
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      onTouchEnd={(event) => {
        if (touchStart === null) return
        const delta = event.changedTouches[0].clientX - touchStart
        if (Math.abs(delta) > 48) moveTab(delta < 0 ? 1 : -1)
        setTouchStart(null)
      }}
    >
      {children}
    </div>
  )
}

function MedicationCard({ med, ownerName, canToggle, isTaken, onToggle, onDelete }) {
  const taken = typeof isTaken === 'function' ? isTaken(med.id, med.time) : !!med.takenToday
  const statusClass = taken ? 'completed-card' : 'pending-card'
  const statusLabel = taken ? 'Tomado' : minutesFromTime(med.time) < currentMinutes() ? 'Não tomado' : 'Próximo'

  return (
    <article className={`med-card ${statusClass}`}>
      {canToggle && (
        <label className="med-checkbox">
          <input
            type="checkbox"
            checked={taken}
            onChange={() => onToggle(med.id, med.time)}
          />
          <span className="checkmark"></span>
        </label>
      )}

      <div className="med-info">
        {ownerName && <div className="med-owner">{ownerName}</div>}
        <div className="med-name">{med.name}</div>
        <div className="med-dose">{med.dose}</div>
        <div className="med-meta">
          <span className={`med-status ${taken ? 'status-completed' : 'status-pending'}`}>{statusLabel}</span>
          <span className="med-next-dose">Horário: {med.time}</span>
          {med.treatmentDays && <span className="med-next-dose">{med.treatmentDays} dia(s)</span>}
        </div>
      </div>

      <div className="med-actions">
        <div className="med-time">{med.time}</div>
        {onDelete && (
          <button type="button" className="delete-btn" onClick={() => onDelete(med)}>
            Remover
          </button>
        )}
      </div>
    </article>
  )
}

function EmptyCategory({ label, caregiver }) {
  return (
    <div className="empty-state schedule-empty">
      <div className="empty-icon">✓</div>
      <h3>Nenhum item em {label.toLowerCase()}</h3>
      <p>{caregiver ? 'Os medicamentos dos idosos vinculados aparecerão aqui.' : 'Sua lista do dia será atualizada automaticamente.'}</p>
    </div>
  )
}

function MedicationList() {
  const { user } = useAuth()
  const { medications, toggleTaken, isTaken, removeMedication } = useMedications()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState(user?.role === 'cuidador' ? 'upcoming' : 'missed')
  const [dashboard, setDashboard] = useState(null)
  const [loadingCaregiver, setLoadingCaregiver] = useState(false)
  const [caregiverError, setCaregiverError] = useState('')

  const isCaregiver = user?.role === 'cuidador'
  const tabs = isCaregiver ? CAREGIVER_TABS : IDOSO_TABS

  useEffect(() => {
    setActiveTab(isCaregiver ? 'upcoming' : 'missed')
  }, [isCaregiver])

  useEffect(() => {
    if (!isCaregiver || !user?.cpf) return

    let mounted = true
    const loadDashboard = async () => {
      setLoadingCaregiver(true)
      setCaregiverError('')
      try {
        const response = await api.getUserDashboard(user.cpf, getTodayKey())
        if (mounted) setDashboard(response)
      } catch (error) {
        if (mounted) setCaregiverError(error.message || 'Nao foi possivel carregar os horarios dos idosos.')
      } finally {
        if (mounted) setLoadingCaregiver(false)
      }
    }

    loadDashboard()
    const interval = setInterval(loadDashboard, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isCaregiver, user?.cpf])

  const ownGroups = useMemo(() => splitMedications(medications, isTaken), [medications, isTaken])
  const caregiverGroups = useMemo(() => {
    const elders = dashboard?.elders || []
    const allMeds = elders.flatMap((elder) => (
      (elder.medications || []).map((medication) => ({
        ...medication,
        ownerName: elder.name,
        ownerCpf: elder.cpf
      }))
    ))
    return splitMedications(allMeds)
  }, [dashboard])

  const groups = isCaregiver ? caregiverGroups : ownGroups
  const activeItems = groups[activeTab] || []
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label || ''

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await removeMedication(deleteTarget.id)
    setDeleting(false)
    if (result?.success) {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="med-list-page">
      <Header title={isCaregiver ? 'Horários dos idosos' : 'Meus horários'} />
      <div className="page-content">
        <div className="med-summary">
          <div className="summary-pill pending">Não tomados: {groups.missed.length}</div>
          <div className="summary-pill completed">Tomados: {groups.completed.length}</div>
          <div className="summary-pill upcoming">Próximos: {groups.upcoming.length}</div>
        </div>

        {isCaregiver && (
          <div className="caregiver-schedule-header">
            <div>
              <strong>{dashboard?.elders?.length || 0} idoso(s) vinculado(s)</strong>
              <span>{loadingCaregiver ? 'Atualizando horários...' : 'Lista atualizada automaticamente'}</span>
            </div>
            <Link to="/perfil" className="quick-link">Cadastrar idoso</Link>
          </div>
        )}

        {caregiverError && <div className="schedule-message">{caregiverError}</div>}

        <TabSwitcher tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <SwipePane tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
          <section className="med-section">
            <h2>{activeLabel}</h2>
            <div className="med-list">
              {activeItems.map((med) => (
                <MedicationCard
                  key={`${med.ownerCpf || user?.cpf}-${med.id}`}
                  med={med}
                  ownerName={isCaregiver ? med.ownerName : ''}
                  canToggle={!isCaregiver}
                  isTaken={!isCaregiver ? isTaken : null}
                  onToggle={toggleTaken}
                  onDelete={!isCaregiver ? setDeleteTarget : null}
                />
              ))}

              {activeItems.length === 0 && (
                <EmptyCategory label={activeLabel} caregiver={isCaregiver} />
              )}
            </div>
          </section>
        </SwipePane>
      </div>

      {deleteTarget && (
        <div className="delete-modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="delete-modal">
            <h3>Remover medicamento?</h3>
            <p>
              O item <strong>{deleteTarget.name}</strong> será excluído permanentemente da lista e dos alertas.
            </p>
            <div className="delete-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </button>
              <button type="button" className="btn-confirm-delete" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? 'Removendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MedicationList
