# SV Lau-Brechte – Online-Beitrittserklärung

Mobile-first Web-App für den **Schützenverein Lau-Brechte e.V., Ochtrup** zur digitalen Aufnahme von Mitgliedsanträgen.

## Features

- 5-Schritt-Wizard (Daten → Datenschutz → Foto/Film → Unterschrift → Versand)
- Unterschrift per Finger oder Stylus (Touch + Maus, retina-fähig)
- PDF-Generierung clientseitig (pdf-lib, vendored, kein CDN)
- Pixelnah zur Vereins-Vorlage (Logo, Layout, Datenschutztext)
- Download + E-Mail-Versand an `info@schuetzenverein-lau-brechte.de`
- PWA — installierbar, offline-fähig
- Dark-Mode-Unterstützung
- Keine externen Tracker, keine Bankverbindungs-Erhebung

## Stack

- Single-File-HTML + `vendor/`
- pdf-lib 1.17.1 (lokal)
- Service Worker (network-first HTML, cache-first Assets)
- Deploy: Vercel (Auto-Deploy bei Push auf `main`)

## Lokal entwickeln

```bash
python -m http.server 8765
# http://localhost:8765
```

## PDF-Koordinaten

In `index.html` → `COORDS`-Objekt — bei Bedarf nachjustieren.
A4 = 595×842 pt, Origin unten-links.

## Verein

Schützenverein Lau-Brechte e.V., Ochtrup · seit 1645
