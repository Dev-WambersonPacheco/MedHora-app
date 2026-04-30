import Header from '../components/Header.jsx'
import './Caregiver.css'

function Caregiver() {
  return (
    <div className="caregiver-page">
      <Header title="MEU CUIDADOR" />
      <div className="page-content">
        <div className="caregiver-profile">
          <div className="profile-avatar">👩</div>
          <div className="profile-info">
            <h1>MARIA OLIVEIRA</h1>
            <p className="profile-role">Cuidadora Responsável</p>
          </div>
        </div>

        <div className="contact-section">
          <h2>INFORMAÇÕES DE CONTATO</h2>
          
          <div className="contact-item">
            <div className="contact-icon">📞</div>
            <div className="contact-details">
              <div className="contact-label">Telefone:</div>
              <div className="contact-value">(92) 98765-4321</div>
            </div>
          </div>

          <div className="contact-item">
            <div className="contact-icon">✉️</div>
            <div className="contact-details">
              <div className="contact-label">Email:</div>
              <div className="contact-value">maria.oliveira@gmail.com</div>
            </div>
          </div>

          <div className="contact-item">
            <div className="contact-icon">📍</div>
            <div className="contact-details">
              <div className="contact-label">Endereço:</div>
              <div className="contact-value">Itacoatiara - AM</div>
            </div>
          </div>
        </div>

        <button className="btn-call">
          📞 LIGAR AGORA
        </button>
      </div>
    </div>
  )
}

export default Caregiver
