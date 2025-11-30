import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { mockCronJobs } from './data/mockJobs'
import { AuthGate } from './components/AuthGate'
import { DashboardPage } from './pages/DashboardPage'
import { SchedulesPage } from './pages/SchedulesPage'

function App() {
  return (
    <AuthGate>
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <TopBar />
          <main>
            <Routes>
              <Route path="/" element={<DashboardPage jobs={mockCronJobs} />} />
              <Route path="/schedules" element={<SchedulesPage jobs={mockCronJobs} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </AuthGate>
  )
}

export default App
