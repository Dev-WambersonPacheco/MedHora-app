import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { MedicationProvider } from './context/MedicationContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MedicationProvider>
          <App />
        </MedicationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
