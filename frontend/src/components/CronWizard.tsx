import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronLeft, Info, Sparkles } from 'lucide-react'
import type { CronPriority, NotificationChannel, WizardResult } from '../types/cron'

interface FrequencyPreset {
  id: string
  label: string
  expression: string
  readable: string
  detail: string
}

const wizardSteps = [
  {
    id: 'basics',
    title: 'Describe cron',
    helper: 'Give the job a friendly name and context so teammates immediately understand its purpose.',
  },
  {
    id: 'schedule',
    title: 'Choose schedule',
    helper: 'Pick a preset cadence or toggle advanced mode to enter a custom cron expression.',
  },
  {
    id: 'command',
    title: 'Command & notifications',
    helper: 'Provide the exact command, escalation priority, and notification channel.',
  },
] as const

const frequencyPresets: FrequencyPreset[] = [
  {
    id: 'hourly',
    label: 'Hourly health check',
    expression: '0 * * * *',
    readable: 'Every hour on the hour',
    detail: 'Ensures services respond under 500ms.',
  },
  {
    id: 'daily',
    label: 'Daily sync',
    expression: '30 2 * * *',
    readable: 'Daily at 2:30 AM',
    detail: 'Perfect for ETL and reporting workflows.',
  },
  {
    id: 'weekday',
    label: 'Weekday heartbeat',
    expression: '0 7 * * 1-5',
    readable: 'Weekdays at 7:00 AM',
    detail: 'Send updates when teammates are online.',
  },
] as const

const notificationChannels: { value: NotificationChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'none', label: 'Do not notify' },
]

const priorities: { value: CronPriority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'routine', label: 'Routine' },
  { value: 'maintenance', label: 'Maintenance' },
]

const initialPreset: FrequencyPreset = frequencyPresets[0]

