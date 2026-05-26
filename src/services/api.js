const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

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

  updateUser(cpf, updates) {
    return request(`/users/${cpf}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  },

  getMedications(cpf, dayKey) {
    const query = new URLSearchParams({ dayKey })
    return request(`/users/${cpf}/medications?${query.toString()}`)
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
