const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const SESSION_KEY = 'medhora_session'

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const session = typeof sessionStorage !== 'undefined' ? readSession() : null
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { 'x-medhora-token': session.token } : {}),
        ...(options.headers || {})
      },
      ...options
    })
  } catch {
    throw new Error('Nao foi possivel conectar ao servidor. Verifique se a API esta ligada e se este dispositivo esta na mesma rede.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = payload?.error || 'Erro de comunicacao com o servidor.'
    throw new Error(message)
  }

  return payload
}

export const api = {
  login(cpf, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ cpf, password })
    })
  },

  register(data) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  logout() {
    return request('/auth/logout', {
      method: 'POST'
    })
  },

  updateUser(cpf, updates) {
    return request(`/users/${cpf}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  },

  getUserDashboard(cpf, dayKey) {
    const query = new URLSearchParams(dayKey ? { dayKey } : {})
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request(`/users/${cpf}/dashboard${suffix}`)
  },

  getTreatmentReport(cpf, period = 'weekly') {
    const query = new URLSearchParams({ period })
    return request(`/users/${cpf}/reports?${query.toString()}`)
  },

  linkUserProfile(cpf, identifier) {
    return request(`/users/${cpf}/relations/link`, {
      method: 'POST',
      body: JSON.stringify({ identifier })
    })
  },

  unlinkUserProfile(cpf, linkedCpf) {
    return request(`/users/${cpf}/relations/${linkedCpf}`, {
      method: 'DELETE'
    })
  },

  getMedications(cpf, dayKey) {
    const query = new URLSearchParams({ dayKey })
    return request(`/users/${cpf}/medications?${query.toString()}`)
  },

  getCaregiverReminders(cpf) {
    return request(`/users/${cpf}/caregiver-reminders`)
  },

  saveCaregiverReminder(cpf, reminder) {
    return request(`/users/${cpf}/caregiver-reminders`, {
      method: 'POST',
      body: JSON.stringify(reminder)
    })
  },

  deleteCaregiverReminder(cpf, reminderId) {
    return request(`/users/${cpf}/caregiver-reminders/${reminderId}`, {
      method: 'DELETE'
    })
  },

  getRoutines(cpf) {
    return request(`/users/${cpf}/routines`)
  },

  saveRoutine(cpf, routine) {
    return request(`/users/${cpf}/routines`, {
      method: 'POST',
      body: JSON.stringify(routine)
    })
  },

  deleteRoutine(cpf, routineId) {
    return request(`/users/${cpf}/routines/${routineId}`, {
      method: 'DELETE'
    })
  },

  searchMedicines(query) {
    const params = new URLSearchParams({ q: query })
    return request(`/medications/search?${params.toString()}`)
  },

  createMedication(cpf, medication) {
    return request(`/users/${cpf}/medications`, {
      method: 'POST',
      body: JSON.stringify(medication)
    })
  },

  deleteMedication(cpf, medicationId) {
    return request(`/users/${cpf}/medications/${medicationId}`, {
      method: 'DELETE'
    })
  },

  toggleMedicationTaken(cpf, medicationId, dayKey) {
    return request(`/users/${cpf}/medications/${medicationId}/toggle-taken`, {
      method: 'POST',
      body: JSON.stringify({ dayKey })
    })
  }
}
