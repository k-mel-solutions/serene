# Bunisher Battle Chef

Prototype web (PixiJS 8 + React 19 + Vite) du jeu **The Bunisher**. Trois modes reliés par le hub food truck, avec une progression partagée.

## Lancer

```bash
cd bunisher-battle-chef
npm install
npm run dev      # http://localhost:5173
npm run build    # sortie statique dans dist/
```

## Les 3 modes

### 🛵 Rush — livraisons en ville
- Runner 3 voies : swipe gauche/droite, `← →` / `Q D`, ou tap sur la moitié gauche/droite de l'écran.
- Le Bunisher court avec son **sac de livraison** (3 places). Il ramasse des **commandes** (burger, frites, wrap) sur la route et les livre aux **clients** qui attendent dans les anneaux bleus — il faut passer dans leur voie avec le bon plat.
- Une commande refroidit en 22 s ; livrée fraîche = plus de points et de pourboire. Les livraisons enchaînées montent un multiplicateur (x5 max) ; un plat froid le casse.
- Obstacles : plateau chaud, casserole, chariot, pile de caisses — jamais les 3 voies bloquées.
- Pièces et ingrédients ★ → power-ups : **Bouclier tablier**, **Aimant**, **Coup de fouet**.
- Fin de run : pièces + pourboires banqués, **énergie** pour le Showdown (+8 par livraison).

### 🔪 Kitchen — recette au timing
- Le *Burger Bunisher* en 7 étapes (toaster, saisir, trancher, ciseler, fondre, sauce, refermer).
- Un curseur balaie une barre ; tape (tap / Espace) quand il est dans la zone verte — le cœur doré est un **Parfait**. Chaque étape est plus rapide que la précédente.
- Récompenses : XP, pièces, et si la qualité ≥ 70 % un **buff** *Sauce braise* (+20 % de dégâts) pour le prochain Showdown.

### ⚔️ Showdown — Gril d'Acier
- Duel 2D. Le boss télégraphie ses attaques (anneau rouge) : **Esquive** (`Q` / `←` / bouton) pendant la frappe.
- Quand l'anneau devient **doré**, une **Attaque** (`D` / Espace) au bon moment = **parade** → boss étourdi, +25 énergie.
- Frappe pendant qu'il récupère (dégâts pleins) ; les coups enchaînés montent un combo.
- Jauge d'énergie (pré-remplie par Rush/Kitchen) → **Coup de braise** (`S` / `↓`) : 25 % de ses PV.
- À 0 PV : **QTE** de 4 directions (flèches ou swipe). Raté = il se relève avec 15 % de PV.
- 3 patterns : Pilon, Balayage, Flambée (2 cœurs, apparaît quand il chauffe).

## Architecture

```
src/
├── main.jsx                          # monte le hub React
├── game/
│   ├── engine.js                     # Pixi Application, ticker, letterbox 480×800, setScene()
│   ├── fx.js                         # particules, texte flottant, screen shake
│   ├── entities/
│   │   ├── bunisherArt.js            # dessin du Bunisher (Rush + Showdown), placeholder Graphics
│   │   ├── Player.js                 # le Bunisher sur les voies (Rush)
│   │   └── Boss.js                   # roster BOSSES + dessin de Gril d'Acier
│   ├── modes/
│   │   ├── rush/
│   │   │   ├── Lanes.js              # projection pseudo-3D (lane, t) → (x, y, scale) + rue/ville
│   │   │   ├── ObstacleSpawner.js
│   │   │   ├── CoinManager.js        # pièces, ingrédients, définitions des power-ups
│   │   │   ├── OrderManager.js       # commandes, clients, sac à dos, streak
│   │   │   └── RushScene.js
│   │   ├── kitchen/
│   │   │   ├── KitchenScene.js       # recettes, étapes, notation
│   │   │   └── minigames/TimingBar.js
│   │   └── showdown/
│   │       ├── BossAI.js             # idle → telegraph → strike → recover, parade, stun
│   │       ├── ComboSystem.js        # combo + jauge d'énergie
│   │       └── ShowdownScene.js      # esquive/attaque/spécial, QTE, victoire/défaite
│   └── state/GameState.js            # progression persistante (localStorage `bbc.save.v2`)
└── ui/
    ├── Hub.jsx                       # écran food truck
    ├── useEngine.js                  # hook : monte l'engine + une scène dans un div
    ├── RushGame.jsx / HUD.jsx
    ├── KitchenGame.jsx
    ├── ShowdownGame.jsx
    └── styles.css
```

Une scène implémente `{ container, update(dt), destroy() }` et parle à React uniquement via des callbacks (`onTick`, `onGameOver` / `onDone` / `onEnd`). Dans le Rush, tous les objets vivent en `(lane ∈ {0,1,2}, t ∈ [0, 1.3])` où `t = 1` est la profondeur du joueur ; collisions et collectes sont des comparaisons de voie/profondeur, indépendantes du rendu.

## Boucle de progression

Rush → pièces + énergie · Kitchen → XP + pièces + buff · Showdown consomme énergie + buffs, rend pièces + XP et marque le boss battu.

## Prochaines étapes

1. Remplacer les `Graphics` placeholder par les sprite sheets Higgsfield (`drawBunisher`, `Boss.draw`, `OBSTACLE_TYPES[*].draw`).
2. Autres quartiers en Rush (palette + skyline dans `Lanes`) et roster complet en Showdown (`BOSSES`).
3. Autres recettes Kitchen (`RECIPES`) — branchement possible sur le catalogue BUNISHER.
4. Boutique consommant `GameState.spendCoins` / `unlock`.
5. Audio.
