import React, { useRef, useState } from 'react';
import { KitchenScene } from '../game/modes/kitchen/KitchenScene.js';
import { GameState } from '../game/state/GameState.js';
import { useEngine } from './useEngine.js';

const STEP_ICON = { perfect: '★', good: '✓', miss: '✗', current: '▶', todo: '·' };

/** Kitchen mode screen: timing mini-game with a recipe tracker on top. */
export default function KitchenGame({ onExit }) {
  const mountRef = useRef(null);
  const [hud, setHud] = useState({ recipe: '', steps: [], hint: '' });
  const [result, setResult] = useState(null);

  const { sceneRef, ready } = useEngine(mountRef, (canvas) =>
    new KitchenScene(canvas, {
      onTick: setHud,
      onDone: (r) => {
        GameState.recordRecipe(r);
        setResult(r);
      },
    }),
  );

  const replay = () => {
    setResult(null);
    sceneRef.current?.restart();
  };

  return (
    <div className="game">
      <div className="game-canvas" ref={mountRef} />
      {ready && !result && (
        <>
          <div className="kitchen-hud">
            <div className="kitchen-recipe">{hud.recipe}</div>
            <div className="kitchen-steps">
              {hud.steps.map((s, i) => (
                <span key={i} className={`kitchen-step kitchen-step--${s.state === 'perfect' || s.state === 'good' ? 'done' : s.state === 'miss' ? 'missed' : s.state}`}>
                  {STEP_ICON[s.state]} {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="kitchen-hint">{hud.hint} — tap / Espace</div>
          <button className="game-exit" onClick={onExit} aria-label="Quitter">✕</button>
        </>
      )}
      {result && (
        <div className="overlay">
          <div className="panel">
            <h2 className={result.quality >= 0.7 ? 'win' : ''}>{result.quality >= 0.7 ? 'Service impeccable' : 'Ça passe…'}</h2>
            <div className="stat"><span>Parfaits</span><strong>★ {result.perfects}</strong></div>
            <div className="stat"><span>Bien</span><strong>✓ {result.goods}</strong></div>
            <div className="stat"><span>Ratés</span><strong>✗ {result.misses}</strong></div>
            <div className="stat"><span>XP</span><strong>+{result.xp}</strong></div>
            <div className="stat"><span>Pièces</span><strong>🪙 +{result.coins}</strong></div>
            {result.buff ? (
              <p>🔥 Buff <strong>{result.buff.label}</strong> débloqué : +20 % de dégâts au prochain Showdown.</p>
            ) : (
              <p>70 % de qualité pour débloquer un buff Showdown.</p>
            )}
            <button className="btn btn-primary" onClick={replay}>Refaire la recette</button>
            <button className="btn" onClick={onExit}>Retour au food truck</button>
          </div>
        </div>
      )}
    </div>
  );
}
