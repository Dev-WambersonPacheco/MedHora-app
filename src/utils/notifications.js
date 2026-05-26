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

function clearScheduledTimer(timer) {
  if (timer && timer.type === 'timeout') {
    clearTimeout(timer.id)
  }
}

export function scheduleMedicationNotification(med, onTrigger) {
  if (!med || !med.time) return
  const key = `${med.id}-${med.time}`

  // Limpa timer anterior
  if (scheduledTimers.has(key)) {
    clearScheduledTimer(scheduledTimers.get(key))
  }

  const delay = msUntil(med.time)

  // Tenta agendar via Service Worker Notification Triggers (Chrome experimental)
  const tryScheduleViaSW = async () => {
    if (!('serviceWorker' in navigator) || typeof window.TimestampTrigger === 'undefined') return false
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg || typeof reg.showNotification !== 'function') return false

      const when = Date.now() + delay
      await reg.showNotification('💊 Hora do Medicamento!', {
        body: `${med.name} - ${med.dose}`,
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: `medhora-${med.id}-${med.time}`,
        data: { medId: med.id },
        showTrigger: new window.TimestampTrigger(when)
      })
      return true
    } catch (e) {
      // agendamento via showTrigger não disponível ou falhou
      return false
    }
  }

  // Se conseguiu agendar via SW, registra placeholder para permitir cancelamento lógico
  tryScheduleViaSW().then((ok) => {
    if (ok) {
      scheduledTimers.set(key, { type: 'sw' })
      return
    }

    // Fallback: agendamento com setTimeout (funciona enquanto a página estiver aberta)
    const timer = setTimeout(() => {
      showNotification(
        '💊 Hora do Medicamento!',
        `${med.name} - ${med.dose}`
      )
      if (onTrigger) onTrigger(med)
      // Reagenda para o dia seguinte
      scheduleMedicationNotification(med, onTrigger)
    }, delay)

    scheduledTimers.set(key, { type: 'timeout', id: timer })
  })
}

export function cancelMedicationNotification(medId) {
  for (const [key, timer] of scheduledTimers.entries()) {
    if (key.startsWith(`${medId}-`)) {
      clearScheduledTimer(timer)
      scheduledTimers.delete(key)
    }
  }
}

export function cancelAll() {
  for (const timer of scheduledTimers.values()) {
    clearScheduledTimer(timer)
  }
  scheduledTimers.clear()
}
