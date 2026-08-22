# Technische Spezifikation

## Systemform

OpenHR ist ein Monorepo. `apps/api` ist eine ASP.NET-Core-REST-API,
`apps/web` eine React-/TypeScript-PWA und PostgreSQL die einzige
Produktionsdatenbank. Docker Compose ist die Referenzbereitstellung für
Cloud- und On-Premises-Betrieb; eine extern betriebene PostgreSQL-Instanz
bleibt zulässig.

Der aktuell umgesetzte Startpunkt enthält eine PWA mit Service Worker, einen
ASP.NET-Core-Health-Check unter `/health/live` und
`/health/ready` sowie den versionierten Statusendpunkt
`GET /api/v1/status`.

## API

Alle Fachendpunkte liegen unter `/api/v1`. Die API ist die alleinige
Autorisierungs- und Sichtbarkeitsgrenze und liefert validierte,
maschinenlesbare Fehler. Listenendpunkte werden paginiert.

Die PWA ist der einzige aktivierte Client des MVP. Die Schnittstelle wird
versioniert und so strukturiert, dass spätere Server-zu-Server-Integrationen
mit einem separaten Token- und Berechtigungsmodell ergänzt werden können.
Externe API-Clients sind bis dahin nicht aktiviert. Ein OpenAPI-Vertrag wird
erst eingeführt, wenn eine nicht verwundbare, mit der verwendeten
ASP.NET-Core-Version kompatible Abhängigkeit feststeht.

## Identität und Sicherheit

Lokale Konten nutzen sichere Passwortspeicherung, kurzlebige Sessions und
Refresh-Tokens. WebAuthn/Passkeys sind optional und an die konfigurierte
Relying Party gebunden. Aktivierungs- und Reset-Tokens sind einmalig und
zeitlich begrenzt.

TLS, sichere HTTP-Header, CSRF-Schutz, Rate Limits, serverseitige
Eingabevalidierung, Secret Stores und Abhängigkeitsprüfungen sind verbindliche
Produktionsanforderungen. Zugangsdaten dürfen nie in Konfigurationsdateien
eingecheckt werden.

## Offline und Synchronisation

Die PWA speichert nur rollenerforderliche Daten in IndexedDB, ausschließlich
auf persönlichen oder verwalteten Geräten. Beim Logout und
Benutzerwechsel wird der lokale Cache gelöscht. Gemeinsam genutzte Rechner
sind online-only.

Lokale Mutationen werden in einer Outbox mit Client-ID, Idempotenzschlüssel,
Änderungsbasis und Version gespeichert. Der Sync-Endpunkt antwortet mit
akzeptierten Operationen, serverseitigen Änderungen oder strukturierten
Konflikten. Nicht automatisch auflösbare Konflikte werden mit lokalem und
Serverstand angezeigt und müssen ausdrücklich entschieden werden. „Letzter
Schreibvorgang gewinnt“ ist verboten.

## Daten und Auditierung

PostgreSQL-Migrationen und Testdaten müssen reproduzierbar sein.
Überstundenkorrekturen entstehen als Gegen- oder Korrekturbuchung. Ein
manipulationsgeschütztes Audit-Protokoll erfasst Anmeldungen, sensible
Lesezugriffe, Stammdatenänderungen, Buchungen, Freigaben, Importe, Exporte und
Datenschutzprozesse. Nur Administratoren dürfen es einsehen.

## Qualität und Betrieb

CI führt Linting, statische Analyse sowie Abhängigkeits- und Sicherheitschecks
aus. Es gibt Domain- und API-Integrationstests gegen PostgreSQL,
React-Komponententests und End-to-End-Tests für Einladung, Passkey, Rechte,
Freigaben, Offline-Synchronisation und Konflikte.

Der Betreiber stellt verschlüsselte tägliche PostgreSQL-Backups,
Zugriffstrennung und regelmäßig getestete Wiederherstellungen sicher. Die
Referenzbereitstellung dokumentiert diese Anforderungen; OpenHR implementiert
keine eigene Backup-Engine.
