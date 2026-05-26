import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { api } from '../services/api.js'
import {
  scheduleMedicationNotification,
  cancelMedicationNotification,
  cancelAll,
  requestNotificationPermission
} from '../utils/notifications.js'

const MedicationContext = createContext(null)

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

    const dayKey = getTodayKey()
    api.getMedications(user.cpf, dayKey)
      .then((response) => {
        const meds = response.medications || []
        const nextTakenMap = {}

        meds.forEach((med) => {
          if (med.takenToday) {
            nextTakenMap[`${med.id}_${med.time}_${dayKey}`] = true
          }
        })

        setMedications(meds)
        setTakenMap(nextTakenMap)
      })
      .catch((error) => {
        console.error('Erro ao carregar medicamentos:', error)
        setMedications([])
        setTakenMap({})
      })
  }, [user])

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
    if (!user) {
      throw new Error('Usuario nao autenticado.')
    }

    return api.createMedication(user.cpf, med).then((response) => {
      const createdMedications = response.medications || (response.medication ? [response.medication] : [])
      setMedications(prev => [...prev, ...createdMedications])
      requestNotificationPermission()
      createdMedications.forEach((medication) => scheduleMedicationNotification(medication))
      return createdMedications.length === 1 ? createdMedications[0] : createdMedications
    })
  }

  const removeMedication = async (id) => {
    if (!user) {
      return { success: false, error: 'Usuario nao autenticado.' }
    }

    cancelMedicationNotification(id)

    try {
      await api.deleteMedication(user.cpf, id)
      setMedications(prev => prev.filter(m => m.id !== id))
      setTakenMap(prev => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${id}_`)) {
            delete next[key]
          }
        }
        return next
      })
      return { success: true }
    } catch (error) {
      console.error('Erro ao remover medicamento:', error)
      return {
        success: false,
        error: error.message || 'Nao foi possivel remover o medicamento.'
      }
    }
  }

  const toggleTaken = (medId, time) => {
    if (!user) return
    const key = `${medId}_${time}_${getTodayKey()}`
    const wasTaken = !!takenMap[key]

    setTakenMap(prev => {
      const copy = { ...prev }
      if (copy[key]) delete copy[key]
      else copy[key] = true
      return copy
    })

    api.toggleMedicationTaken(user.cpf, medId, getTodayKey())
      .then((response) => {
        setTakenMap(prev => {
          const copy = { ...prev }
          if (response.taken) copy[key] = true
          else delete copy[key]
          return copy
        })
      })
      .catch((error) => {
        console.error('Erro ao marcar medicamento:', error)
        setTakenMap(prev => {
          const copy = { ...prev }
          if (wasTaken) copy[key] = true
          else delete copy[key]
          return copy
        })
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
