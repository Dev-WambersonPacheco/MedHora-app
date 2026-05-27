// Utilitarios para notificacoes de medicamentos

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

export function playAlarmTone() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    const context = new AudioContext()
    const masterGain = context.createGain()
    const now = context.currentTime
    const notes = [
      { frequency: 880, start: 0, duration: 0.16 },
      { frequency: 1175, start: 0.22, duration: 0.16 },
      { frequency: 880, start: 0.44, duration: 0.16 },
      { frequency: 1175, start: 0.66, duration: 0.24 }
    ]

    masterGain.gain.setValueAtTime(0.0001, now)
    masterGain.gain.exponentialRampToValueAtTime(0.12, now + 0.03)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05)
    masterGain.connect(context.destination)

    notes.forEach(({ frequency, start, duration }) => {
      const oscillator = context.createOscillator()
      const noteGain = context.createGain()
      const noteStart = now + start
      const noteEnd = noteStart + duration

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, noteStart)
      noteGain.gain.setValueAtTime(0.0001, noteStart)
      noteGain.gain.exponentialRampToValueAtTime(1, noteStart + 0.02)
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd)

      oscillator.connect(noteGain)
      noteGain.connect(masterGain)
      oscillator.start(noteStart)
      oscillator.stop(noteEnd + 0.02)
    })

    window.setTimeout(() => {
      context.close().catch(() => {})
    }, 1200)
  } catch {
    // ignore audio failures on unsupported browsers
  }
}

export function msUntil(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

function msUntilTodayOrNow(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  return Math.max(0, target.getTime() - now.getTime())
}

const scheduledTimers = new Map()

function clearScheduledTimer(timer) {
  if (timer?.type === 'timeout') {
    clearTimeout(timer.id)
  }

  if (timer?.type === 'repeat') {
    if (timer.timeoutId) clearTimeout(timer.timeoutId)
    if (timer.intervalId) clearInterval(timer.intervalId)
  }
}

function triggerMedicationAlarm(med, onTrigger) {
  showNotification(
    'Hora do Medicamento!',
    `${med.name} - ${med.dose}`
  )
  if (navigator.vibrate) navigator.vibrate([180, 70, 180, 70, 260])
  playAlarmTone()
  if (onTrigger) onTrigger(med)
}

export function scheduleMedicationNotification(med, onTrigger, options = {}) {
  if (!med || !med.time) return
  const key = `${med.id}-${med.time}`
  const repeatUntilCleared = !!options.repeatUntilCleared
  const repeatIntervalMs = Number(options.repeatIntervalMs || 60 * 1000)

  if (scheduledTimers.has(key)) {
    clearScheduledTimer(scheduledTimers.get(key))
  }

  const delay = repeatUntilCleared ? msUntilTodayOrNow(med.time) : msUntil(med.time)

  const tryScheduleViaSW = async () => {
    if (repeatUntilCleared) return false
    if (!('serviceWorker' in navigator) || typeof window.TimestampTrigger === 'undefined') return false
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg || typeof reg.showNotification !== 'function') return false

      const when = Date.now() + delay
      await reg.showNotification('Hora do Medicamento!', {
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
    } catch {
      return false
    }
  }

  tryScheduleViaSW().then((ok) => {
    if (ok) {
      scheduledTimers.set(key, { type: 'sw' })
      return
    }

    const timeoutId = setTimeout(() => {
      triggerMedicationAlarm(med, onTrigger)

      if (repeatUntilCleared) {
        const activeTimer = scheduledTimers.get(key)
        if (activeTimer?.type === 'repeat') {
          activeTimer.intervalId = setInterval(
            () => triggerMedicationAlarm(med, onTrigger),
            repeatIntervalMs
          )
        }
        return
      }

      scheduleMedicationNotification(med, onTrigger)
    }, delay)

    scheduledTimers.set(
      key,
      repeatUntilCleared
        ? { type: 'repeat', timeoutId, intervalId: null }
        : { type: 'timeout', id: timeoutId }
    )
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
