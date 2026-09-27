import React, { useMemo, useRef, useState } from 'react';
import { ShowdownScene } from '../game/modes/showdown/ShowdownScene.js';
import { GameState } from '../game/state/GameState.js';
import { useEngine } from './useEngine.js';

const EMPTY = {
  phase: 'fight', playerHp: 3, playerMax: 3, bossHp: 100, bossMax: 100, bossName: '',
  energy: 0, specialReady: false, combo: 0, canDodge: true, buffs: [], qte: null,
};

/** Showdown screen: boss duel with HP bars, energy gauge, touch controls and QTE prompt. */
export default function ShowdownGame({ onExit, bossId = 'gril-acier' }) {
  const mountRef = useRef(null);
  const [hud, setHud] = useState(EMPTY);
  const [result, setResult] = useState(null);
  // energy and buffs are consumed once, when the fight is entered
  const loadout = useMemo(() => GameState.consumeForShowdown(), []);

  const { sceneRef, ready } = useEngine(mountRef, (canvas) =>
    new ShowdownScene(canvas, {
      onTick: setHud,
      onEnd: (r) => {
        GameState.recordBossResult(r);
        setResult(r);
      },
    }, { bossId, energy: loadout.energy, buffs: loadout.buffs }),
  );

  const retry = () => {
    setResult(null);
    sceneRef.current?.restart();
  };

  const hearts = Array.from({ length: hud.playerMax }, (_, i) => (i < hud.playerHp ? '❤️' : '🖤'));

  return (
    <div className="game">
      <div className="game-canvas" ref={mountRef} />
      {ready && !result && (
        <>
          <div className="sd-hud">
            <div className="sd-bars">
              <div className="sd-bar sd-bar--player">
                <label>Bunisher {hearts.join('')}</label>
                <div className="sd-bar-track"><div style={{ width: `${(hud.playerHp / hud.playerMax) * 100}%` }} /></div>
              </div>
              <div className="sd-bar sd-bar--boss">
                <label>{hud.bossName}</label>
                <div className="sd-bar-track"><div style={{ width: `${(hud.bossHp / hud.bossMax) * 100}%` }} /></div>
              </div>
            </div>
            <div className={`sd-bar sd-energy${hud.specialReady ? ' sd-energy--ready' : ''}`}>
              <label>⚡ Énergie {hud.specialReady ? '— COUP DE BRAISE PRÊT' : ''}</label>
              <div className="sd-bar-track"><div style={{ width: `${hud.energy}%` }} /></div>
            </div>
            {hud.buffs.length > 0 && (
              <div className="sd-buffs">{hud.buffs.map((b, i) => <span key={i} className="sd-buff">🔥 {b}</span>)}</div>
            )}
            {hud.combo > 1 && <div className="sd-combo">{hud.combo} HITS</div>}
          </div>

          {hud.qte && (
            <div className="sd-qte">
              <div className="sd-qte-title">FINISH — swipe / flèches</div>
              <div className="sd-qte-keys">
                {hud.qte.keys.map((k, i) => (
                  <div key={i} className={`sd-qte-key${i < hud.qte.index ? ' sd-qte-key--done' : i === hud.qte.index ? ' sd-qte-key--current' : ''}`}>{k}</div>
                ))}
              </div>
              <div className="sd-qte-bar"><div style={{ width: `${hud.qte.timeRatio * 100}%` }} /></div>
            </div>
          )}

          {hud.phase === 'fight' && (
            <div className="sd-controls">
              <button className="ctrl-btn ctrl-btn--dodge" disabled={!hud.canDodge} onPointerDown={() => sceneRef.current?.dodge()}>
                ESQUIVE <small>Q / ←</small>
              </button>
              <button className="ctrl-btn ctrl-btn--special" disabled={!hud.specialReady} onPointerDown={() => sceneRef.current?.special()}>
                BRAISE <small>S / ↓</small>
              </button>
              <button className="ctrl-btn ctrl-btn--attack" onPointerDown={() => sceneRef.current?.attack()}>
                ATTAQUE <small>D / Espace</small>
              </button>
            </div>
          )}
          <button className="game-exit" onClick={onExit} aria-label="Quitter">✕</button>
        </>
      )}

      {result && (
        <div className="overlay">
          <div className="panel">
            <h2 className={result.won ? 'win' : ''}>{result.won ? `${result.bossName} est cuit !` : 'K.O.'}</h2>
            <div className="stat"><span>Meilleur combo</span><strong>{result.bestCombo} hits</strong></div>
            <div className="stat"><span>Pièces</span><strong>🪙 +{result.coins}</strong></div>
            <div className="stat"><span>XP</span><strong>+{result.won ? 60 : 10}</strong></div>
            {!result.won && <p>Esquive pendant l'anneau rouge, attaque quand il devient doré pour parer, et frappe pendant qu'il récupère.</p>}
            <button className="btn btn-primary" onClick={retry}>{result.won ? 'Revanche' : 'Réessayer'}</button>
            <button className="btn" onClick={onExit}>Retour au food truck</button>
          </div>
        </div>
      )}
    </div>
  );
}
