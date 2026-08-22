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
3. In `apps\api` `dotnet run` starten.

Für die containerisierte Referenzbereitstellung `POSTGRES_PASSWORD` setzen und
anschließend `docker compose up --build` ausführen.

`/health/live` prüft die Prozessverfügbarkeit; `/health/ready` prüft zusätzlich
die Datenbankverbindung.
