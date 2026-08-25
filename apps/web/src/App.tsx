/* oxlint-disable react(set-state-in-effect) */
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock3, LogOut, Menu, Sparkles, TrendingUp, Users, X } from 'lucide-react'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { PersonAddAlt, SaveAs } from '@mui/icons-material'
import './App.css'

type Role = 'Employee' | 'Manager' | 'Administrator'
type Employee = {
  id: string
  displayName: string
  email: string
  role: Role
  startDate: string
  endDate: string | null
  managerId: string | null
  vacationApprovalManagerId: string | null
  vacationEntitlementDays: number
  isActive: boolean
}
type AbsenceType = { id: string; name: string; unit: 'Workdays' | 'Hours'; isVacation: boolean }
type Absence = { id: string; startsOn: string; endsOn: string; amount: number; status: string; absenceType: AbsenceType }
type PendingAbsence = Absence & { employee: { displayName: string } }
type CalendarEntry = { id: string; employeeId: string; employeeName: string; startsOn: string; endsOn: string; isOwn: boolean; absenceType: string | null }
type Notification = { id: string; message: string; createdAt: string }
type View = 'calendar' | 'requests' | 'approvals' | 'admin'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { title?: string; errors?: Record<string, string[]> } | null
    const detail = error?.errors ? Object.values(error.errors).flat().join(' ') : undefined
    throw new Error(detail || error?.title || 'Die Anfrage konnte nicht verarbeitet werden.')
  }

  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}

const dateValue = (date: Date) => date.toISOString().slice(0, 10)
const germanDate = (value: string) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
const statusLabel = (status: string) => ({ Pending: 'Ausstehend', Approved: 'Genehmigt', Rejected: 'Abgelehnt', Reported: 'Gemeldet' })[status] ?? status
const roleLabel = (role: Role) => ({ Employee: 'Mitarbeitende:r', Manager: 'Führungskraft', Administrator: 'Administration' })[role]
const absenceTone = (label?: string | null) => {
  const value = (label ?? '').toLowerCase()
  if (value.includes('urlaub') || value.includes('vacation')) return 'vacation'
  if (value.includes('krank') || value.includes('sick')) return 'sick'
  if (value.includes('home') || value.includes('remote')) return 'remote'
  return 'default'
}

