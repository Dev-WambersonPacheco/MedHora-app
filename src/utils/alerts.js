import { requestNotificationPermission, showNotification } from './notifications.js'

const timers = new Map()

function playAlertSound() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.08
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    setTimeout(() => {
      oscillator.stop()
      context.close()
    }, 450)
  } catch {
    // ignore audio failures on unsupported browsers
  }
}

function scheduleTimer(key, delay, callback) {
  if (timers.has(key)) {
    clearTimeout(timers.get(key))
  }

  const id = setTimeout(callback, delay)
  timers.set(key, id)
}

function clearTimer(key) {
  if (timers.has(key)) {
    clearTimeout(timers.get(key))
    timers.delete(key)
  }
}

function formatDateTime(date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hours}:${minutes}`
}

function resolveDateTime(dateValue, timeValue) {
  const [hours = 0, minutes = 0] = String(timeValue || '00:00').split(':').map(Number)
  const date = new Date(`${dateValue}T00:00:00`)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export async function triggerAlert({ title, body, onTrigger }) {
  await requestNotificationPermission()
  showNotification(title, body)
  playAlertSound()
  if (typeof onTrigger === 'function') {
    onTrigger()
  }
}

export function scheduleRoutineAlert(item, onTrigger) {
  const key = `routine-${item.id}`
  const frequency = item.frequency || 'daily'
  const repeatMs = Number(item.repeatEveryHours || 0) * 60 * 60 * 1000

  const scheduleNext = () => {
    const now = new Date()
    const [hours = 0, minutes = 0] = String(item.time || '08:00').split(':').map(Number)
    const target = new Date(now)
    target.setHours(hours, minutes, 0, 0)

    if (frequency === 'daily') {
      if (target <= now) {
        target.setDate(target.getDate() + 1)
      }
      scheduleTimer(key, target.getTime() - now.getTime(), async () => {
        await triggerAlert({
          title: `Rotina: ${item.title}`,
          body: item.description || 'Hora de cumprir sua rotina diária.',
          onTrigger
        })
        scheduleNext()
      })
      return
    }

    if (frequency === 'interval' && repeatMs > 0) {
      if (target <= now) {
        target.setTime(now.getTime() + repeatMs)
      }
      scheduleTimer(key, target.getTime() - now.getTime(), async () => {
        await triggerAlert({
          title: `Rotina: ${item.title}`,
          body: item.description || 'Hora de cumprir sua rotina.',
          onTrigger
        })
        scheduleNext()
      })
    }
  }

  clearTimer(key)
  scheduleNext()
}

export function scheduleReminderAlert(item, onTrigger) {
  const key = `reminder-${item.id}`
  const when = resolveDateTime(item.date, item.time)
  const now = new Date()

  if (when <= now) {
    return
  }

  scheduleTimer(key, when.getTime() - now.getTime(), async () => {
    await triggerAlert({
      title: item.title || 'Lembrete do cuidador',
      body: `${formatDateTime(when)}${item.description ? ` • ${item.description}` : ''}`,
      onTrigger
    })
  })
}

export function cancelRoutineAlerts() {
  for (const key of [...timers.keys()]) {
    if (key.startsWith('routine-')) {
      clearTimer(key)
    }
  }
}

export function cancelReminderAlerts() {
  for (const key of [...timers.keys()]) {
    if (key.startsWith('reminder-')) {
      clearTimer(key)
    }
  }
}

export function cancelAllAlerts() {
  for (const key of [...timers.keys()]) {
    clearTimer(key)
  }
}