# Datenschutz- und Compliance-Spezifikation

## Ziel und Grenze

OpenHR wird für ein Unternehmen in Deutschland entwickelt und muss die
technischen Voraussetzungen für DSGVO-konforme Verarbeitung schaffen.
Technik ersetzt keine Rechtsprüfung: Rechtsgrundlagen, Informationspflichten,
Verzeichnis von Verarbeitungstätigkeiten, TOMs und gegebenenfalls
Auftragsverarbeitungsverträge müssen vor Produktivbetrieb durch den
Verantwortlichen rechtlich geprüft und organisatorisch umgesetzt werden.

## Datenschutz durch Gestaltung

- Datensparsamkeit: Nur die in `product.md` aufgeführten Stammdaten werden
  verarbeitet.
- Zweckbindung: Abwesenheits- und Zeitkontodaten dienen ausschließlich
  Personalplanung, Freigabe und den dokumentierten Auswertungen.
- Zugriffstrennung: Rollen und Teamzuordnung werden serverseitig erzwungen.
- Vertraulichkeit: TLS, sichere Geheimnisverwaltung, sichere
  Authentifizierung, Eingabevalidierung und Auditierung sind Pflicht.
- Offline-Daten: Sensible Cache-Daten sind auf verwaltete persönliche Geräte
  beschränkt und werden beim Logout gelöscht.

Krankheitsgründe, Diagnosen, Atteste und sonstige Gesundheitsdaten werden
nicht modelliert oder gespeichert. Der neutrale Teamkalender verhindert, dass
Mitarbeiter die Ursache einer Abwesenheit anderer Personen erfahren.

## Betroffenenprozesse

Ein Administrator-Dashboard muss folgende unterstützte Prozesse anbieten:

1. Auskunftsexport je betroffener Person.
2. Berichtigung über die Stammdatenverwaltung.
3. Protokolliertes Sperren und Löschen nach Austritt oder Anfrage.
4. Konfiguration und Anwendung von Aufbewahrungsregeln.
5. Export von Auditdaten und Übersichten für Verarbeitungsprozesse.

Aufbewahrungsregeln sind konfigurierbar. Standardwerte müssen als
rechtlich zu prüfende Voreinstellungen gekennzeichnet sein; sie dürfen keine
unbegründeten gesetzlichen Fristen behaupten. Löschläufe müssen protokolliert
sein und dürfen Daten mit aktiver rechtlicher Aufbewahrungssperre nicht
entfernen.

## Auditierung und Auswertungen

Auditdaten enthalten das erforderliche Ereignis, Akteur, Zeitpunkt, betroffene
Ressource und Ergebnis, jedoch keine vermeidbaren Klartextinhalte. Reports
werden stets nach Rolle und Team gefiltert. Eine Auswertung darf nie
Mitarbeiterdaten außerhalb der autorisierten Sichtbarkeit offenlegen.
