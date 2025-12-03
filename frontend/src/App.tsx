import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { mockCronJobs } from './data/mockJobs'
import { AuthGate } from './components/AuthGate'
import { DashboardPage } from './pages/DashboardPage'
import { SchedulesPage } from './pages/SchedulesPage'
import { ScriptsProvider } from './scripts/ScriptContext'
import { ScriptsPage } from './pages/ScriptsPage'
import { AuditPage } from './pages/AuditPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <AuthGate>
      <ScriptsProvider>
        <div className="app-shell">
          <Sidebar />
          <div className="app-main">
            <TopBar />
            <main>
              <Routes>
                <Route path="/" element={<DashboardPage jobs={mockCronJobs} />} />
                <Route path="/schedules" element={<SchedulesPage jobs={mockCronJobs} />} />
                <Route path="/scripts" element={<ScriptsPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </ScriptsProvider>
    </AuthGate>
  )
}

export default App
