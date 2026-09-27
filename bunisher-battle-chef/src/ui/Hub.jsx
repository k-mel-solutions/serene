import React, { useEffect, useState } from 'react';
import { GameState } from '../game/state/GameState.js';
import RushGame from './RushGame.jsx';
import KitchenGame from './KitchenGame.jsx';
import ShowdownGame from './ShowdownGame.jsx';

const MODES = [
  { id: 'rush', title: 'Rush', desc: 'Livraisons en ville — 3 voies', icon: '🛵' },
  { id: 'kitchen', title: 'Kitchen', desc: 'Recette au timing → XP + buff', icon: '🔪' },
  { id: 'showdown', title: 'Showdown', desc: "Boss : Gril d'Acier", icon: '⚔️' },
];

/** Food-truck hub: entry point to the three modes and the player's progression. */
export default function Hub() {
  const [mode, setMode] = useState(null);
  const [save, setSave] = useState(GameState.get());

  useEffect(() => GameState.subscribe(setSave), []);

  const exit = () => setMode(null);
  if (mode === 'rush') return <RushGame onExit={exit} />;
  if (mode === 'kitchen') return <KitchenGame onExit={exit} />;
  if (mode === 'showdown') return <ShowdownGame onExit={exit} />;

  const badge = (id) => {
    if (id === 'showdown') {
      const parts = [];
      if (save.energy > 0) parts.push(`⚡ ${save.energy}`);
      if (save.buffs.length) parts.push(`🔥 ${save.buffs.length}`);
      if (save.bossesDefeated.includes('gril-acier')) parts.push('✔ battu');
      return parts.join(' · ');
    }
    if (id === 'rush' && save.bestDeliveries) return `📦 ${save.bestDeliveries}`;
    return '';
  };

  return (
    <div className="hub">
      <header className="hub-header">
        <div className="hub-logo">
          <span className="hub-logo-mark" />
          <h1>Bunisher<br />Battle Chef</h1>
        </div>
        <div className="hub-wallet">
          <span className="coins">🪙 {save.coins.toLocaleString('fr-FR')}</span>
          <span className="energy">⚡ {save.energy}</span>
        </div>
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
          <button key={m.id} className="mode-card" onClick={() => setMode(m.id)}>
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-text">
              <strong>{m.title}</strong>
              <small>{m.desc}</small>
            </span>
            <span className="mode-badge">{badge(m.id)}</span>
          </button>
        ))}
      </section>

      <footer className="hub-stats">
        <div><small>Meilleur score</small><strong>{save.bestScore.toLocaleString('fr-FR')}</strong></div>
        <div><small>XP</small><strong>{save.xp}</strong></div>
        <div><small>Runs</small><strong>{save.totalRuns}</strong></div>
      </footer>
    </div>
  );
}
