# Drumcomputer

Web-basierter Drumcomputer mit 8 synthetisierten Drum-Voices, gebaut mit React und der Web Audio API.

## Features

- **8 Drum Tracks**: Kick, Snare, Hi-Hat, Open Hat, Clap, Cymbal, Tom, Rimshot
- **3-State Velocity**: Off → Normal → Accent pro Step
- **Multi-Bar Looping**: 1-4 Bars mit je 16 Steps
- **Tempo & Swing**: 50-220 BPM, 0-60% Swing
- **Timing Trainer**: 6 Modi (Call & Response, Steady Gap, Deep Dive, Check-In, Fade Away, Custom)
- **Mixer**: Per-Track Volume, Mute, Solo
- **Effects**: Master Reverb, Compressor, Per-Voice Tuning & Decay
- **Bass Drone**: Einstellbare Referenz-Note (A0-C3)
- **Pattern Management**: 8 Save-Slots, URL Sharing, WAV Export
- **Undo/Redo**: 50-Step History (Ctrl+Z / Ctrl+Shift+Z)
- **Dark Mode**: Toggle mit D-Taste
- **Copy/Paste**: Tracks zwischen Spuren kopieren
- **Tap Tempo**: BPM per Tap eingeben

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Web Audio API (keine externen Samples)
- Vitest + React Testing Library (Tests)

## Getting Started

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten (Port 3032)
npm run dev

# Production Build
npm run build

# Tests ausfuehren
npm test

# Tests im Watch-Modus
npm run test:watch

# Tests mit Coverage-Report
npm run test:coverage
```

## Projekt-Struktur

```
src/
├── audio/
│   ├── AudioEngine.js      # Audio-Routing: Gains, Reverb, Compressor
│   └── DrumSynths.js       # 8 synthetisierte Drum-Voices
├── components/
│   ├── Drumcomputer.jsx     # Haupt-Orchestrator
│   ├── TrackGrid.jsx        # Step-Sequencer Grid pro Track
│   ├── GroovePresets.jsx    # 8 Preset-Buttons + Clear
│   ├── TempoSwing.jsx       # BPM + Swing Slider
│   ├── LoopSettings.jsx     # Bar-Selector (1-4)
│   ├── TimingTrainer.jsx    # 6 Trainer-Modi UI
│   ├── DroneSection.jsx     # Bass Drone Toggle + Note
│   ├── PatternManager.jsx   # Save/Load/Share/Export
│   └── EffectsPanel.jsx     # Reverb, Compressor, Voice Shaping
├── hooks/
│   ├── useScheduler.js      # Audio-Scheduling (setInterval + RAF)
│   ├── useTimingTrainer.js  # Gap-Logik fuer Timing-Training
│   ├── useKeyboardShortcuts.js  # Globale Keyboard-Shortcuts
│   ├── useTapTempo.js       # Tap-Tempo BPM-Berechnung
│   └── useUndoRedo.js       # 50-Step Undo/Redo Stack
├── utils/
│   ├── patternHelpers.js    # Pattern-Funktionen, Konstanten, Presets
│   ├── patternStorage.js    # LocalStorage + URL Encoding
│   └── wavExport.js         # Offline-Rendering + WAV-Konvertierung
└── test/
    └── setup.js             # Web Audio API Mocks fuer Tests
```

## Keyboard Shortcuts

| Taste | Aktion |
|-------|--------|
| `Space` | Start / Stop |
| `T` | Tap Tempo |
| `G` | Timing Trainer Toggle |
| `D` | Dark Mode Toggle |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

## Browser-Kompatibilitaet

Funktioniert in modernen Browsern mit Web Audio API (Chrome, Firefox, Safari, Edge).

## Lizenz

MIT
