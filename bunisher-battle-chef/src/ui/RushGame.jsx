import React, { useRef, useState } from 'react';
import { RushScene } from '../game/modes/rush/RushScene.js';
import { GameState } from '../game/state/GameState.js';
import { useEngine } from './useEngine.js';
import HUD from './HUD.jsx';

const EMPTY_HUD = { score: 0, coins: 0, deliveries: 0, streak: 0, backpack: [], powerups: [] };

/** Rush mode screen: Pixi canvas + React HUD + game-over panel. */
export default function RushGame({ onExit }) {
  const mountRef = useRef(null);
  const [hud, setHud] = useState(EMPTY_HUD);
  const [result, setResult] = useState(null);

  const { sceneRef, ready } = useEngine(mountRef, (canvas) =>
    new RushScene(canvas, {
      onTick: setHud,
      onGameOver: (r) => {
        const isRecord = GameState.recordRun(r);
        setResult({ ...r, isRecord, best: GameState.get().bestScore });
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
      {ready && !result && <HUD {...hud} />}
      {ready && !result && (
        <button className="game-exit" onClick={onExit} aria-label="Quitter">✕</button>
      )}
      {result && (
        <div className="overlay">
          <div className="panel">
            <h2>Livraison terminée</h2>
            {result.isRecord && <div className="record">🔥 Nouveau record !</div>}
            <div className="stat"><span>Score</span><strong>{result.score.toLocaleString('fr-FR')}</strong></div>
            <div className="stat"><span>Livraisons</span><strong>📦 {result.deliveries}</strong></div>
            <div className="stat"><span>Pièces + pourboires</span><strong>🪙 {result.coins}</strong></div>
            <div className="stat"><span>Énergie Showdown</span><strong>⚡ +{result.deliveries * 8}</strong></div>
            <div className="stat"><span>Meilleur</span><strong>{result.best.toLocaleString('fr-FR')}</strong></div>
            <button className="btn btn-primary" onClick={replay}>Rejouer</button>
            <button className="btn" onClick={onExit}>Retour au food truck</button>
          </div>
        </div>
      )}
    </div>
  );
}
