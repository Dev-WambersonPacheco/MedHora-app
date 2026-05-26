import { useState } from 'react'

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required = true,
  maxLength = 6,
  helpText,
  autoComplete,
  name,
  className = ''
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={`input-group password-field ${className}`.trim()}>
      <label>{label}</label>
      <div className="password-input-wrap">
        <input
          type={visible ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]{1,6}"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          name={name}
        />
        <button
          type="button"
          className="password-visibility-toggle"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          title={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <span aria-hidden>{visible ? '🙈' : '👁️'}</span>
        </button>
      </div>
      {helpText && <small>{helpText}</small>}
    </div>
  )
}

export default PasswordField