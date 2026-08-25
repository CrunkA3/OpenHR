---
name: frontend-ui
description: Verwende diesen Skill bei UI-Änderungen in der React-App, damit das Frontend konsistent, responsiv und hochwertig bleibt.
---

Ziel: Jede UI-Änderung in `/home/runner/work/OpenHR/OpenHR/apps/web` soll visuell konsistent, zugänglich und responsiv sein.

Arbeitsregeln:
1. Nutze bestehende Design-Patterns und Tokens aus `/home/runner/work/OpenHR/OpenHR/apps/web/src/App.css` und `/home/runner/work/OpenHR/OpenHR/apps/web/src/index.css` statt neue, inkonsistente Stile einzuführen.
2. Behalte einheitliche Abstände, Typografie, Button- und Panel-Varianten über alle Screens hinweg bei.
3. Stelle sicher, dass Änderungen auf Mobilgeräten funktionieren (insbesondere Breakpoints und Touch-Bedienbarkeit).
4. Berücksichtige Accessibility-Basics: semantische Elemente, sichtbarer Fokus, ausreichender Kontrast, sinnvolle Labels.
5. Implementiere vollständige Zustände für neue UI-Bausteine: loading, empty, error und success.
6. Vermeide große visuelle Umbauten, wenn nicht explizit gefordert; bevorzuge kleine, sichere Verbesserungen im bestehenden Stil.
7. Nach UI-Änderungen in `apps/web` immer validieren mit:
   - `npm run lint` (in `apps/web`)
   - `npm run build` (in `apps/web`)
