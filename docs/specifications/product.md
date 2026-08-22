# Produkt- und Fachspezifikation

## Geltungsbereich

OpenHR ist eine installierbare, deutschsprachige Browser-PWA für genau ein
Unternehmen in Deutschland. Sie verwaltet Vertrauensarbeitszeit,
Abwesenheiten, Urlaubsfreigaben und Auswertungen. Das Produkt ist nicht
mehrmandantenfähig.

## Rollen und Rechte

| Rolle | Darf |
| --- | --- |
| Mitarbeiter | Eigene Stammdaten im zulässigen Umfang, eigene Zeitkonto- und Urlaubsstände, eigene Buchungen und Anträge sehen und erstellen. |
| Manager | Das zugeordnete Team neutral im Kalender sehen, tatsächliche Abwesenheitstypen des Teams sehen, ihm zugewiesene Buchungen prüfen und ihm zugewiesene Anträge freigeben. |
| Administrator | Minimale Stammdaten, Zuordnungen, Regeln, Importe, Auswertungen, Auditdaten und Datenschutzprozesse verwalten. |

Es gibt keine konfigurierbaren Rollen, mehrstufigen Freigabeketten,
automatischen Vertretungen oder separaten HR-Rollen. Ein Mitarbeiter kann
einem Manager als Teammitglied und einem (optional anderen)
Urlaubsfreigabe-Manager zugeordnet sein.

## Stammdaten

Erlaubt und erforderlich sind ausschließlich Anzeigename, geschäftliche
E-Mail-Adresse, Eintrittsdatum, Austrittsdatum, Rolle, zugeordneter Manager,
Urlaubskontingent sowie optionaler Urlaubsfreigabe-Manager. Private
Kontaktdaten, Anschriften, Bankdaten, Personalakten, Diagnosen und Atteste
gehören nicht zu OpenHR.

Neue Konten werden vom Administrator angelegt. Der Mitarbeiter erhält einen
einmaligen, zeitlich begrenzten Aktivierungslink, setzt ein Passwort und kann
einen Passkey hinzufügen. Bei verlorenem Zugang setzt der Administrator den
Zugang nach dem dokumentierten Verfahren zurück. Selbstregistrierung ist nicht
Teil des MVP.

## Zeitkonto und Überstunden

Es gibt keinen Sollarbeitsplan, keine Beginn-/Ende-/Pausenerfassung, keine
Schichtplanung und keine Aktivitäts- oder Standortüberwachung. Ein Mitarbeiter
trägt ausschließlich Abweichungen ein:

- positive Stunden erhöhen das Zeitkonto;
- negative Stunden vermindern es;
- Überstundenabbau ist eine stundenweise Abwesenheit, welche das Zeitkonto
  vermindert.

Jede Überstundenbuchung wird sofort als **vorläufig** wirksam und löst eine
Managerbenachrichtigung aus. Der Manager kann sie bestätigen, beanstanden oder
durch eine neue Korrekturbuchung korrigieren. Vorhandene Buchungen werden nie
überschrieben. Die Oberfläche zeigt bestätigten Saldo, vorläufige Änderung und
einen optionalen, eindeutig als vorläufig markierten Gesamtsaldo getrennt.

## Abwesenheiten und Urlaub

Der Administrator kann Abwesenheitstypen anlegen. Für frei konfigurierbare
Typen gilt global entweder „keine Freigabe“ oder „Managerfreigabe erforderlich“.
Krankheit wird lediglich gemeldet und niemals genehmigt; sie speichert weder
Diagnosen noch Atteste.

| Typ | Umfang | Freigabe |
| --- | --- | --- |
| Urlaub | volle oder halbe Arbeitstage | optionaler Urlaubsfreigabe-Manager des Mitarbeiters |
| Überstundenabbau | Stunden | optionaler Urlaubsfreigabe-Manager des Mitarbeiters |
| Krankheit | nach Typkonfiguration | keine |
| Frei konfigurierbarer Typ | nach Typkonfiguration | globale Regel des Typs |

Der Administrator pflegt Jahreskontingent und Startsaldo jedes Mitarbeiters
manuell. Der Urlaubssaldo vermindert sich durch genehmigten Urlaub.
Automatische Anspruchsberechnung bei Eintritt/Austritt, Überträge und
Verfallsfristen sind ausdrücklich nicht Teil des MVP.

Ein unternehmensweiter Feiertagskalender wird für ein deutsches Bundesland
ausgewählt. Der Administrator kann betriebliche Schließtage ergänzen oder
ausnehmen. Urlaubstage berücksichtigen Wochenenden, diesen Kalender und
Schließtage.

## Sichtbarkeit

Mitarbeiter sehen im Teamkalender für andere Mitarbeiter nur Name, Datum und
den neutralen Status „anwesend“ oder „abwesend“. Sie sehen weder
Abwesenheitstyp noch Urlaub, Krankheit, Salden oder Antragsdetails anderer
Personen. Manager sehen die Abwesenheitstypen ihres Teams, jedoch niemals
Krankheitsdetails. Jeder Mitarbeiter sieht seine eigenen vollständigen Daten.
Diese Grenzen müssen durch API- und Datenbankabfragen erzwungen werden, nicht
nur durch die PWA.

## Benachrichtigungen und Auswertungen

In-App-Benachrichtigungen sind der verbindliche Kanal für
Überstundenprüfungen, Anträge und Entscheidungen. E-Mail-Hinweise an
geschäftliche Adressen sind optional; Web Push gehört nicht zum MVP.

Administratoren sehen unternehmensweite, Manager teamgefilterte Charts für
Abwesenheiten nach Typ, Urlaubsverbrauch und -rest, Überstundensalden sowie
ausstehende Freigaben. Mitarbeiter sehen ausschließlich ihre eigenen Werte.
Jedes Diagramm benötigt eine zugängliche tabellarische Alternative.

## Import und ausdrücklich ausgeschlossener Umfang

CSV-Import unterstützt minimale Mitarbeiterstammdaten sowie anfängliche
Urlaubs- und Überstundensalden. Historische Einzelbuchungen werden nicht
importiert.

Nicht im MVP: Mehrmandantenbetrieb, externe API-Clients, Schicht-,
Einsatz- oder Projektplanung, vollständige Arbeitszeiterfassung,
automatische Vertretungen, mehrstufige Freigaben und frei konfigurierbare
Berichte.
