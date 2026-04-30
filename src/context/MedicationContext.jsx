import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import {
  scheduleMedicationNotification,
  cancelMedicationNotification,
  cancelAll,
  requestNotificationPermission
} from '../utils/notifications.js'

const MedicationContext = createContext(null)

const STORAGE_KEY = 'medhora_medications'

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function MedicationProvider({ children }) {
  const { user } = useAuth()
  const [medications, setMedications] = useState([])
  const [takenMap, setTakenMap] = useState({}) // { "medId_HH:MM_yyyy-mm-dd": true }

  // Carrega medicamentos do usuário logado
  useEffect(() => {
    if (!user) {
      setMedications([])
      setTakenMap({})
      cancelAll()
      return
    }

    const all = loadAll()
    const userData = all[user.cpf] || { medications: [], taken: {} }
    setMedications(userData.medications || [])
    setTakenMap(userData.taken || {})
  }, [user])

  // Persistir mudanças
  useEffect(() => {
    if (!user) return
    const all = loadAll()
    all[user.cpf] = { medications, taken: takenMap }
    saveAll(all)
  }, [medications, takenMap, user])

  // Agendar notificações
  useEffect(() => {
    if (!user) return
    requestNotificationPermission()
    cancelAll()
    medications.forEach(med => {
      scheduleMedicationNotification(med)
    })
  }, [medications, user])

  const addMedication = (med) => {
    const newMed = {
      id: Date.now().toString(),
      name: med.name.toUpperCase(),
      dose: med.dose,
      time: med.time,
      createdAt: new Date().toISOString()
    }
    setMedications(prev => [...prev, newMed])
    requestNotificationPermission()
    scheduleMedicationNotification(newMed)
    return newMed
  }

  const removeMedication = (id) => {
    cancelMedicationNotification(id)
    setMedications(prev => prev.filter(m => m.id !== id))
  }

  const toggleTaken = (medId, time) => {
    const key = `${medId}_${time}_${getTodayKey()}`
    setTakenMap(prev => {
      const copy = { ...prev }
      if (copy[key]) delete copy[key]
      else copy[key] = true
      return copy
    })
  }

  const isTaken = (medId, time) => {
    const key = `${medId}_${time}_${getTodayKey()}`
    return !!takenMap[key]
  }

  const pendingCount = medications.filter(m => !isTaken(m.id, m.time)).length

  return (
    <MedicationContext.Provider value={{
      medications,
      addMedication,
      removeMedication,
      toggleTaken,
      isTaken,
      pendingCount
    }}>
      {children}
    </MedicationContext.Provider>
  )
}

export function useMedications() {
  return useContext(MedicationContext)
}
