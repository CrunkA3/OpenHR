/* oxlint-disable react(set-state-in-effect) */
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, LogOut, Menu, Plus, Users, X } from 'lucide-react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
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

        {view === 'calendar' && <Calendar month={month} entries={entries} onPrevious={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} onNext={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} />}
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
                  <span className={entry.isOwn ? 'calendar-entry own' : 'calendar-entry'} key={entry.id} title={`${entry.employeeName}: ${entry.absenceType ?? 'Abwesend'}`}>
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
    <div className="stack">
      <section className="form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Abwesenheit</p>
            <h2>Neuen Antrag stellen</h2>
          </div>
        </div>
        <AbsenceForm types={types} onCreated={onCreated} setError={setError} />
      </section>

      <section className="list-panel">
        <h2>Meine Anträge</h2>
        {absences.length === 0 ? <Empty text="Noch keine Anträge." /> : (
          <ul className="data-list">
            {absences.map(absence => (
              <li key={absence.id}>
                <div>
                  <strong>{absence.absenceType.name}</strong>
                  <span>{germanDate(absence.startsOn)} bis {germanDate(absence.endsOn)} · {absence.amount} {absence.absenceType.unit === 'Hours' ? 'Std.' : 'Tage'}</span>
                </div>
                <Status value={statusLabel(absence.status)} status={absence.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Approvals({ pending, onDecided, setError }: { pending: PendingAbsence[]; onDecided: () => void; setError: (value: string) => void }) {
  return (
    <section className="list-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Eingang</p>
          <h2>Offene Freigaben</h2>
        </div>
      </div>
      {pending.length === 0 ? <Empty text="Keine offenen Anträge." /> : (
        <ul className="data-list">
          {pending.map(absence => (
            <li key={absence.id}>
              <div>
                <strong>{absence.employee.displayName} · {absence.absenceType.name}</strong>
                <span>{germanDate(absence.startsOn)} bis {germanDate(absence.endsOn)}</span>
              </div>
              <div className="row-actions">
                <button onClick={() => void decide(absence.id, true, onDecided, setError)}>Genehmigen</button>
                <button className="secondary" onClick={() => void decide(absence.id, false, onDecided, setError)}>Ablehnen</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
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
    <div className="admin-grid">
      <section className="form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Stammdaten</p>
            <h2>Mitarbeitende anlegen</h2>
          </div>
          <Plus size={22} />
        </div>
        <EmployeeForm
          managers={managers}
          onCreated={created => {
            const next = [...employees, created].sort((left, right) => left.displayName.localeCompare(right.displayName))
            setEmployees(next)
            setSelectedId(created.id)
          }}
          setError={setError}
        />
      </section>

      <section className="list-panel admin-list-panel">
        <h2>Konten</h2>
        {employees.length === 0 ? <Empty text="Noch keine Konten." /> : (
          <ul className="data-list admin-list">
            {employees.map(item => (
              <li key={item.id} className={selectedEmployee?.id === item.id ? 'selected' : ''}>
                <button type="button" className="admin-account" onClick={() => setSelectedId(item.id)}>
                  <div>
                    <strong>{item.displayName}</strong>
                    <span>{item.email} · {roleLabel(item.role)}</span>
                  </div>
                  <span className="vacation">{item.vacationEntitlementDays} Urlaubstage</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedEmployee && (
        <section className="form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Details</p>
              <h2>{selectedEmployee.displayName} pflegen</h2>
            </div>
          </div>
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
        </section>
      )}
    </div>
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
      <Paper elevation={3} className="login-panel" sx={{ width: 'min(100%, 27rem)', p: 4, borderRadius: 3 }}>
        <Box className="brand-mark" sx={{ mb: 3 }}>OH</Box>
        <Typography variant="overline" className="eyebrow" sx={{ color: 'primary.main', display: 'block', mb: 1 }}>OpenHR</Typography>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Anmelden</Typography>
        <Typography className="login-copy" sx={{ mb: 3, color: 'text.secondary' }}>Personalverwaltung für Ihr Unternehmen.</Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>
        )}
        <Box component="form" onSubmit={event => void submit(event)} sx={{ display: 'grid', gap: 2 }}>
          <Field label="Geschäftliche E-Mail">
            <TextField name="email" type="email" required autoComplete="username" fullWidth size="small" />
          </Field>
          <Field label="Passwort">
            <TextField name="password" type="password" required autoComplete="current-password" fullWidth size="small" />
          </Field>
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
    <Box component="form" className="form-grid" onSubmit={event => void submit(event)} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
      <Field label="Typ">
        <TextField select name="type" required fullWidth size="small" defaultValue={types[0]?.id ?? ''}>
          {types.map(type => <MenuItem value={type.id} key={type.id}>{type.name}</MenuItem>)}
        </TextField>
      </Field>
      <Field label="Von"><TextField name="start" type="date" required fullWidth size="small" /></Field>
      <Field label="Bis"><TextField name="end" type="date" required fullWidth size="small" /></Field>
      <Field label="Stunden bei Stunden-Typen"><TextField name="amount" type="number" defaultValue="0" fullWidth size="small" /></Field>
      <Field label="Hinweis"><TextField name="note" fullWidth size="small" /></Field>
      <Box className="form-submit" sx={{ display: 'flex', alignItems: 'end' }}>
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
    <Box component="form" className="form-grid admin-form" onSubmit={event => void submit(event)} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      <Field label="Anzeigename"><TextField name="displayName" required fullWidth size="small" /></Field>
      <Field label="Geschäftliche E-Mail"><TextField name="email" type="email" required fullWidth size="small" /></Field>
      <Field label="Temporäres Passwort"><TextField name="password" type="password" required fullWidth size="small" /></Field>
      <Field label="Rolle">
        <TextField select name="role" defaultValue="Employee" fullWidth size="small">
          <MenuItem value="Employee">Mitarbeitende:r</MenuItem>
          <MenuItem value="Manager">Führungskraft</MenuItem>
          <MenuItem value="Administrator">Administration</MenuItem>
        </TextField>
      </Field>
      <Field label="Eintrittsdatum"><TextField name="startDate" type="date" required fullWidth size="small" /></Field>
      <Field label="Austrittsdatum"><TextField name="endDate" type="date" fullWidth size="small" /></Field>
      <Field label="Zugeordnete Führungskraft">
        <TextField select name="managerId" defaultValue="" fullWidth size="small">
          <MenuItem value="">Keine Zuordnung</MenuItem>
          {managers.map(manager => <MenuItem value={manager.id} key={manager.id}>{manager.displayName}</MenuItem>)}
        </TextField>
      </Field>
      <Field label="Urlaubsfreigabe durch">
        <TextField select name="vacationApprovalManagerId" defaultValue="" fullWidth size="small">
          <MenuItem value="">Keine Zuordnung</MenuItem>
          {managers.map(manager => <MenuItem value={manager.id} key={manager.id}>{manager.displayName}</MenuItem>)}
        </TextField>
      </Field>
      <Field label="Urlaubstage"><TextField name="vacationEntitlementDays" type="number" defaultValue="0" required fullWidth size="small" /></Field>
      <Field label="Aktiv"><FormControlLabel control={<Checkbox name="isActive" defaultChecked />} label="Aktiv" /></Field>
      <Box className="form-submit" sx={{ display: 'flex', alignItems: 'end', gridColumn: { xs: 'auto', md: '1 / -1' } }}>
        <Button type="submit" variant="contained">Speichern</Button>
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
    <Box component="form" className="form-grid admin-form" onSubmit={event => void submit(event)} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      <Field label="Anzeigename"><TextField name="displayName" defaultValue={employee.displayName} required fullWidth size="small" /></Field>
      <Field label="Geschäftliche E-Mail"><TextField name="email" type="email" defaultValue={employee.email} required fullWidth size="small" /></Field>
      <Field label="Neues Passwort (optional)"><TextField name="password" type="password" placeholder="Nur bei Änderung" fullWidth size="small" /></Field>
      <Field label="Rolle">
        <TextField select name="role" defaultValue={employee.role} fullWidth size="small">
          {['Employee', 'Manager', 'Administrator'].map(role => (
            <MenuItem value={role} key={role}>{role === 'Employee' ? 'Mitarbeitende:r' : role === 'Manager' ? 'Führungskraft' : 'Administration'}</MenuItem>
          ))}
        </TextField>
      </Field>
      <Field label="Eintrittsdatum"><TextField name="startDate" type="date" defaultValue={employee.startDate} required fullWidth size="small" /></Field>
      <Field label="Austrittsdatum"><TextField name="endDate" type="date" defaultValue={employee.endDate ?? ''} fullWidth size="small" /></Field>
      <Field label="Zugeordnete Führungskraft">
        <TextField select name="managerId" defaultValue={employee.managerId ?? ''} fullWidth size="small">
          <MenuItem value="">Keine Zuordnung</MenuItem>
          {managers.map(manager => <MenuItem value={manager.id} key={manager.id}>{manager.displayName}</MenuItem>)}
        </TextField>
      </Field>
      <Field label="Urlaubsfreigabe durch">
        <TextField select name="vacationApprovalManagerId" defaultValue={employee.vacationApprovalManagerId ?? ''} fullWidth size="small">
          <MenuItem value="">Keine Zuordnung</MenuItem>
          {managers.map(manager => <MenuItem value={manager.id} key={manager.id}>{manager.displayName}</MenuItem>)}
        </TextField>
      </Field>
      <Field label="Urlaubstage"><TextField name="vacationEntitlementDays" type="number" defaultValue={employee.vacationEntitlementDays} required fullWidth size="small" /></Field>
      <Field label="Aktiv"><FormControlLabel control={<Checkbox name="isActive" defaultChecked={employee.isActive} />} label="Aktiv" /></Field>
      <Box className="form-submit" sx={{ display: 'flex', alignItems: 'end', gridColumn: { xs: 'auto', md: '1 / -1' } }}>
        <Button type="submit" variant="contained">Änderungen speichern</Button>
      </Box>
    </Box>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700 }}>{label}</Typography>
      {children}
    </Box>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>
}

function Status({ value, status }: { value: string; status: string }) {
  return <Chip label={value} size="small" color={status === 'Approved' || status === 'Reported' ? 'success' : status === 'Pending' ? 'warning' : 'default'} variant={status === 'Approved' || status === 'Reported' ? 'filled' : 'outlined'} className={`status ${status.toLowerCase()}`} />
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
