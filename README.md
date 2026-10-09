# OpenHR

## Ersten Administrator einrichten

Beim ersten Start existiert noch kein Konto. Setzen Sie deshalb die folgenden Werte als Umgebungsvariablen oder mit User Secrets, bevor OpenHR.Web gestartet wird:

```powershell
$env:BootstrapAdmin__Email = "admin@example.com"
$env:BootstrapAdmin__InitialPassword = "EinSicheres!Passwort123"
```

Das Bootstrap-Konto erhält die Rolle `Administrator` und muss sein initiales Passwort bei der ersten Anmeldung ändern. Danach können ausschließlich Administratoren über **Benutzerverwaltung** weitere Konten anlegen. Benutzer können in **Passkeys** einen Passkey registrieren und ihn anschließend alternativ zur E-Mail-/Passwort-Anmeldung verwenden.

## Betrieb mit Docker

```bash
cp .env.example .env   # Werte anpassen
docker compose up -d --build
```

Die Anwendung ist anschließend unter `http://localhost:8080` erreichbar (Port über `WEB_PORT` änderbar). Der Stack enthält SQL Server, Redis, `OpenHR.ApiService` und `OpenHR.Web`. Das Bootstrap-Administratorkonto wird über `BOOTSTRAP_ADMIN_EMAIL` und `BOOTSTRAP_ADMIN_PASSWORD` in der `.env` festgelegt.
