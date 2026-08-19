# Smart Bio-Feedback Pomodoro (ZeppOS Mini-App)

Ein adaptiver Fokus-Timer für Amazfit Smartwatches, der Arbeits- und Pausenzeiten anhand realer Vitalwerte dynamisch anpasst.

## Funktionsweise
1. **Fokus-Phase (25 Min):** Während der Arbeitsphase werden Herzfrequenz (`HeartRate`) und Stresslevel (`Stress`) kontinuierlich abgetastet und aggregiert.
2. **Dynamische Bio-Feedback Evaluation:**
   - **Normale Vitalwerte:** Startet eine klassische 5-Minuten-Pause.
   - **Erhöhter Stress ($\\ge 60$) oder Puls ($\\ge 95\\text{ bpm}$):** Startet automatisch eine erweiterte **10-Minuten Decompression-Pause**.
3. **Geführtes Haptik-Breathing:** In der 10-minütigen Stresspause führt die Uhr einen 4-4-4 Atemzyklus (Einatmen $\\rightarrow$ Halten $\\rightarrow$ Ausatmen) mit dezenten Vibrations-Impulsen als Taktgeber durch.

## Projektstruktur
```
smart-pomodoro/
├── app.json
├── app.js
├── package.json
├── README.md
└── page/
    └── index.js
```

## Bauen und Starten
```bash
npm install -g @zeppos/zepp-cli
npm install
zepp build
zepp preview
```
