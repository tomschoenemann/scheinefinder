# Scheinefinder

Scheinefinder ist eine Next.js-Anwendung zum Finden und Filtern von Geldautomaten.
Die Karte basiert auf MapLibre/OpenFreeMap; Geldautomatendaten kommen aus OpenStreetMap
und den kuratierten Einträgen in `data/custom-atms.json`.

## Entwicklung

```bash
npm install
npm run dev
```

Die wichtigsten Qualitätsprüfungen laufen gemeinsam mit:

```bash
npm run check
```

Der Befehl führt Typecheck, ESLint und die Unit-Tests aus. Ein Produktionsbuild kann
zusätzlich mit `npm run build` geprüft werden. Falls Turbopack in einer eingeschränkten
CI-Umgebung nicht starten kann, steht `npm run build:webpack` als verifizierte
Alternative bereit.

## Projektstruktur

- `app/`: Next.js-Routen, Layout und serverseitige API-Endpunkte.
- `features/atm-finder/`: interaktive Anwendung, Komponenten, Hook und Client-API.
- `lib/atms/`: frameworkunabhängige Domänenlogik und Eingabevalidierung.
- `lib/http/`: gemeinsame HTTP-Antworten und Cache-Header.
- `data/`: kuratierte Geldautomatendaten.
- `tests/`: Tests der kritischen, frameworkunabhängigen Funktionen.

## Verantwortlichkeiten

`app/page.tsx` setzt nur die ATM-Finder-Funktion zusammen. Der Hook
`useAtmFinder` koordiniert UI-Zustand und asynchrone Abläufe; er enthält keine
Formatierungs- oder Klassifikationsregeln. Komponenten rendern jeweils einen klar
abgegrenzten Teil der Oberfläche. Domänenregeln in `lib/atms` bleiben frei von React
und Next.js und sind dadurch direkt testbar.

Externe Geocoding- und Overpass-Aufrufe werden ausschließlich über Route Handler
ausgeführt. Diese validieren Eingaben, begrenzen Suchbereiche und geben nur die für
das Frontend benötigten Felder zurück.
