import './App.css'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { DashboardCards } from './components/DashboardCards'
import { JobTable } from './components/JobTable'
import { CronWizard } from './components/CronWizard'
import { QuickActions } from './components/QuickActions'
import { mockCronJobs } from './data/mockJobs'
import { AuthGate } from './components/AuthGate'

function App() {
  return (
    <AuthGate>
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <TopBar />
          <main>
            <DashboardCards jobs={mockCronJobs} />
            <QuickActions />
            <JobTable jobs={mockCronJobs} />
            <CronWizard />
          </main>
        </div>
      </div>
    </AuthGate>
  )
}

export default App
