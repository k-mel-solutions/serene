import React, { useEffect, useState } from 'react';
import { GameState } from '../game/state/GameState.js';
import RushGame from './RushGame.jsx';

// Kitchen and Showdown plug in here once their scenes exist.
const MODES = [
  { id: 'rush', title: 'Rush', desc: 'Endless runner 3 voies', icon: '🏃', ready: true },
  { id: 'kitchen', title: 'Kitchen', desc: 'Mini-jeux de cuisine', icon: '🔪', ready: false },
  { id: 'showdown', title: 'Showdown', desc: 'Combat de boss', icon: '⚔️', ready: false },
];

/** Food-truck hub: entry point to the three modes and the player's progression. */
export default function Hub() {
  const [mode, setMode] = useState(null);
  const [save, setSave] = useState(GameState.get());

  useEffect(() => GameState.subscribe(setSave), []);

  if (mode === 'rush') return <RushGame onExit={() => setMode(null)} />;

  return (
    <div className="hub">
      <header className="hub-header">
        <div className="hub-logo">
          <span className="hub-logo-mark" />
          <h1>Bunisher<br />Battle Chef</h1>
        </div>
        <div className="hub-wallet">🪙 {save.coins.toLocaleString('fr-FR')}</div>
      </header>

      <div className="hub-truck" aria-hidden="true">
        <div className="hub-truck-body">
          <div className="hub-truck-window" />
          <div className="hub-truck-sign">BUNISHER</div>
        </div>
        <div className="hub-truck-wheels"><span /><span /></div>
      </div>

      <section className="hub-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-card${m.ready ? '' : ' mode-card--locked'}`}
            disabled={!m.ready}
            onClick={() => setMode(m.id)}
          >
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-text">
              <strong>{m.title}</strong>
              <small>{m.ready ? m.desc : 'Bientôt'}</small>
            </span>
          </button>
        ))}
      </section>

      <footer className="hub-stats">
        <div><small>Meilleur score</small><strong>{save.bestScore.toLocaleString('fr-FR')}</strong></div>
        <div><small>Runs</small><strong>{save.totalRuns}</strong></div>
      </footer>
    </div>
  );
}
