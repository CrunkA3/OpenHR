/* oxlint-disable react(set-state-in-effect) */
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, LogOut, Menu, Plus, Users, X } from 'lucide-react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Drawer,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
      <Drawer
        variant="temporary"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 264, boxSizing: 'border-box' },
        }}
      >
        <SidebarContent employee={employee} view={view} navigation={navigation} onNavigate={navigate} onLogout={() => void logout()} onClose={() => setMenuOpen(false)} />
      </Drawer>

      <Box component="aside" className="sidebar" aria-label="Hauptnavigation" sx={{ display: { xs: 'none', md: 'flex' } }}>
        <SidebarContent employee={employee} view={view} navigation={navigation} onNavigate={navigate} onLogout={() => void logout()} onClose={() => setMenuOpen(false)} />
      </Box>

      <section className="content">
        <header className="topbar">
          <IconButton className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Navigation öffnen" sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
            <Menu size={22} />
          </IconButton>
          <div>
            <p className="eyebrow">OpenHR</p>
            <h1>{title}</h1>
          </div>
          <Badge badgeContent={notifications.length} color="error" overlap="circular">
            <IconButton className="icon-button notification-button" aria-label={`${notifications.length} Benachrichtigungen`} title="Benachrichtigungen" sx={{ bgcolor: 'background.paper' }}>
              <Bell size={20} />
            </IconButton>
          </Badge>
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

