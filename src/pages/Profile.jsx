import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Header from '../components/Header.jsx'
import { api } from '../services/api.js'
import './Profile.css'
import { formatCpf } from '../utils/cpf.js'

function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [identifier, setIdentifier] = useState('')
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [linking, setLinking] = useState(false)
  const [message, setMessage] = useState('')

  const role = user?.role || 'idoso'
  const isCaregiver = role === 'cuidador'

  const loadDashboard = async () => {
    if (!user) return

    setLoadingDashboard(true)
    try {
      const response = await api.getUserDashboard(user.cpf)
      setDashboard(response)
    } catch (error) {
      setMessage(error.message || 'Nao foi possivel carregar os vinculos.')
    } finally {
      setLoadingDashboard(false)
    }
  }

  useEffect(() => {
    if (!user) return

    loadDashboard()
    const interval = setInterval(loadDashboard, 15000)
    return () => clearInterval(interval)
  }, [user?.cpf])

  const connections = useMemo(() => {
    if (!dashboard) return []
    return isCaregiver ? dashboard.elders || [] : dashboard.caregivers || []
  }, [dashboard, isCaregiver])

  const summary = dashboard?.summary || {}

  const handleLogout = () => {
    logout()
  }

  const handleEdit = () => {
    navigate('/perfil/editar')
  }

  const handleLink = async (event) => {
    event.preventDefault()
    if (!identifier.trim() || !user) return

    setLinking(true)
    setMessage('')
    try {
      await api.linkUserProfile(user.cpf, identifier.trim())
      setIdentifier('')
      setMessage(isCaregiver ? 'Idoso vinculado com sucesso.' : 'Cuidador vinculado com sucesso.')
      await loadDashboard()
    } catch (error) {
      setMessage(error.message || 'Nao foi possivel criar o vinculo.')
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async (linkedCpf) => {
    if (!user) return

    setLinking(true)
    setMessage('')
    try {
      await api.unlinkUserProfile(user.cpf, linkedCpf)
      setMessage('Vinculo removido com sucesso.')
      await loadDashboard()
    } catch (error) {
      setMessage(error.message || 'Nao foi possivel remover o vinculo.')
    } finally {
      setLinking(false)
    }
  }

  if (!user) return null

  const connectionLabel = isCaregiver ? 'Idosos acompanhados' : 'Cuidadores vinculados'
  const linkHelper = isCaregiver
    ? 'Adicione um idoso por CPF, e-mail ou código de convite.'
    : 'Adicione um cuidador por CPF, e-mail ou código de convite.'
  const linkPlaceholder = isCaregiver
    ? 'CPF, e-mail ou código do idoso'
    : 'CPF, e-mail ou código do cuidador'
  const linkButtonLabel = isCaregiver ? 'Adicionar idoso' : 'Adicionar cuidador'

  return (
    <div className="profile-page">
      <Header title="MEU PERFIL" />
      <div className="page-content">
        <div className="profile-card">
          <div className="profile-avatar">{isCaregiver ? '🧑‍⚕️' : '👵'}</div>
          <div className="profile-details">
            <div className="profile-badges">
              <span className="profile-role-badge">{isCaregiver ? 'Cuidador' : 'Idoso'}</span>
              {dashboard?.user?.inviteCode && (
                <span className="profile-code-badge">Código: {dashboard.user.inviteCode}</span>
              )}
            </div>
            <h1>{user.name}</h1>
            <div className="profile-cpf">
              CPF: {formatCpf(user.cpf)}
            </div>
            <div className="profile-meta">
              <span>Permissão: {isCaregiver ? 'Acompanha múltiplos idosos' : 'Pode vincular cuidadores'}</span>
              {summary.pendingMedications !== undefined && (
                <span>Medicamentos pendentes: {isCaregiver ? summary.linkedPendingMedications || 0 : summary.pendingMedications || 0}</span>
              )}
            </div>
          </div>
        </div>

        <section className="profile-connections-card">
          <div className="connections-header">
            <div>
              <h2>{connectionLabel}</h2>
              <p>{linkHelper}</p>
            </div>
            <div className="connections-summary">
              <strong>{connections.length}</strong>
              <span>vínculo(s)</span>
            </div>
          </div>

          <form className="connection-form" onSubmit={handleLink}>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={linkPlaceholder}
              disabled={linking}
            />
            <button type="submit" className="btn-link" disabled={linking || !identifier.trim()}>
              {linkButtonLabel}
            </button>
          </form>

          {message && <div className="profile-message">{message}</div>}
          {loadingDashboard && <div className="profile-loading">Atualizando vínculos...</div>}

          <div className="connections-list">
            {connections.map((connection) => (
              <article key={connection.cpf} className="connection-card">
                <div className="connection-card-main">
                  <div className="connection-avatar">{connection.name?.charAt(0) || 'U'}</div>
                  <div>
                    <h3>{connection.name}</h3>
                    <p>CPF: {formatCpf(connection.cpf)}</p>
                    {connection.email && <p>Email: {connection.email}</p>}
                    {connection.inviteCode && <p>Código: {connection.inviteCode}</p>}
                  </div>
                </div>
                <div className="connection-stats">
                  <span>Pendentes: {connection.pendingMedications || 0}</span>
                  <span>Concluídos: {connection.completedMedications || 0}</span>
                  <span>Total: {connection.medicationCount || 0}</span>
                </div>
                <button
                  type="button"
                  className="btn-unlink"
                  onClick={() => handleUnlink(connection.cpf)}
                  disabled={linking}
                >
                  Desvincular
                </button>
              </article>
            ))}

            {connections.length === 0 && (
              <div className="empty-state profile-empty-state">
                <div className="empty-icon">🔗</div>
                <h3>Nenhum vínculo cadastrado</h3>
                <p>Use o código de convite, CPF ou e-mail para conectar este perfil.</p>
              </div>
            )}
          </div>
        </section>

        <div className="profile-actions">
          <button className="btn-edit" onClick={handleEdit}>
            ✏️ EDITAR PERFIL
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 SAIR
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile
