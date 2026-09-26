# Bunisher Battle Chef

Prototype web (PixiJS 8 + React 19 + Vite) du jeu **The Bunisher**. Mode **Rush** jouable ; Kitchen et Showdown se brancheront sur le même hub.

## Lancer

```bash
cd bunisher-battle-chef
npm install
npm run dev      # http://localhost:5173
npm run build    # sortie statique dans dist/
```

## Jouer (Rush)

- Swipe gauche/droite (tactile) ou ← → / Q D (clavier). Un tap sur la moitié gauche/droite de l'écran steer aussi.
- Esquiver : plateaux chauds, casseroles, chariots.
- Collecter : pièces (🪙, +5 pts, banquées dans le hub) et ingrédients ★ qui déclenchent un power-up :
  - **Bouclier tablier** — absorbe une collision.
  - **Aimant à ingrédients** — attire les pièces des voies voisines.
  - **Coup de fouet** — vitesse ×1.5, score plus rapide.
- La vitesse monte sur ~90 s. Meilleur score, pièces et nombre de runs sont sauvegardés en `localStorage` (`bbc.save.v1`).

## Architecture

```
src/
├── main.jsx                      # monte le hub React
├── game/
│   ├── engine.js                 # Pixi Application, ticker, gestion de scène, letterbox 480×800
│   ├── entities/Player.js        # le Bunisher (placeholder Graphics), voies, bouclier
│   ├── modes/rush/
│   │   ├── Lanes.js              # projection pseudo-3D (lane, t) → (x, y, scale) + sol défilant
│   │   ├── ObstacleSpawner.js    # vagues d'obstacles, jamais les 3 voies bloquées
│   │   ├── CoinManager.js        # pièces, ingrédients, définitions des power-ups
│   │   └── RushScene.js          # input, rampe de vitesse, score, game over
│   └── state/GameState.js        # progression persistante partagée par tous les modes
└── ui/
    ├── Hub.jsx                   # écran food truck (Rush actif, Kitchen/Showdown verrouillés)
    ├── RushGame.jsx              # monte l'engine + overlay HUD / game over
    ├── HUD.jsx
    └── styles.css
```

Une scène implémente `{ container, update(dt), destroy() }` ; `engine.setScene()` fait le swap. Tous les objets du Rush vivent en coordonnées `(lane ∈ {0,1,2}, t ∈ [0, 1.3])` où `t = 1` est la profondeur du joueur — les collisions et collectes sont donc des comparaisons de voie et de profondeur, indépendantes du rendu.

## Prochaines étapes

1. Remplacer les `Graphics` placeholder par les sprite sheets Higgsfield (`Player.drawBody`, `OBSTACLE_TYPES[*].draw`).
2. Backgrounds parallax par quartier dans `Lanes`.
3. `KitchenScene` / `ShowdownScene` sur le même contrat de scène, débloqués dans `Hub.jsx` (`MODES[].ready`).
4. Boutique consommant `GameState.spendCoins` / `unlock`.
