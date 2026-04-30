import Header from '../components/Header.jsx'
import './Reminders.css'

const reminders = [
  {
    id: 1,
    icon: '💧',
    title: 'TOMAR ÁGUA',
    desc: 'Beba água a cada 2 horas',
    color: '#00bcd4',
    frequency: '2x ao dia'
  },
  {
    id: 2,
    icon: '🍎',
    title: 'ALIMENTAR-SE',
    desc: 'Café, almoço e jantar',
    color: '#ff9800',
    frequency: '3x ao dia'
  },
  {
    id: 3,
    icon: '☀️',
    title: 'CAMINHAR',
    desc: 'Caminhar 20 minutos pela manhã',
    color: '#ffeb3b',
    frequency: '1x ao dia'
  },
  {
    id: 4,
    icon: '🌙',
    title: 'HORA DE DORMIR',
    desc: 'Dormir antes das 22h',
    color: '#9c27b0',
    frequency: '1x ao dia'
  }
]

function Reminders() {
  return (
    <div className="reminders-page">
      <Header title="Lembretes" />
      <div className="page-content">
        <div className="reminders-grid">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="reminder-card" style={{ '--card-color': reminder.color }}>
              <div className="reminder-icon">{reminder.icon}</div>
              <div className="reminder-title">{reminder.title}</div>
              <div className="reminder-desc">{reminder.desc}</div>
              <div className="reminder-frequency">{reminder.frequency}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Reminders
