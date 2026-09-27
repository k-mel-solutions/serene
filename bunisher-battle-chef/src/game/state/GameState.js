// Persistent player progression shared by the three modes.
//  - Rush banks coins + energy (deliveries), Kitchen grants XP + buffs,
//    Showdown consumes energy/buffs and records defeated bosses.
const STORAGE_KEY = 'bbc.save.v2';
export const MAX_ENERGY = 100;

const DEFAULTS = {
  bestScore: 0,
  bestDeliveries: 0,
  coins: 0,
  totalRuns: 0,
  xp: 0,
  energy: 0,
  buffs: [], // ingredient buffs earned in Kitchen, consumed by the next Showdown
  bossesDefeated: [],
  unlocks: [],
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : structuredClone(DEFAULTS);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — progression is just in-memory for this session */
  }
}

const state = load();
const listeners = new Set();

function notify() {
  persist(state);
  listeners.forEach((fn) => fn({ ...state }));
}

export const GameState = {
  get() {
    return { ...state };
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** End of a Rush: banks coins, energy from deliveries, updates records. */
  recordRun({ score, coins, deliveries }) {
    const isRecord = score > state.bestScore;
    state.bestScore = Math.max(state.bestScore, score);
    state.bestDeliveries = Math.max(state.bestDeliveries, deliveries);
    state.coins += coins;
    state.energy = Math.min(MAX_ENERGY, state.energy + deliveries * 8);
    state.totalRuns += 1;
    notify();
    return isRecord;
  },
  /** End of a Kitchen recipe: XP, coins, and a buff if the dish was good enough. */
  recordRecipe({ xp, coins, buff }) {
    state.xp += xp;
    state.coins += coins;
    state.energy = Math.min(MAX_ENERGY, state.energy + Math.round(xp / 4));
    if (buff) state.buffs.push(buff);
    notify();
  },
  /** Start of a Showdown: hands over stored energy and buffs, and clears them. */
  consumeForShowdown() {
    const out = { energy: state.energy, buffs: [...state.buffs] };
    state.energy = 0;
    state.buffs = [];
    notify();
    return out;
  },
  recordBossResult({ bossId, won, coins }) {
    state.coins += coins;
    if (won && !state.bossesDefeated.includes(bossId)) state.bossesDefeated.push(bossId);
    state.xp += won ? 60 : 10;
    notify();
  },
  spendCoins(amount) {
    if (state.coins < amount) return false;
    state.coins -= amount;
    notify();
    return true;
  },
  unlock(id) {
    if (!state.unlocks.includes(id)) {
      state.unlocks.push(id);
      notify();
    }
  },
  reset() {
    Object.assign(state, structuredClone(DEFAULTS));
    notify();
  },
};
