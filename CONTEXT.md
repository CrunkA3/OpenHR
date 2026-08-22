# OpenHR

OpenHR verwaltet Abwesenheiten, Urlaubsansprüche und Vertrauensarbeitszeit für
ein einzelnes Unternehmen in Deutschland. Die Begriffe definieren die
fachliche Sprache für Produkt, API und Datenmodell.

## Personen und Zuständigkeiten

**Mitarbeiter**:
Eine Person mit einem OpenHR-Konto, eigenen Salden und Abwesenheitsanträgen.
_Avoid_: Benutzer, Arbeitnehmer

**Manager**:
Ein Mitarbeiter mit Einsicht in sein zugeordnetes Team und den dort
erforderlichen Prüf- und Freigabeaufgaben.
_Avoid_: Vorgesetzter, Genehmiger

**Administrator**:
Die Rolle, welche Mitarbeiterstammdaten, Systemregeln und
Datenschutzprozesse verwaltet.
_Avoid_: HR, Superuser

**Urlaubsfreigabe-Manager**:
Der optional je Mitarbeiter festgelegte Manager, der dessen Urlaub und
Überstundenabbau freigibt.
_Avoid_: Vertreter, Freigabekette

## Zeit und Abwesenheit

**Zeitkonto**:
Die Summe der positiven und negativen Überstundenbuchungen eines Mitarbeiters,
getrennt nach bestätigtem und vorläufigem Stand.
_Avoid_: Sollzeit, Zeiterfassung

**Überstundenbuchung**:
Eine vom Mitarbeiter erfasste positive oder negative Änderung des Zeitkontos,
die ein Manager nachträglich prüft.
_Avoid_: Arbeitszeiteintrag, Korrektur des Saldos

**Überstundenabbau**:
Eine stundenweise Abwesenheit, die Zeitkonto-Stunden verbraucht und der
individuellen Freigaberegel folgt.
_Avoid_: Freizeit, Gleitzeittag

**Abwesenheitsantrag**:
Ein Antrag für einen konfigurierten Abwesenheitstyp mit Zeitraum, Umfang,
Status und gegebenenfalls Freigabe.
_Avoid_: Urlaubseintrag, Fehlzeit

**Abwesenheitstyp**:
Eine zentral konfigurierte Kategorie für Abwesenheitsanträge mit
Sichtbarkeits- und Freigaberegel.
_Avoid_: Krankheitsgrund, Status

**Neutraler Abwesenheitsstatus**:
Die einzige Teamansicht für Mitarbeiter: Eine andere Person ist an einem Datum
anwesend oder abwesend, ohne Ursache oder Saldo.
_Avoid_: Abwesenheitsgrund
