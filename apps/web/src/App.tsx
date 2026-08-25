/* oxlint-disable react(set-state-in-effect) */
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock3, LogOut, Menu, Sparkles, TrendingUp, Users, X } from 'lucide-react'
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  ThemeProvider,
  TextField,
  Toolbar,
  Typography,
  createTheme,
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

const theme = createTheme({
  palette: {
    primary: { main: '#08786e', light: '#d7ebe5', dark: '#075d56' },
    secondary: { main: '#4b5567' },
    background: { default: '#f4f6f8', paper: '#ffffff' },
    text: { primary: '#17233a', secondary: '#68758a' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, "Segoe UI", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderColor: '#dce2e9' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiSelect: {
      defaultProps: { variant: 'outlined' },
    },
  },
})

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '16.5rem minmax(0, 1fr)' }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Drawer
          variant="temporary"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: 264, boxSizing: 'border-box', bgcolor: '#edf3f1', borderRight: '1px solid #d4dce5' },
          }}
        >
          <SidebarContent employee={employee} view={view} navigation={navigation} navigate={navigate} logout={logout} onClose={() => setMenuOpen(false)} />
        </Drawer>

        <Box component="aside" sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', width: '100%', height: '100vh', position: 'sticky', top: 0, bgcolor: '#edf3f1', borderRight: '1px solid #d4dce5', p: 2.5 }}>
          <SidebarContent employee={employee} view={view} navigation={navigation} navigate={navigate} logout={logout} onClose={() => setMenuOpen(false)} desktop />
        </Box>

        <Box component="section" sx={{ width: '100%', maxWidth: '88rem', px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
          <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2, bgcolor: 'transparent' }}>
            <Toolbar disableGutters sx={{ minHeight: 'unset', px: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <IconButton color="primary" sx={{ display: { xs: 'inline-flex', md: 'none' }, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }} onClick={() => setMenuOpen(true)} aria-label="Navigation öffnen">
                <Menu size={22} />
              </IconButton>
              <Box>
                <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 1.2, fontWeight: 700 }}>OpenHR</Typography>
                <Typography variant="h4" sx={{ lineHeight: 1.1 }}>{title}</Typography>
              </Box>
              <IconButton color="primary" sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', position: 'relative' }} aria-label={`${notifications.length} Benachrichtigungen`} title="Benachrichtigungen">
                <Bell size={20} />
                <Box component="span" sx={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: '50%', bgcolor: '#e6613d', color: 'white', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{notifications.length}</Box>
              </IconButton>
            </Toolbar>
          </AppBar>

          {error && <Box component="p" sx={{ mb: 2, p: 1.5, borderLeft: 4, borderColor: 'error.main', bgcolor: 'rgba(211,47,47,0.08)', color: 'error.main', borderRadius: 1 }}>{error}</Box>}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            {kpiCards.map(card => (
              <Paper key={card.label} variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 3, minWidth: 0 }}>
                <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.04 }}>{card.label}</Typography>
                  <Box sx={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 2, bgcolor: card.tone === 'warning' ? 'rgba(199,122,18,0.1)' : card.tone === 'positive' ? 'rgba(8,120,110,0.1)' : 'rgba(75,85,103,0.08)', color: card.tone === 'warning' ? '#c77a12' : card.tone === 'positive' ? '#08786e' : '#4b5567' }}>
                    {card.tone === 'warning' ? <Clock3 size={16} /> : card.tone === 'positive' ? <TrendingUp size={16} /> : <Sparkles size={16} />}
                  </Box>
                </Stack>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{card.value}</Typography>
                <Typography variant="caption" color="text.secondary">{card.trend}</Typography>
              </Paper>
            ))}
          </Stack>

          {view === 'calendar' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.8fr) minmax(18rem, .7fr)' }, gap: 2.5, alignItems: 'start' }}>
              <Calendar month={month} entries={entries} onPrevious={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} onNext={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} />
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}>Aussichten</Typography>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Bevorstehende Abwesenheiten</Typography>
                <Stack spacing={1.5}>
                  {upcomingAbsences.length === 0 ? <Typography color="text.secondary">Keine geplanten Abwesenheiten.</Typography> : upcomingAbsences.map(absence => (
                    <Box key={absence.id} sx={{ border: '1px solid', borderColor: 'divider', borderLeft: 3, borderLeftColor: 'primary.main', borderRadius: 2, p: 1.5, bgcolor: '#f8fbfb' }}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{absence.absenceType.name}</Typography>
                        <Status value={statusLabel(absence.status)} status={absence.status} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{germanDate(absence.startsOn)} bis {germanDate(absence.endsOn)}</Typography>
                      <Typography variant="body2" color="text.secondary">{absence.amount} {absence.absenceType.unit === 'Hours' ? 'Std.' : 'Tage'}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Box>
          )}

          {view === 'requests' && <Requests types={types} absences={absences} onCreated={() => void load()} setError={setError} />}
          {view === 'approvals' && <Approvals pending={pending} onDecided={() => void load()} setError={setError} />}
          {view === 'admin' && <Admin setError={setError} />}
        </Box>
      </Box>
    </ThemeProvider>
  )
}

function SidebarContent({ employee, view, navigation, navigate, logout, onClose, desktop = false }: { employee: Employee; view: View; navigation: { id: View; label: string; icon: typeof CalendarDays; visible: boolean }[]; navigate: (next: View) => void; logout: () => Promise<void>; onClose: () => void; desktop?: boolean }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, pb: 2.5, pt: 0.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'white', fontSize: 12, fontWeight: 800 }}>OH</Box>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>OpenHR</Typography>
        {!desktop && (
          <IconButton size="small" onClick={onClose} aria-label="Navigation schließen"><X size={18} /></IconButton>
        )}
      </Box>

      <Stack spacing={0.75} sx={{ px: 1 }}>
        {navigation.filter(item => item.visible).map(item => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              fullWidth
              variant={view === item.id ? 'contained' : 'text'}
              color={view === item.id ? 'primary' : 'inherit'}
              onClick={() => { navigate(item.id); onClose() }}
              sx={{
                justifyContent: 'flex-start',
                borderRadius: 2,
                px: 1.5,
                py: 1,
                color: view === item.id ? 'white' : '#425168',
                bgcolor: view === item.id ? 'primary.main' : 'transparent',
                '&:hover': { bgcolor: view === item.id ? 'primary.dark' : 'rgba(8,120,110,0.08)' },
              }}
              startIcon={<Icon size={18} />}
            >
              {item.label}
            </Button>
          )
        })}
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, px: 1.5, pt: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{employee.displayName}</Typography>
          <Typography variant="caption" color="text.secondary">{roleLabel(employee.role)}</Typography>
        </Box>
        <IconButton color="primary" aria-label="Abmelden" title="Abmelden" onClick={() => void logout()}>
          <LogOut size={18} />
        </IconButton>
      </Box>
    </>
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
