function ProfileTypeToggle({ value, onChange, disabled = false }) {
  return (
    <div className="profile-toggle" role="group" aria-label="Tipo de perfil">
      <button
        type="button"
        className={`profile-toggle-option ${value === 'idoso' ? 'active' : ''}`}
        aria-pressed={value === 'idoso'}
        onClick={() => onChange('idoso')}
        disabled={disabled}
      >
        Idoso
      </button>
      <button
        type="button"
        className={`profile-toggle-option ${value === 'cuidador' ? 'active' : ''}`}
        aria-pressed={value === 'cuidador'}
        onClick={() => onChange('cuidador')}
        disabled={disabled}
      >
        Cuidador
      </button>
    </div>
  )
}

export default ProfileTypeToggle