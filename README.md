# Last Mile — Courier Rush

3D courier gate-runner: collect packages, pay tolls, throw boxes at thieves, deliver the VIP!

## Play

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Controls

| Input | Action |
|-------|--------|
| **A / D** or **← / →** | Steer lanes (gate choices) |
| **F** or **Throw button** | Throw a collected package at enemies |
| **SPACE** or **Click** | Scan barcode at blocker gates |
| **SPACE** / Ability button | Use equipped shop ability |

## Core Loop

1. **Collect packages** — glowing boxes on the road (needed for toll gates)
2. **Route gates** — steer left/right; some paths cost packages (📦×N shown)
3. **Blockers** — scan, stamp, ram, or pay package tolls
4. **Enemies** — visible gangs march toward you; convoy clashes + **throw packages** for big damage
5. **VIP integrity** — lose segments when overwhelmed, blocked, or gate rejected
6. **Death** — integrity hits 0 = mission failed (with reason shown)
7. **Drop-off** — golden zone after clearing intercepts
8. **Shop** — turrets, abilities, upgrades persist in localStorage

## Districts

- **Sunny Suburbs** (1-1 → 1-5) — bright skies, trees, pickpockets, HOA boss
- **Busy Downtown** (2-1 → 2-5) — golden hour, tolls, rival couriers, syndicate boss

10 levels total, sequential unlock, 3-star scoring.

## Stack

Vite · TypeScript · Three.js
