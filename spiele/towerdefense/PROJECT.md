# Tower Defense – Projekt Notizen (wichtig)

Diese Datei ist für „Regeln“ & Orientierung gedacht, damit neue Features/Upgrades **nicht** wieder an alten Problemen scheitern.

## Grundprinzipien

- **Tutorial ist simpel**: im Tutorial ist im Loadout **nur die Pistole** (keine Shop‑Türme).
- **Shop ≠ Loadout**: Kaufen heißt **besitzen**, aber **nicht automatisch ausrüsten**.
- **Start ist immer bewusst**: Wellen starten **nur** über `Start`.  
  Setting **Autostart** bedeutet: **nach** einer Welle startet die nächste automatisch.
- **Campaign**:
  - Beim Verlierern: **zurück auf Welle 1** (gleiches Level).
  - Münzen pro Level nur **einmalig**, aber **progressiv** (L1=50, L2=60, L3=70, …).

## Upgrade-Regel (sehr wichtig)

### 2‑2 Harmonie
- Wir haben 2 Upgrade‑Pfade A/B mit „2‑2 dann lock“.
- **Bis 2‑2 müssen beide Pfade immer harmonieren**:
  - A1/A2 und B1/B2 geben **immer** sinnvolle Boni.
  - Cross‑Path darf nicht „buggy“ wirken (keine Werte, die in andere Spezialisierungen „reinleaken“).

### Spezialisierung ab Level 3
- Ab **Level 3** darf der Pfad das „Identitäts‑Upgrade“ sein (z.B. Artillerie‑Lob erst ab B3).
- Wenn ab Level 3 ein neuer Modus aktiv wird (z.B. `lob`, `homing`, `pierce`), dann:
  - **Reset/Override** konfliktierende Werte, damit Mischbuilds wie **2‑5** nicht „komisch“ werden.

## Projektil-/FX-Regeln (Feel)

- **Projectile darf nie „stehen bleiben“**: keine NaN/0‑Speed Stalls.  
  Wenn nötig: Soll‑Speed speichern und auf Speed normalisieren.
- **Artillerie**:
  - Shell fliegt echte Parabel und **explodiert am Aim‑Spot** (auch wenn kein Gegner direkt getroffen wird).
  - Lob‑Shots spawnen sauber (kein Muzzle‑Offset, der den Bogen kaputt macht).
- **Rockets**:
  - Homing kann „schwer“ sein (nicht zu agil), aber muss **zuverlässig** bleiben.

## Dateien (wo was ist)

- `index.html`: UI/Overlays/Menu/Settings/Shop/Dev‑Testbar
- `style.css`: Styling (Menü, Panels, Toasts, etc.)
- `game.js`: komplette Logik (States, Türme, Upgrades, Rendering, Audio)

## Dev/Test

- Es gibt eine **Test‑Map** (nur temporär): unendlich Geld + Buttons/Hotkeys zum Spawnen.
- In Test‑Map gibt es **keine Rewards / keinen Progress**.

