// Persistent player progression — coins, best score, unlocks.
// Kitchen and Showdown will read/write the same store later.
const STORAGE_KEY = 'bbc.save.v1';

const DEFAULTS = {
  bestScore: 0,
  coins: 0,
  totalRuns: 0,
  unlocks: [],
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
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
  /** Called at the end of a Rush: banks coins, updates best score. Returns whether it's a new record. */
  recordRun({ score, coins }) {
    const isRecord = score > state.bestScore;
    state.bestScore = Math.max(state.bestScore, score);
    state.coins += coins;
    state.totalRuns += 1;
    notify();
    return isRecord;
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
    Object.assign(state, DEFAULTS, { unlocks: [] });
    notify();
  },
};
