import { useMedications } from '../context/MedicationContext.jsx'
import Header from '../components/Header.jsx'
import './MedicationList.css'

function MedicationList() {
  const { medications, toggleTaken, isTaken } = useMedications()

  const medsByTime = medications.sort((a, b) => {
    const timeA = a.time.split(':').reduce((acc, t, i) => acc + parseInt(t) * Math.pow(60, 1-i), 0)
    const timeB = b.time.split(':').reduce((acc, t, i) => acc + parseInt(t) * Math.pow(60, 1-i), 0)
    return timeA - timeB
  })

  return (
    <div className="med-list-page">
      <Header title="Lista de Medicamento" />
      <div className="page-content">
        <div className="med-list">
          {medsByTime.map((med) => (
            <div key={med.id} className="med-card">
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
              </div>
              <div className="med-time">{med.time}</div>
            </div>
          ))}
          
          {medsByTime.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💊</div>
              <h3>Nenhum medicamento cadastrado</h3>
              <p>Adicione seu primeiro medicamento para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MedicationList