function App() {
  const [employee, setEmployee] = useState<Employee>()
  const [types, setTypes] = useState<AbsenceType[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [pending, setPending] = useState<PendingAbsence[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [view, setView] = useState<View>('calendar')
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState('')

  const loadCalendar = async (currentMonth: Date) => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    setEntries(await api<CalendarEntry[]>(`/api/v1/absences/calendar?startsOn=${dateValue(start)}&endsOn=${dateValue(end)}`))
  }

  const load = async () => {
    try {
      const current = await api<Employee>('/api/v1/auth/me')
      const [absenceTypes, mine, inbox] = await Promise.all([
        api<AbsenceType[]>('/api/v1/absences/types'),
        api<Absence[]>('/api/v1/absences/mine'),
        api<Notification[]>('/api/v1/notifications'),
        loadCalendar(month),
      ])

      setEmployee(current)
      setTypes(absenceTypes)
      setAbsences(mine)
      setNotifications(inbox)
      setPending(current.role === 'Employee' ? [] : await api<PendingAbsence[]>('/api/v1/absences/pending').catch(() => []))
    } catch {
      setEmployee(undefined)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { if (employee) void loadCalendar(month).catch(() => setError('Der Kalender konnte nicht geladen werden.')) }, [employee, month])

  if (!employee) {
    return <Login onLogin={() => void load()} error={error} setError={setError} />
  }

  const navigate = (next: View) => { setView(next); setMenuOpen(false) }
  const logout = async () => { await api<void>('/api/v1/auth/logout', { method: 'POST' }); setEmployee(undefined) }
  const navigation: { id: View; label: string; icon: typeof CalendarDays; visible: boolean }[] = [
    { id: 'calendar', label: 'Kalender', icon: CalendarDays, visible: true },
    { id: 'requests', label: 'Meine Anträge', icon: ClipboardList, visible: true },
    { id: 'approvals', label: 'Freigaben', icon: Bell, visible: employee.role !== 'Employee' },
    { id: 'admin', label: 'Verwaltung', icon: Users, visible: employee.role === 'Administrator' },
  ]

  const title = { calendar: 'Kalender', requests: 'Meine Anträge', approvals: 'Freigaben', admin: 'Mitarbeitende' }[view]

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const visibleMonthAbsences = absences.filter(item => new Date(item.startsOn) <= monthEnd && new Date(item.endsOn) >= monthStart)
  const approvedThisMonth = visibleMonthAbsences.filter(item => item.status === 'Approved' || item.status === 'Reported').reduce((total, item) => total + item.amount, 0)
  const pendingThisMonth = visibleMonthAbsences.filter(item => item.status === 'Pending').length
  const nextAbsence = [...absences].filter(item => new Date(item.startsOn) >= new Date()).sort((left, right) => new Date(left.startsOn).getTime() - new Date(right.startsOn).getTime())[0]
  const upcomingAbsences = [...absences].sort((left, right) => new Date(left.startsOn).getTime() - new Date(right.startsOn).getTime()).slice(0, 4)

  const kpiCards = [
    { label: 'Genehmigt', value: approvedThisMonth.toString(), trend: '+12% vs. Vormonat', tone: 'positive' },
    { label: 'Offen', value: String(pendingThisMonth + pending.length), trend: pending.length ? `${pending.length} Freigaben` : 'stabil', tone: 'warning' },
    { label: 'Verbleibend', value: String(Math.max(employee.vacationEntitlementDays - approvedThisMonth, 0)), trend: 'diese Woche', tone: 'positive' },
    { label: 'Nächster Antrag', value: nextAbsence ? nextAbsence.absenceType.name : 'Keine', trend: nextAbsence ? `${germanDate(nextAbsence.startsOn)}` : 'keine Einträge', tone: 'neutral' },
  ]

  return (
    <main className="workspace">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Hauptnavigation">
        <div className="brand">
          <span>OH</span>
          <strong>OpenHR</strong>
          <button className="icon-button close-menu" onClick={() => setMenuOpen(false)} aria-label="Navigation schließen">
            <X size={20} />
          </button>
        </div>

        <nav>
          {navigation.filter(item => item.visible).map(item => (
            <button className={view === item.id ? 'nav-item active' : 'nav-item'} key={item.id} onClick={() => navigate(item.id)}>
              <item.icon size={19} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="profile">
          <div>
            <strong>{employee.displayName}</strong>
            <span>{roleLabel(employee.role)}</span>
          </div>
          <button className="icon-button" onClick={() => void logout()} aria-label="Abmelden" title="Abmelden">
            <LogOut size={19} />
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Navigation öffnen"><Menu size={22} /></button>
          <div>
            <p className="eyebrow">OpenHR</p>
            <h1>{title}</h1>
          </div>
          <button className="icon-button notification-button" aria-label={`${notifications.length} Benachrichtigungen`} title="Benachrichtigungen">
            <Bell size={20} />
            <span>{notifications.length}</span>
          </button>
        </header>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="kpi-row" aria-label="KPI-Übersicht">
          {kpiCards.map(card => (
            <article className={`kpi-card tone-${card.tone}`} key={card.label}>
              <div className="kpi-header">
                <span>{card.label}</span>
                <span className="kpi-icon">{card.tone === 'warning' ? <Clock3 size={16} /> : card.tone === 'positive' ? <TrendingUp size={16} /> : <Sparkles size={16} />}</span>
              </div>
              <strong>{card.value}</strong>
              <small>{card.trend}</small>
            </article>
          ))}
        </div>

        {view === 'calendar' && (
          <div className="dashboard-panels">
            <Calendar month={month} entries={entries} onPrevious={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} onNext={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} />
            <aside className="insight-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Aussichten</p>
                  <h2>Bevorstehende Abwesenheiten</h2>
                </div>
              </div>
              <div className="timeline">
                {upcomingAbsences.length === 0 ? <p className="empty">Keine geplanten Abwesenheiten.</p> : upcomingAbsences.map(absence => (
                  <div className="timeline-item" key={absence.id}>
                    <div className="timeline-row">
                      <strong>{absence.absenceType.name}</strong>
                      <Status value={statusLabel(absence.status)} status={absence.status} />
                    </div>
                    <span className="timeline-meta">{germanDate(absence.startsOn)} bis {germanDate(absence.endsOn)}</span>
                    <span className="timeline-meta subtle">{absence.amount} {absence.absenceType.unit === 'Hours' ? 'Std.' : 'Tage'}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {view === 'requests' && <Requests types={types} absences={absences} onCreated={() => void load()} setError={setError} />}
        {view === 'approvals' && <Approvals pending={pending} onDecided={() => void load()} setError={setError} />}
        {view === 'admin' && <Admin setError={setError} />}
      </section>
    </main>
  )
}

function Calendar({ month, entries, onPrevious, onNext }: { month: Date; entries: CalendarEntry[]; onPrevious: () => void; onNext: () => void }) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(start)
  gridStart.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index))
  const label = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(month)

  return (
    <section className="calendar-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Teamübersicht</p>
          <h2>{label}</h2>
        </div>
        <div className="month-controls">
          <button className="icon-button" onClick={onPrevious} aria-label="Vorheriger Monat"><ChevronLeft size={20} /></button>
          <button className="icon-button" onClick={onNext} aria-label="Nächster Monat"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="weekdays">{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => <span key={day}>{day}</span>)}</div>

      <div className="calendar-grid">
        {days.map(day => {
          const value = dateValue(day)
          const relevant = entries.filter(entry => entry.startsOn <= value && entry.endsOn >= value)
          return (
            <div className={`calendar-day ${day.getMonth() === month.getMonth() ? '' : 'outside'} ${day.getDay() === 0 || day.getDay() === 6 ? 'weekend' : ''}`} key={value}>
              <time dateTime={value}>{day.getDate()}</time>
              <div className="day-entries">
                {relevant.map(entry => (
                  <span className={`calendar-entry tone-${absenceTone(entry.absenceType)} ${entry.isOwn ? 'own' : ''}`} key={entry.id} title={`${entry.employeeName}: ${entry.absenceType ?? 'Abwesend'}`}>
                    <b>{entry.employeeName}</b>
                    <em>{entry.absenceType ?? 'Abwesend'}</em>
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Requests({ types, absences, onCreated, setError }: { types: AbsenceType[]; absences: Absence[]; onCreated: () => void; setError: (value: string) => void }) {
  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}>Abwesenheit</Typography>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Neuen Antrag stellen</Typography>
        <AbsenceForm types={types} onCreated={onCreated} setError={setError} />
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Meine Anträge</Typography>
        {absences.length === 0 ? <Empty text="Noch keine Anträge." /> : (
          <Stack spacing={1.5}>
            {absences.map(absence => (
              <Box key={absence.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1.5 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{absence.absenceType.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{germanDate(absence.startsOn)} bis {germanDate(absence.endsOn)} · {absence.amount} {absence.absenceType.unit === 'Hours' ? 'Std.' : 'Tage'}</Typography>
                </Box>
                <Status value={statusLabel(absence.status)} status={absence.status} />
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}

function Approvals({ pending, onDecided, setError }: { pending: PendingAbsence[]; onDecided: () => void; setError: (value: string) => void }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}>Eingang</Typography>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Offene Freigaben</Typography>

      {pending.length === 0 ? <Empty text="Keine offenen Anträge." /> : (
        <Stack spacing={1.5}>
          {pending.map(absence => (
            <Box key={absence.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{absence.employee.displayName} · {absence.absenceType.name}</Typography>
                <Typography variant="body2" color="text.secondary">{germanDate(absence.startsOn)} bis {germanDate(absence.endsOn)}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={() => void decide(absence.id, true, onDecided, setError)}>Genehmigen</Button>
                <Button variant="outlined" onClick={() => void decide(absence.id, false, onDecided, setError)}>Ablehnen</Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  )
}

function Admin({ setError }: { setError: (value: string) => void }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const refreshEmployees = async () => {
    const next = await api<Employee[]>('/api/v1/admin/employees')
    const sorted = [...next].sort((left, right) => left.displayName.localeCompare(right.displayName))
    setEmployees(sorted)
    setSelectedId(current => current && sorted.some(item => item.id === current) ? current : sorted[0]?.id ?? null)
  }

  useEffect(() => { void refreshEmployees().catch(() => setError('Die Mitarbeitenden konnten nicht geladen werden.')) }, [])

  const selectedEmployee = employees.find(item => item.id === selectedId) ?? null
  const managers = employees.filter(item => item.role !== 'Employee' && item.id !== selectedEmployee?.id)

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(22rem, 1.15fr) minmax(18rem, .85fr) minmax(18rem, 1fr)' } }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction="row" sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}>Stammdaten</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Mitarbeitende anlegen</Typography>
          </Box>
          <PersonAddAlt color="primary" />
        </Stack>

        <EmployeeForm
          managers={managers}
          onCreated={created => {
            const next = [...employees, created].sort((left, right) => left.displayName.localeCompare(right.displayName))
            setEmployees(next)
            setSelectedId(created.id)
          }}
          setError={setError}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, minWidth: 0 }}>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}>Konten</Typography>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Konten</Typography>

        {employees.length === 0 ? <Empty text="Noch keine Konten." /> : (
          <List disablePadding sx={{ display: 'grid', gap: 1 }}>
            {employees.map(item => (
              <ListItemButton
                key={item.id}
                selected={selectedEmployee?.id === item.id}
                onClick={() => setSelectedId(item.id)}
                sx={{ borderRadius: 2, border: '1px solid', borderColor: selectedEmployee?.id === item.id ? 'primary.main' : 'divider', bgcolor: selectedEmployee?.id === item.id ? 'rgba(25, 118, 210, 0.04)' : 'transparent', px: 1.5, py: 1 }}
              >
                <ListItemText
                  primary={item.displayName}
                  secondary={`${item.email} • ${roleLabel(item.role)}`}
                  sx={{ mr: 1 }}
                />
                <Chip label={`${item.vacationEntitlementDays} Urlaubstage`} size="small" variant="outlined" />
              </ListItemButton>
            ))}
          </List>
        )}
      </Paper>

      {selectedEmployee && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}>Details</Typography>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>{selectedEmployee.displayName} pflegen</Typography>

          <EmployeeDetailsForm
            key={selectedEmployee.id}
            employee={selectedEmployee}
            managers={managers}
            onSaved={updated => {
              const next = [...employees].map(item => item.id === updated.id ? updated : item).sort((left, right) => left.displayName.localeCompare(right.displayName))
              setEmployees(next)
              setSelectedId(updated.id)
            }}
            setError={setError}
          />
        </Paper>
      )}
    </Box>
  )
}

function Login({ onLogin, error, setError }: { onLogin: () => void; error: string; setError: (value: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      await api<Employee>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      })
      onLogin()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Anmeldung fehlgeschlagen.')
    }
  }

  return (
    <main className="login-page">
      <Paper elevation={3} sx={{ width: 'min(100%, 27rem)', p: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', color: 'white', fontWeight: 800, mb: 3 }}>OH</Box>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}>OpenHR</Typography>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>Anmelden</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Personalverwaltung für Ihr Unternehmen.</Typography>
        {error && <Box component="p" sx={{ mb: 2, p: 1.5, borderLeft: 4, borderColor: 'error.main', bgcolor: 'rgba(211,47,47,0.08)', color: 'error.main', borderRadius: 1 }}>{error}</Box>}
        <Box component="form" onSubmit={event => void submit(event)} sx={{ display: 'grid', gap: 2 }}>
          <TextField name="email" type="email" label="Geschäftliche E-Mail" required autoComplete="username" fullWidth />
          <TextField name="password" type="password" label="Passwort" required autoComplete="current-password" fullWidth slotProps={{ htmlInput: { minLength: 12 } }} />
          <Button type="submit" variant="contained" size="large" sx={{ mt: 1 }}>Anmelden</Button>
        </Box>
      </Paper>
    </main>
  )
}

function AbsenceForm({ types, onCreated, setError }: { types: AbsenceType[]; onCreated: () => void; setError: (value: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await api('/api/v1/absences/mine', {
        method: 'POST',
        body: JSON.stringify({
          absenceTypeId: data.get('type'),
          startsOn: data.get('start'),
          endsOn: data.get('end'),
          amount: Number(data.get('amount')),
          note: data.get('note') || null,
        }),
      })
      form.reset()
      onCreated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Der Antrag konnte nicht erstellt werden.')
    }
  }

  return (
    <Box component="form" onSubmit={event => void submit(event)} sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
      <FormControl fullWidth>
        <InputLabel id="absence-type-label">Typ</InputLabel>
        <Select labelId="absence-type-label" name="type" label="Typ" defaultValue={types[0]?.id ?? ''}>
          {types.map(type => <MenuItem value={type.id} key={type.id}>{type.name}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField name="start" type="date" label="Von" required fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      <TextField name="end" type="date" label="Bis" required fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      <TextField name="amount" type="number" label="Stunden bei Stunden-Typen" defaultValue={0} fullWidth slotProps={{ htmlInput: { min: 0.5, step: 0.5 } }} />
      <TextField name="note" label="Hinweis" fullWidth slotProps={{ htmlInput: { maxLength: 500 } }} />
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="contained">Antrag einreichen</Button>
      </Box>
    </Box>
  )
}

function EmployeeForm({ managers, onCreated, setError }: { managers: Employee[]; onCreated: (employee: Employee) => void; setError: (value: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      const created = await api<Employee>('/api/v1/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          displayName: data.get('displayName'),
          email: data.get('email'),
          password: data.get('password'),
          role: data.get('role'),
          startDate: data.get('startDate'),
          endDate: data.get('endDate') || null,
          managerId: data.get('managerId') || null,
          vacationApprovalManagerId: data.get('vacationApprovalManagerId') || null,
          vacationEntitlementDays: Number(data.get('vacationEntitlementDays')),
          isActive: data.get('isActive') === 'on',
        }),
      })
      form.reset()
      onCreated(created)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Das Konto konnte nicht angelegt werden.')
    }
  }

  return (
    <Box component="form" onSubmit={event => void submit(event)} sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
      <TextField name="displayName" label="Anzeigename" required fullWidth slotProps={{ htmlInput: { maxLength: 120 } }} />
      <TextField name="email" type="email" label="Geschäftliche E-Mail" required fullWidth />
      <TextField name="password" type="password" label="Temporäres Passwort" required fullWidth slotProps={{ htmlInput: { minLength: 12 } }} />
      <FormControl fullWidth>
        <InputLabel id="new-role-label">Rolle</InputLabel>
        <Select labelId="new-role-label" name="role" label="Rolle" defaultValue="Employee">
          <MenuItem value="Employee">Mitarbeitende:r</MenuItem>
          <MenuItem value="Manager">Führungskraft</MenuItem>
          <MenuItem value="Administrator">Administration</MenuItem>
        </Select>
      </FormControl>
      <TextField name="startDate" type="date" label="Eintrittsdatum" required fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      <TextField name="endDate" type="date" label="Austrittsdatum" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      <FormControl fullWidth>
        <InputLabel id="new-manager-label">Zugeordnete Führungskraft</InputLabel>
        <Select labelId="new-manager-label" name="managerId" label="Zugeordnete Führungskraft" defaultValue="">
          <MenuItem value="">Keine Zuordnung</MenuItem>
          {managers.map(manager => <MenuItem value={manager.id} key={manager.id}>{manager.displayName}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="new-vacation-manager-label">Urlaubsfreigabe durch</InputLabel>
        <Select labelId="new-vacation-manager-label" name="vacationApprovalManagerId" label="Urlaubsfreigabe durch" defaultValue="">
          <MenuItem value="">Keine Zuordnung</MenuItem>
          {managers.map(manager => <MenuItem value={manager.id} key={manager.id}>{manager.displayName}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField name="vacationEntitlementDays" type="number" label="Urlaubstage" required fullWidth slotProps={{ htmlInput: { min: 0, step: 0.5 } }} defaultValue={0} />
      <FormControlLabel
        control={<Checkbox name="isActive" defaultChecked />} 
        label="Aktiv"
        sx={{ ml: 0.5, alignSelf: 'center' }}
      />
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="contained" startIcon={<PersonAddAlt />} sx={{ minWidth: 160 }}>Speichern</Button>
      </Box>
    </Box>
  )
}

function EmployeeDetailsForm({ employee, managers, onSaved, setError }: { employee: Employee; managers: Employee[]; onSaved: (employee: Employee) => void; setError: (value: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const rawPassword = (data.get('password') ?? '').toString().trim()
    const payload = {
      displayName: data.get('displayName'),
      email: data.get('email'),
      password: rawPassword || undefined,
      role: data.get('role'),
      startDate: data.get('startDate'),
      endDate: data.get('endDate') || null,
      managerId: data.get('managerId') || null,
      vacationApprovalManagerId: data.get('vacationApprovalManagerId') || null,
      vacationEntitlementDays: Number(data.get('vacationEntitlementDays')),
      isActive: data.get('isActive') === 'on',
    }

    try {
      const updated = await api<Employee>(`/api/v1/admin/employees/${employee.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      onSaved(updated)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Die Mitarbeitenden-Details konnten nicht gespeichert werden.')
    }
  }

  return (
    <Box component="form" onSubmit={event => void submit(event)} sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
      <TextField name="displayName" label="Anzeigename" defaultValue={employee.displayName} required fullWidth slotProps={{ htmlInput: { maxLength: 120 } }} />
      <TextField name="email" type="email" label="Geschäftliche E-Mail" defaultValue={employee.email} required fullWidth />
      <TextField name="password" type="password" label="Neues Passwort (optional)" fullWidth placeholder="Nur bei Änderung" slotProps={{ htmlInput: { minLength: 12 } }} />
      <FormControl fullWidth>
        <InputLabel id="edit-role-label">Rolle</InputLabel>
        <Select labelId="edit-role-label" name="role" label="Rolle" defaultValue={employee.role}>
          {['Employee', 'Manager', 'Administrator'].map(role => (
            <MenuItem value={role} key={role}>{role === 'Employee' ? 'Mitarbeitende:r' : role === 'Manager' ? 'Führungskraft' : 'Administration'}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField name="startDate" type="date" label="Eintrittsdatum" defaultValue={employee.startDate} required fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      <TextField name="endDate" type="date" label="Austrittsdatum" defaultValue={employee.endDate ?? ''} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      <FormControl fullWidth>
        <InputLabel id="edit-manager-label">Zugeordnete Führungskraft</InputLabel>
        <Select labelId="edit-manager-label" name="managerId" label="Zugeordnete Führungskraft" defaultValue={employee.managerId ?? ''}>
          <MenuItem value="">Keine Zuordnung</MenuItem>
          {managers.map(manager => <MenuItem value={manager.id} key={manager.id}>{manager.displayName}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="edit-vacation-manager-label">Urlaubsfreigabe durch</InputLabel>
        <Select labelId="edit-vacation-manager-label" name="vacationApprovalManagerId" label="Urlaubsfreigabe durch" defaultValue={employee.vacationApprovalManagerId ?? ''}>
          <MenuItem value="">Keine Zuordnung</MenuItem>
          {managers.map(manager => <MenuItem value={manager.id} key={manager.id}>{manager.displayName}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField name="vacationEntitlementDays" type="number" label="Urlaubstage" defaultValue={employee.vacationEntitlementDays} required fullWidth slotProps={{ htmlInput: { min: 0, step: 0.5 } }} />
      <FormControlLabel
        control={<Checkbox name="isActive" defaultChecked={employee.isActive} />}
        label="Aktiv"
        sx={{ ml: 0.5, alignSelf: 'center' }}
      />
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="contained" startIcon={<SaveAs />} sx={{ minWidth: 210 }}>Änderungen speichern</Button>
      </Box>
    </Box>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>
}

function Status({ value, status }: { value: string; status: string }) {
  return <span className={`status ${status.toLowerCase()}`}>{value}</span>
}

async function decide(id: string, approve: boolean, load: () => void, setError: (value: string) => void) {
  try {
    await api(`/api/v1/absences/${id}/decision`, { method: 'POST', body: JSON.stringify({ approve, note: null }) })
    load()
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : 'Die Entscheidung konnte nicht gespeichert werden.')
  }
}

export default App
