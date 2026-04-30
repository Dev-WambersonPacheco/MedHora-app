// Utilitários para notificações de medicamentos

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function showNotification(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body
    })
  } else {
    try {
      new Notification(title, { body, icon: '/icon.svg' })
    } catch {}
  }
}

// Calcula milissegundos até o próximo horário HH:MM
export function msUntil(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

const scheduledTimers = new Map()

export function scheduleMedicationNotification(med, onTrigger) {
  if (!med || !med.time) return
  const key = `${med.id}-${med.time}`

  // Limpa timer anterior
  if (scheduledTimers.has(key)) {
    clearTimeout(scheduledTimers.get(key))
  }

  const delay = msUntil(med.time)
  const timer = setTimeout(() => {
    showNotification(
      '💊 Hora do Medicamento!',
      `${med.name} - ${med.dose}`
    )
    if (onTrigger) onTrigger(med)
    // Reagenda para o dia seguinte
    scheduleMedicationNotification(med, onTrigger)
  }, delay)

  scheduledTimers.set(key, timer)
}

export function cancelMedicationNotification(medId) {
  for (const [key, timer] of scheduledTimers.entries()) {
    if (key.startsWith(`${medId}-`)) {
      clearTimeout(timer)
      scheduledTimers.delete(key)
    }
  }
}

export function cancelAll() {
  for (const timer of scheduledTimers.values()) {
    clearTimeout(timer)
  }
  scheduledTimers.clear()
}
