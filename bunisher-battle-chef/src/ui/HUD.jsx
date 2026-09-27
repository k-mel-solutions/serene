import React from 'react';

const DISH_ICON = { burger: '🍔', frites: '🍟', wrap: '🌯' };
const CAPACITY = 3;

/** In-run overlay: score, coins, deliveries, the backpack and active power-ups. */
export default function HUD({ score, coins, deliveries = 0, streak = 0, backpack = [], powerups = [] }) {
  const slots = [...backpack, ...Array(Math.max(0, CAPACITY - backpack.length)).fill(null)];
  return (
    <div className="hud">
      <div className="hud-row">
        <div>
          <div className="hud-score">{score.toLocaleString('fr-FR')}</div>
          <div className="hud-deliveries">
            📦 {deliveries} livr.{streak > 1 && <span className="hud-streak"> x{streak}</span>}
          </div>
        </div>
        <div className="hud-coins">🪙 {coins}</div>
      </div>

      <div className="hud-backpack" aria-label="Sac à dos">
        {slots.map((o, i) => (
          <div key={o ? o.id : `empty-${i}`} className={`hud-slot${o ? ' hud-slot--full' : ''}${o && o.ratio < 0.3 ? ' hud-slot--cold' : ''}`}>
            {o ? (
              <>
                <span>{DISH_ICON[o.dish]}</span>
                <div className="hud-slot-bar"><div style={{ width: `${o.ratio * 100}%` }} /></div>
              </>
            ) : (
              <span className="hud-slot-empty">·</span>
            )}
          </div>
        ))}
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
