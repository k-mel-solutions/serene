import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from '../game/engine.js';
import { RushScene } from '../game/modes/rush/RushScene.js';
import { GameState } from '../game/state/GameState.js';
import HUD from './HUD.jsx';

const EMPTY_HUD = { score: 0, coins: 0, powerups: [] };

/** Mounts the Pixi engine into a div, runs a RushScene and layers the React HUD over it. */
export default function RushGame({ onExit }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [hud, setHud] = useState(EMPTY_HUD);
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let engine;
    let cancelled = false;

    createEngine(mountRef.current).then((eng) => {
      if (cancelled) {
        eng.destroy();
        return;
      }
      engine = eng;
      const scene = new RushScene(eng.app.canvas, {
        onTick: setHud,
        onGameOver: (r) => {
          const isRecord = GameState.recordRun(r);
          setResult({ ...r, isRecord, best: GameState.get().bestScore });
        },
      });
      sceneRef.current = scene;
      eng.setScene(scene);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sceneRef.current = null;
      engine?.destroy();
    };
  }, []);

  const replay = () => {
    setResult(null);
    sceneRef.current?.restart();
  };

  return (
    <div className="rush">
      <div className="rush-canvas" ref={mountRef} />
      {ready && !result && <HUD {...hud} />}
      {ready && !result && (
        <button className="rush-exit" onClick={onExit} aria-label="Quitter">✕</button>
      )}
      {result && (
        <div className="overlay">
          <div className="panel">
            <h2>Game over</h2>
            {result.isRecord && <div className="record">🔥 Nouveau record !</div>}
            <div className="stat"><span>Score</span><strong>{result.score.toLocaleString('fr-FR')}</strong></div>
            <div className="stat"><span>Pièces</span><strong>🪙 {result.coins}</strong></div>
            <div className="stat"><span>Meilleur</span><strong>{result.best.toLocaleString('fr-FR')}</strong></div>
            <button className="btn btn-primary" onClick={replay}>Rejouer</button>
            <button className="btn" onClick={onExit}>Retour au food truck</button>
          </div>
        </div>
      )}
    </div>
  );
}
