# Minimalist Drumcomputer (80s/90s)

Ein minimalistischer Web-basierter Drumcomputer im Stil der 80er/90er Jahre, gebaut mit React und der Web Audio API.

## Features

- 🎵 **Multi-Bar Looping**: 1-4 Bars mit je 16 Steps
- 🎚️ **Tempo Control**: 50-220 BPM
- 🎶 **Swing**: 0-60% für authentischen Groove
- 🔇 **Practice Gaps**: Macro-Timing Training mit programmierbaren Stille-Fenstern
- 🥁 **3 Tracks**: Kick, Snare, Hi-Hat mit synthetisierten 808-ähnlichen Sounds
- ⚡ **Live Editing**: Änderungen während der Wiedergabe werden sofort übernommen
- 👁️ **Visual Playhead**: Aktuelle Position wird klar hervorgehoben
- 🎨 **Presets**: Classic und New Jack Patterns

## Installation

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Production Build erstellen
npm run build
```

## Verwendung

1. Öffne http://localhost:5173 nach dem Start
2. Klicke auf "Start" um die Wiedergabe zu beginnen
3. Klicke auf die Step-Buttons um Patterns zu erstellen
4. Nutze die Presets als Ausgangspunkt
5. Experimentiere mit Swing und Practice Gaps für Timing-Training

## Technologie

- React 18
- Vite
- Tailwind CSS
- Web Audio API (keine externen Samples)

## Browser-Kompatibilität

Funktioniert am besten in modernen Browsern mit Web Audio API Unterstützung (Chrome, Firefox, Safari, Edge).

## Tipps

- Halte den Tab im Vordergrund für beste Performance
- Die Practice Gaps sind ideal für Macro-Timing Training
- Swing verleiht dem Beat mehr Groove durch Verschiebung der Off-Beat 16tel

## Lizenz

MIT