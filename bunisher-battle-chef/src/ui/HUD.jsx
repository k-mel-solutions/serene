import React from 'react';

/** In-run overlay: score, coins, active power-ups. Purely presentational. */
export default function HUD({ score, coins, powerups }) {
  return (
    <div className="hud">
      <div className="hud-row">
        <div className="hud-score">{score.toLocaleString('fr-FR')}</div>
        <div className="hud-coins">🪙 {coins}</div>
      </div>
      <div className="hud-powerups">
        {powerups.map((p) => (
          <div key={p.kind} className={`hud-powerup hud-powerup--${p.kind}`}>
            <span>{p.label}</span>
            <div className="hud-powerup-bar">
              <div style={{ width: `${Math.min(100, (p.remaining / 8) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
