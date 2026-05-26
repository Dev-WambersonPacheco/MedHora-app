import { useMemo, useState } from 'react'
import { useMedications } from '../context/MedicationContext.jsx'
import Header from '../components/Header.jsx'
import './MedicationList.css'

function MedicationList() {
  const { medications, toggleTaken, isTaken, removeMedication } = useMedications()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const medsByTime = useMemo(() => [...medications].sort((a, b) => {
    const timeA = a.time.split(':').reduce((acc, t, i) => acc + parseInt(t) * Math.pow(60, 1-i), 0)
    const timeB = b.time.split(':').reduce((acc, t, i) => acc + parseInt(t) * Math.pow(60, 1-i), 0)
    return timeA - timeB
  }), [medications])

  const pendingMeds = medsByTime.filter((med) => !isTaken(med.id, med.time))
  const completedMeds = medsByTime.filter((med) => isTaken(med.id, med.time))

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
      <Header title="Medicamentos pendentes" />
      <div className="page-content">
        <div className="med-summary">
          <div className="summary-pill pending">Pendentes: {pendingMeds.length}</div>
          <div className="summary-pill completed">Concluídos: {completedMeds.length}</div>
        </div>

        <section className="med-section">
          <h2>Pendentes</h2>
          <div className="med-list">
            {pendingMeds.map((med) => (
              <article key={med.id} className="med-card pending-card">
                <label className="med-checkbox">
                  <input
                    type="checkbox"
                    checked={isTaken(med.id, med.time)}
                    onChange={() => toggleTaken(med.id, med.time)}
                  />
                  <span className="checkmark"></span>
                </label>
                <div className="med-info">
                  <div className="med-name">{med.name}</div>
                  <div className="med-dose">{med.dose}</div>
                  <div className="med-meta">
                    <span className="med-status status-pending">Pendente</span>
                    <span className="med-next-dose">Próxima dose: {med.time}</span>
                  </div>
                </div>
                <div className="med-actions">
                  <div className="med-time">{med.time}</div>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => setDeleteTarget(med)}
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}

            {pendingMeds.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3>Nenhum medicamento pendente</h3>
                <p>Você concluiu todos os medicamentos de hoje</p>
              </div>
            )}
          </div>
        </section>

        {completedMeds.length > 0 && (
          <section className="med-section">
            <h2>Concluídos</h2>
            <div className="med-list">
              {completedMeds.map((med) => (
                <article key={med.id} className="med-card completed-card">
                  <label className="med-checkbox">
                    <input
                      type="checkbox"
                      checked={isTaken(med.id, med.time)}
                      onChange={() => toggleTaken(med.id, med.time)}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <div className="med-info">
                    <div className="med-name">{med.name}</div>
                    <div className="med-dose">{med.dose}</div>
                    <div className="med-meta">
                      <span className="med-status status-completed">Concluído</span>
                      <span className="med-next-dose">Último horário: {med.time}</span>
                    </div>
                  </div>
                  <div className="med-actions">
                    <div className="med-time">{med.time}</div>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => setDeleteTarget(med)}
                    >
                      Remover
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
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
