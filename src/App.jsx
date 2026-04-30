import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import Login from './pages/Login.jsx'
import CreateAccount from './pages/CreateAccount.jsx'
import Home from './pages/Home.jsx'
import AddMedication from './pages/AddMedication.jsx'
import MedicationList from './pages/MedicationList.jsx'
import Reminders from './pages/Reminders.jsx'
import Caregiver from './pages/Caregiver.jsx'
import Profile from './pages/Profile.jsx'
import EditProfile from './pages/EditProfile.jsx'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  const { user } = useAuth()
  const location = useLocation()

  const publicRoutes = ['/login', '/criar-conta']
  const isPublic = publicRoutes.includes(location.pathname)

  return (
    <div className={`app-container ${isPublic ? 'no-nav' : ''}`}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/criar-conta" element={<CreateAccount />} />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/adicionar" element={<ProtectedRoute><AddMedication /></ProtectedRoute>} />
        <Route path="/horarios" element={<ProtectedRoute><MedicationList /></ProtectedRoute>} />
        <Route path="/lembretes" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
        <Route path="/cuidador" element={<ProtectedRoute><Caregiver /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/perfil/editar" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isPublic && user && <BottomNav />}
    </div>
  )
}

export default App
