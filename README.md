[![CodeQL](https://github.com/CrunkA3/OpenHR/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/CrunkA3/OpenHR/actions/workflows/github-code-scanning/codeql)

# OpenHR

OpenHR ist eine deutsche, datensparsame HR-PWA für ein einzelnes Unternehmen.
Sie wird mit ASP.NET Core, React, PostgreSQL und Docker Compose entwickelt.

## Spezifikationen

- [Fachliche Anforderungen](docs/specifications/product.md)
- [Technische Architektur](docs/specifications/architecture.md)
- [Datenschutz und Compliance](docs/specifications/privacy.md)
- [Fachliches Glossar](CONTEXT.md)
- [Architekturentscheidungen](docs/adr/)

## Lokal starten

1. In `apps\web` `npm run dev` starten.
2. PostgreSQL bereitstellen und die Verbindungszeichenfolge
   `ConnectionStrings__OpenHrDatabase` setzen.
3. Für den ersten Start einen Administrator über die Umgebungsvariablen
   `Bootstrap__Email`, `Bootstrap__DisplayName` und ein mindestens
   zwölfstelliges `Bootstrap__Password` setzen und in `apps\api` `dotnet run`
   starten. Der Bootstrap greift nur, solange noch kein Konto existiert.

Für die containerisierte Referenzbereitstellung zuerst `.env.example` nach
`.env` kopieren und sämtliche Platzhalter durch eindeutige Geheimnisse
ersetzen. Anschließend `docker compose up --build` ausführen. Die
veröffentlichten HTTP-Ports sind nur für lokale Entwicklung geeignet; im
Produktivbetrieb muss ein TLS-terminierender Reverse Proxy vorgeschaltet
werden.

`/health/live` prüft die Prozessverfügbarkeit; `/health/ready` prüft zusätzlich
die Datenbankverbindung.