function SidebarContent({
  employee,
  view,
  navigation,
  onNavigate,
  onLogout,
  onClose,
}: {
  employee: Employee
  view: View
  navigation: Array<{ id: View; label: string; icon: typeof CalendarDays; visible: boolean }>
  onNavigate: (next: View) => void
  onLogout: () => void
  onClose: () => void
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'rgba(237, 243, 241, 0.94)' }}>
      <Box className="brand" sx={{ px: 1.5, pb: 2.5, alignItems: 'center' }}>
        <Box component="span" sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'primary.main', color: 'common.white', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>OH</Box>
        <Typography component="strong" sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'text.primary' }}>OpenHR</Typography>
        <IconButton className="icon-button close-menu" onClick={onClose} aria-label="Navigation schließen" sx={{ ml: 'auto', display: { xs: 'inline-flex', md: 'none' } }}>
          <X size={20} />
        </IconButton>
      </Box>

      <List disablePadding sx={{ px: 1, py: 0, width: '100%' }}>
        {navigation.filter(item => item.visible).map(item => {
          const Icon = item.icon
          return (
            <ListItemButton
              key={item.id}
              onClick={() => onNavigate(item.id)}
              selected={view === item.id}
              sx={{ borderRadius: 1.5, mb: 0.5, px: 1.25, py: 0.9, color: view === item.id ? 'primary.dark' : 'text.secondary', bgcolor: view === item.id ? 'rgba(8,120,110,0.08)' : 'transparent', '&.Mui-selected': { bgcolor: 'rgba(8,120,110,0.10)', color: 'primary.dark' } }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <Icon size={19} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: view === item.id ? 700 : 500,
                  },
                }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Box className="profile" sx={{ mt: 'auto', px: 1.75, py: 1.5 }}>
        <Box>
          <Typography component="strong" sx={{ display: 'block', fontSize: '.9rem', fontWeight: 700 }}>{employee.displayName}</Typography>
          <Typography component="span" sx={{ color: 'text.secondary', fontSize: '.75rem' }}>{roleLabel(employee.role)}</Typography>
        </Box>
        <IconButton onClick={onLogout} aria-label="Abmelden" title="Abmelden" className="icon-button">
          <LogOut size={19} />
        </IconButton>
      </Box>
    </Box>
  )
}

function Calendar({ month, entries, onPrevious, onNext }: { month: Date; entries: CalendarEntry[]; onPrevious: () => void; onNext: () => void }) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(start)
  gridStart.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index))
  const label = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(month)

  return (
    <Paper elevation={0} className="calendar-panel" sx={{ overflow: 'hidden', borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box className="panel-heading" sx={{ px: 3, py: 2.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="overline" className="eyebrow" sx={{ color: 'primary.main', display: 'block', mb: 0.5 }}>Teamübersicht</Typography>
          <Typography variant="h5" component="h2" sx={{ m: 0 }}>{label}</Typography>
        </Box>
        <Box className="month-controls" sx={{ display: 'flex', gap: 1 }}>
          <IconButton className="icon-button" onClick={onPrevious} aria-label="Vorheriger Monat"><ChevronLeft size={20} /></IconButton>
          <IconButton className="icon-button" onClick={onNext} aria-label="Nächster Monat"><ChevronRight size={20} /></IconButton>
        </Box>
      </Box>

      <Box className="weekdays" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => <Box key={day} sx={{ py: 1.25, textAlign: 'center', color: 'text.secondary', fontSize: '.72rem', fontWeight: 700 }}>{day}</Box>)}
      </Box>

      <Box className="calendar-grid" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {days.map(day => {
          const value = dateValue(day)
          const relevant = entries.filter(entry => entry.startsOn <= value && entry.endsOn >= value)
          return (
            <Box
              key={value}
              className={`calendar-day ${day.getMonth() === month.getMonth() ? '' : 'outside'} ${day.getDay() === 0 || day.getDay() === 6 ? 'weekend' : ''}`}
              sx={{
                minHeight: { xs: 96, md: 140 },
                p: 1,
                borderTop: '1px solid',
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: day.getMonth() === month.getMonth() ? 'background.paper' : 'grey.50',
                color: 'text.primary',
                '&:nth-of-type(7n)': { borderRight: 0 },
              }}
            >
              <Box component="time" dateTime={value} sx={{ display: 'block', color: 'text.secondary', fontSize: '.8rem', fontWeight: 700 }}>{day.getDate()}</Box>
              <Box className="day-entries" sx={{ display: 'grid', gap: 0.6, mt: 0.7 }}>
                {relevant.map(entry => (
                  <Box
                    key={entry.id}
                    component="span"
                    className={entry.isOwn ? 'calendar-entry own' : 'calendar-entry'}
                    title={`${entry.employeeName}: ${entry.absenceType ?? 'Abwesend'}`}
                    sx={{
                      display: 'grid',
                      gap: 0.15,
                      p: 0.65,
                      borderRadius: 1,
                      borderLeft: '3px solid',
                      borderColor: entry.isOwn ? 'primary.main' : 'grey.400',
                      bgcolor: entry.isOwn ? 'rgba(8,120,110,0.08)' : 'grey.100',
                      color: entry.isOwn ? 'primary.dark' : 'text.primary',
                      overflow: 'hidden',
                    }}
                  >
                    <Box component="b" sx={{ fontSize: '.7rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.employeeName}</Box>
                    <Box component="em" sx={{ fontStyle: 'normal', fontSize: '.62rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.absenceType ?? 'Abwesend'}</Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}

function Requests({ types, absences, onCreated, setError }: { types: AbsenceType[]; absences: Absence[]; onCreated: () => void; setError: (value: string) => void }) {
  return (
    <Box className="stack" sx={{ display: 'grid', gap: 2.5 }}>
      <Paper elevation={0} className="form-panel" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box className="panel-heading" sx={{ px: 0, py: 0, pb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="overline" className="eyebrow" sx={{ color: 'primary.main', display: 'block', mb: 0.5 }}>Abwesenheit</Typography>
            <Typography variant="h5" component="h2" sx={{ m: 0 }}>Neuen Antrag stellen</Typography>
          </Box>
        </Box>
        <AbsenceForm types={types} onCreated={onCreated} setError={setError} />
      </Paper>

      <Paper elevation={0} className="list-panel" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>Meine Anträge</Typography>
        {absences.length === 0 ? <Empty text="Noch keine Anträge." /> : (
          <Box component="ul" className="data-list" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid' }}>
            {absences.map(absence => (
              <Box component="li" key={absence.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography component="strong" sx={{ display: 'block', fontWeight: 700 }}>{absence.absenceType.name}</Typography>
                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: '.85rem' }}>{germanDate(absence.startsOn)} bis {germanDate(absence.endsOn)} · {absence.amount} {absence.absenceType.unit === 'Hours' ? 'Std.' : 'Tage'}</Typography>
                </Box>
                <Status value={statusLabel(absence.status)} status={absence.status} />
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  )
}

function Approvals({ pending, onDecided, setError }: { pending: PendingAbsence[]; onDecided: () => void; setError: (value: string) => void }) {
  return (
    <Paper elevation={0} className="list-panel" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box className="panel-heading" sx={{ px: 0, py: 0, pb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="overline" className="eyebrow" sx={{ color: 'primary.main', display: 'block', mb: 0.5 }}>Eingang</Typography>
          <Typography variant="h5" component="h2" sx={{ m: 0 }}>Offene Freigaben</Typography>
        </Box>
      </Box>
      {pending.length === 0 ? <Empty text="Keine offenen Anträge." /> : (
        <Box component="ul" className="data-list" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid' }}>
          {pending.map(absence => (
            <Box component="li" key={absence.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography component="strong" sx={{ display: 'block', fontWeight: 700 }}>{absence.employee.displayName} · {absence.absenceType.name}</Typography>
                <Typography component="span" sx={{ color: 'text.secondary', fontSize: '.85rem' }}>{germanDate(absence.startsOn)} bis {germanDate(absence.endsOn)}</Typography>
              </Box>
              <Box className="row-actions" sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" onClick={() => void decide(absence.id, true, onDecided, setError)}>Genehmigen</Button>
                <Button variant="outlined" size="small" color="inherit" onClick={() => void decide(absence.id, false, onDecided, setError)}>Ablehnen</Button>
              </Box>
            </Box>
          ))}
        </Box>
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
    <Box className="admin-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(22rem, 1.15fr) minmax(18rem, .85fr) minmax(18rem, 1fr)' }, gap: 2.5 }}>
      <Paper elevation={0} className="form-panel" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box className="panel-heading" sx={{ px: 0, py: 0, pb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="overline" className="eyebrow" sx={{ color: 'primary.main', display: 'block', mb: 0.5 }}>Stammdaten</Typography>
            <Typography variant="h5" component="h2" sx={{ m: 0 }}>Mitarbeitende anlegen</Typography>
          </Box>
          <Plus size={22} />
        </Box>
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

      <Paper elevation={0} className="list-panel admin-list-panel" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>Konten</Typography>
        {employees.length === 0 ? <Empty text="Noch keine Konten." /> : (
          <Box component="ul" className="data-list admin-list" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid' }}>
            {employees.map(item => (
              <Box component="li" key={item.id} className={selectedEmployee?.id === item.id ? 'selected' : ''} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                <Button type="button" className="admin-account" onClick={() => setSelectedId(item.id)} sx={{ width: '100%', justifyContent: 'space-between', py: 1.25, px: 1, textAlign: 'left', color: 'text.primary', borderRadius: 1.5, bgcolor: selectedEmployee?.id === item.id ? 'rgba(8,120,110,0.08)' : 'transparent' }}>
                  <Box>
                    <Typography component="strong" sx={{ display: 'block', fontWeight: 700 }}>{item.displayName}</Typography>
                    <Typography component="span" sx={{ color: 'text.secondary', fontSize: '.85rem' }}>{item.email} · {roleLabel(item.role)}</Typography>
                  </Box>
                  <Typography component="span" className="vacation" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{item.vacationEntitlementDays} Urlaubstage</Typography>
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {selectedEmployee && (
        <Paper elevation={0} className="form-panel" sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Box className="panel-heading" sx={{ px: 0, py: 0, pb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="overline" className="eyebrow" sx={{ color: 'primary.main', display: 'block', mb: 0.5 }}>Details</Typography>
              <Typography variant="h5" component="h2" sx={{ m: 0 }}>{selectedEmployee.displayName} pflegen</Typography>
            </Box>
          </Box>
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
