import './App.css'

const capabilities = [
  'Abwesenheiten und Urlaubsfreigaben',
  'Nachvollziehbare Überstundensalden',
  'Offlinefähig auf verwalteten Geräten',
]

function App() {
  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">OpenHR</p>
        <h1>Personalverwaltung, die Privatsphäre respektiert.</h1>
        <p className="intro">
          Die PWA wird schrittweise um sichere Konten, Abwesenheiten,
          Zeitkonten und Teamübersichten erweitert.
        </p>
      </header>

      <section aria-labelledby="foundation-heading">
        <h2 id="foundation-heading">Grundlage bereit</h2>
        <ul>
          {capabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
