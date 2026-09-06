# OpenHR

## Ersten Administrator einrichten

Beim ersten Start existiert noch kein Konto. Setzen Sie deshalb die folgenden Werte als Umgebungsvariablen oder mit User Secrets, bevor OpenHR.Web gestartet wird:

```powershell
$env:BootstrapAdmin__Email = "admin@example.com"
$env:BootstrapAdmin__InitialPassword = "EinSicheres!Passwort123"
```

Das Bootstrap-Konto erhält die Rolle `Administrator` und muss sein initiales Passwort bei der ersten Anmeldung ändern. Danach können ausschließlich Administratoren über **Benutzerverwaltung** weitere Konten anlegen. Benutzer können in **Passkeys** einen Passkey registrieren und ihn anschließend alternativ zur E-Mail-/Passwort-Anmeldung verwenden.