export function CronWizard() {
  const [step, setStep] = useState(0)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(initialPreset.id)
  const [customSchedule, setCustomSchedule] = useState({
    expression: initialPreset.expression,
    readable: initialPreset.readable,
  })
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState<WizardResult>({
    name: '',
    description: '',
    schedule: initialPreset.expression,
    readableSchedule: initialPreset.readable,
    command: '',
    notifications: 'email',
    priority: 'routine',
  })

  const applyPreset = (preset: FrequencyPreset) => {
    setForm((prev) => ({
      ...prev,
      schedule: preset.expression,
      readableSchedule: preset.readable,
    }))
    setCustomSchedule({ expression: preset.expression, readable: preset.readable })
  }

  const stepValid = useMemo(() => {
    if (step === 0) {
      return form.name.trim().length >= 3 && form.description.trim().length >= 10
    }
    if (step === 1) {
      if (advancedMode) {
        return customSchedule.expression.trim().length > 0 && customSchedule.readable.trim().length > 0
      }
      return Boolean(selectedPreset)
    }
    if (step === 2) {
      return form.command.trim().length > 0
    }
    return false
  }, [step, form, selectedPreset, advancedMode, customSchedule])

  const progress = ((step + 1) / wizardSteps.length) * 100

  const handleNext = () => {
    if (step === wizardSteps.length - 1) {
      setSubmitted(true)
      return
    }
    setStep((prev) => Math.min(prev + 1, wizardSteps.length - 1))
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const handleCustomScheduleChange = (field: 'expression' | 'readable', value: string) => {
    setCustomSchedule((prev) => ({ ...prev, [field]: value }))
    setForm((prev) => ({ ...prev, [field === 'expression' ? 'schedule' : 'readableSchedule']: value }))
  }

  const toggleAdvanced = () => {
    setAdvancedMode((prev) => {
      const next = !prev
      if (!next) {
        setSelectedPreset(initialPreset.id)
        applyPreset(initialPreset)
      } else {
        setSelectedPreset(null)
      }
      return next
    })
  }

  const summaryItems = [
    { label: 'Name', value: form.name || '—' },
    { label: 'Schedule', value: form.readableSchedule || '—' },
    { label: 'Command', value: form.command || '—' },
    { label: 'Priority', value: form.priority },
    { label: 'Notifications', value: form.notifications },
  ]

  return (
    <section className="wizard" aria-label="Cron creation wizard">
      <header className="wizard__header">
        <div>
          <p>Guided workflow</p>
          <h3>Create a cron job</h3>
        </div>
        <span>{step + 1} of {wizardSteps.length} steps</span>
      </header>

      <div className="wizard__progress" aria-hidden>
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className="wizard__body">
        <div className="wizard__steps">
          <ol>
            {wizardSteps.map((item, index) => (
              <li key={item.id} className={index === step ? 'is-active' : index < step ? 'is-complete' : undefined}>
                <span>{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.helper}</p>
                </div>
              </li>
            ))}
          </ol>

          {step === 0 && (
            <div className="wizard__panel">
              <div className="field">
                <label htmlFor="cron-name">Name</label>
                <input
                  id="cron-name"
                  placeholder="e.g. Generate usage digest"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="cron-description">Description</label>
                <textarea
                  id="cron-description"
                  placeholder="What does this job do?"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="wizard__panel">
              <div className="wizard__panel-header">
                <span>Choose from popular schedules</span>
                <button type="button" className="text" onClick={toggleAdvanced}>
                  {advancedMode ? 'Use presets' : 'Advanced mode'}
                </button>
              </div>

              {!advancedMode && (
                <div className="frequency-grid" role="group" aria-label="Frequency presets">
                  {frequencyPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`frequency-card${selectedPreset === preset.id ? ' is-selected' : ''}`}
                      onClick={() => {
                        setSelectedPreset(preset.id)
                        applyPreset(preset)
                      }}
                    >
                      <strong>{preset.label}</strong>
                      <p>{preset.readable}</p>
                      <span>{preset.detail}</span>
                    </button>
                  ))}
                </div>
              )}

              {advancedMode && (
                <div className="advanced">
                  <div className="field">
                    <label htmlFor="cron-expression">Cron expression</label>
                    <input
                      id="cron-expression"
                      placeholder="0 12 * * *"
                      value={customSchedule.expression}
                      onChange={(event) => handleCustomScheduleChange('expression', event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="cron-readable">Readable summary</label>
                    <input
                      id="cron-readable"
                      placeholder="Every day at noon"
                      value={customSchedule.readable}
                      onChange={(event) => handleCustomScheduleChange('readable', event.target.value)}
                    />
                  </div>
                  <div className="note">
                    <Info size={14} />
                    <p>Cron expressions use the five-field syntax (minute, hour, day, month, weekday).</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="wizard__panel">
              <div className="field">
                <label htmlFor="cron-command">Command to execute</label>
                <textarea
                  id="cron-command"
                  placeholder="node scripts/generate-digest.js --region=us-west"
                  rows={3}
                  value={form.command}
                  onChange={(event) => setForm((prev) => ({ ...prev, command: event.target.value }))}
                />
              </div>
              <div className="field-grid">
                <label>
                  Priority
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, priority: event.target.value as CronPriority }))
                    }
                  >
                    {priorities.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notifications
                  <select
                    value={form.notifications}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notifications: event.target.value as NotificationChannel }))
                    }
                  >
                    {notificationChannels.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          <footer className="wizard__controls">
            <button type="button" className="ghost" onClick={handleBack} disabled={step === 0}>
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <button type="button" className="primary" onClick={handleNext} disabled={!stepValid}>
              <span>{step === wizardSteps.length - 1 ? 'Finish' : 'Next'}</span>
              <ArrowRight size={16} />
            </button>
          </footer>
        </div>

        <aside className="wizard__summary" aria-live="polite">
          <div className="summary-card">
            <Sparkles size={20} />
            <div>
              <strong>Alfred guidance</strong>
              <p>We surface safe defaults, then let you fine-tune every detail.</p>
            </div>
          </div>
          {submitted ? (
            <div className="summary-card is-success">
              <CheckCircle2 size={20} />
              <div>
                <strong>Ready to schedule</strong>
                <p>We captured your cron details. Continue to review & deploy.</p>
              </div>
            </div>
          ) : (
            <p className="summary-note">Complete the steps to review a human-readable summary.</p>
          )}

          <dl>
            {summaryItems.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value || '—'}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  )
}

export default CronWizard
