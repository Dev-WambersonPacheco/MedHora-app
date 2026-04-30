import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMedications } from '../context/MedicationContext.jsx'
import Header from '../components/Header.jsx'
import './AddMedication.css'

function AddMedication() {
  const [form, setForm] = useState({
    name: '',
    dose: '',
    time: '12:00'
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { addMedication } = useMedications()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await addMedication(form)
      navigate('/horarios')
    } catch (error) {
      console.error('Erro ao adicionar:', error)
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
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value.toUpperCase())}
              placeholder="Ex: SINVASTATINA"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Dose:</label>
            <input
              type="text"
              value={form.dose}
              onChange={(e) => handleChange('dose', e.target.value.toUpperCase())}
              placeholder="Ex: 1 CÁPSULA"
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Horário:</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => handleChange('time', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Adicionando...' : 'ADICIONAR'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddMedication
