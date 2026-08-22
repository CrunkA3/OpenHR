/* oxlint-disable react(set-state-in-effect) */
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Employee = { id: string; displayName: string; email: string; role: 'Employee' | 'Manager' | 'Administrator'; vacationEntitlementDays: number }
type AbsenceType = { id: string; name: string; unit: 'Workdays' | 'Hours'; isVacation: boolean }
type Absence = { id: string; startsOn: string; endsOn: string; amount: number; status: string; absenceType: AbsenceType }
type PendingAbsence = Absence & { employee: { displayName: string } }
type Notification = { id: string; message: string; createdAt: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { title?: string } | null
    throw new Error(error?.title ?? 'Die Anfrage konnte nicht verarbeitet werden.')
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

function App() {
  const [employee, setEmployee] = useState<Employee>()
  const [types, setTypes] = useState<AbsenceType[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [pending, setPending] = useState<PendingAbsence[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const current = await request<Employee>('/api/v1/auth/me')
      const [absenceTypes, mine, inbox] = await Promise.all([
        request<AbsenceType[]>('/api/v1/absences/types'),
        request<Absence[]>('/api/v1/absences/mine'),
        request<Notification[]>('/api/v1/notifications'),
      ])
      setEmployee(current); setTypes(absenceTypes); setAbsences(mine); setNotifications(inbox)
      if (current.role !== 'Employee') setPending(await request<PendingAbsence[]>('/api/v1/absences/pending').catch(() => []))
    } catch {
      setEmployee(undefined)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (!employee) return <Login onLogin={() => void load()} error={error} setError={setError} />

  const logout = async () => { await request<void>('/api/v1/auth/logout', { method: 'POST' }); setEmployee(undefined) }
  return (
    <main className="app-shell">
      <header className="app-header">
        <div><p className="eyebrow">OpenHR</p><h1>Abwesenheiten</h1></div>
        <div><strong>{employee.displayName}</strong><button className="secondary" onClick={() => void logout()}>Abmelden</button></div>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      <section>
        <h2>Neuen Antrag stellen</h2>
        <AbsenceForm types={types} onCreated={() => void load()} setError={setError} />
      </section>
      <section>
        <h2>Meine Anträge</h2>
        {absences.length === 0 ? <p>Noch keine Anträge.</p> : <ul>{absences.map((absence) => <li key={absence.id}><strong>{absence.absenceType.name}</strong>: {absence.startsOn} bis {absence.endsOn} ({absence.amount}) — <em>{absence.status}</em></li>)}</ul>}
      </section>
      {employee.role !== 'Employee' && <section><h2>Zur Entscheidung</h2>{pending.length === 0 ? <p>Keine offenen Anträge.</p> : <ul>{pending.map((absence) => <li key={absence.id}>{absence.employee.displayName}: {absence.absenceType.name} vom {absence.startsOn} <button onClick={() => void decide(absence.id, true, load, setError)}>Genehmigen</button><button className="secondary" onClick={() => void decide(absence.id, false, load, setError)}>Ablehnen</button></li>)}</ul>}</section>}
      <section><h2>Benachrichtigungen</h2>{notifications.length === 0 ? <p>Keine neuen Benachrichtigungen.</p> : <ul>{notifications.map((notification) => <li key={notification.id}>{notification.message}</li>)}</ul>}</section>
    </main>
  )
}

function Login({ onLogin, error, setError }: { onLogin: () => void; error: string; setError: (value: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    const data = new FormData(event.currentTarget)
    try { await request<Employee>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) }); onLogin() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Anmeldung fehlgeschlagen.') }
  }
  return <main className="app-shell login"><p className="eyebrow">OpenHR</p><h1>Anmelden</h1>{error && <p className="error" role="alert">{error}</p>}<form onSubmit={(event) => void submit(event)}><label>Geschäftliche E-Mail<input name="email" type="email" required /></label><label>Passwort<input name="password" type="password" minLength={12} required /></label><button>Anmelden</button></form></main>
}

function AbsenceForm({ types, onCreated, setError }: { types: AbsenceType[]; onCreated: () => void; setError: (value: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    const data = new FormData(event.currentTarget)
    try {
      await request('/api/v1/absences/mine', { method: 'POST', body: JSON.stringify({ absenceTypeId: data.get('type'), startsOn: data.get('start'), endsOn: data.get('end'), amount: Number(data.get('amount')), note: data.get('note') || null }) })
      event.currentTarget.reset(); onCreated()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Der Antrag konnte nicht erstellt werden.') }
  }
  return <form className="absence-form" onSubmit={(event) => void submit(event)}><label>Typ<select name="type" required>{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label>Von<input name="start" type="date" required /></label><label>Bis<input name="end" type="date" required /></label><label>Stunden (nur Stunden-Typen)<input name="amount" type="number" min="0.5" step="0.5" defaultValue="0" /></label><label>Hinweis<input name="note" maxLength={500} /></label><button>Antrag einreichen</button></form>
}

async function decide(id: string, approve: boolean, load: () => Promise<void>, setError: (value: string) => void) {
  try { await request(`/api/v1/absences/${id}/decision`, { method: 'POST', body: JSON.stringify({ approve, note: null }) }); await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Die Entscheidung konnte nicht gespeichert werden.') }
}

export default App
