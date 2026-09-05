const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const sessions = {};
const DATA_DIR   = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const ACTIVE_FILE = path.join(DATA_DIR, 'active-sessions.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ── Stats persistence ────────────────────────────────────────────────────────

function loadStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); }
  catch { return { games: [] }; }
}

function saveGameRecord(state) {
  const stats = loadStats();
  const id = Date.now();
  stats.games.push({
    id,
    timestamp: new Date().toISOString(),
    winner: state.winner,
    scratchedHorses: [...state.scratchedHorses],
    pot: state.pot,
    baseBet: state.baseBet,
    rollCount: state.rollCount || 0,
    durationSeconds: state.raceStartTime
      ? Math.round((Date.now() - state.raceStartTime) / 1000)
      : null,
  });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  return id;
}

function removeGameRecord(id) {
  if (id == null) return;
  const stats = loadStats();
  const nextGames = stats.games.filter(g => g.id !== id);
  if (nextGames.length === stats.games.length) return;
  stats.games = nextGames;
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

app.get('/api/sessions/:code', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  res.json({ exists: !!sessions[code] });
});

app.get('/api/stats', (_req, res) => res.json(loadStats()));

app.delete('/api/stats/:id', (req, res) => {
  const id  = parseInt(req.params.id);
  const stats = loadStats();
  const before = stats.games.length;
  stats.games = stats.games.filter(g => g.id !== id);
  if (stats.games.length === before) return res.status(404).json({ error: 'Game not found' });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  res.json({ ok: true });
});

// ── Game logic ───────────────────────────────────────────────────────────────

const TRACK_LENGTHS = {
  2: 6,  3: 8,  4: 10,  5: 12,  6: 14, 7: 16,
  8: 14, 9: 12, 10: 10, 11: 8, 12: 6,
};

function createGameState() {
  const positions = {};
  for (let i = 2; i <= 12; i++) positions[i] = 0;
  return {
    phase: 'setup',
    baseBet: 0.25,
    scratchedHorses: [],
    positions,
    pot: 0,
    winner: null,
    rollCount: 0,
    raceStartTime: null,
    history: [],
    rollLog: [],
    savedGameId: null,
  };
}

function loadActiveSessions() {
  try { return JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveActiveSessions() {
  try { fs.writeFileSync(ACTIVE_FILE, JSON.stringify(sessions, null, 2)); }
  catch (_) {}
}

Object.assign(sessions, loadActiveSessions());

function pushHistory(state) {
  const { history: _h, ...snap } = state;
  state.history.push(JSON.stringify(snap));
  if (state.history.length > 20) state.history.shift();
}

io.on('connection', (socket) => {
  let currentSession = null;

  socket.on('join_session', ({ code }) => {
    currentSession = code.toUpperCase().trim();
    if (!sessions[currentSession]) {
      sessions[currentSession] = createGameState();
    }
    // Migrate setup-only sessions created before the default was lowered.
    // Once a bet or scratch has been made, preserve the player's choice.
    const existing = sessions[currentSession];
    if (existing.phase === 'setup' && existing.baseBet === 1 &&
        existing.scratchedHorses.length === 0 && existing.pot === 0) {
      existing.baseBet = 0.25;
    }
    socket.join(currentSession);
    socket.emit('state_update', sessions[currentSession]);
  });

  socket.on('action', ({ type, payload = {} }) => {
    if (!currentSession) return;
    const state = sessions[currentSession];
    if (!state) return;

    let changed = false;

    if (type === 'SET_BASE_BET') {
      if (state.phase === 'setup') {
        const amount = parseFloat(payload.amount);
        if (amount > 0 && isFinite(amount)) {
          state.baseBet = Math.round(amount * 100) / 100;
          changed = true;
        }
      }
    }

    else if (type === 'SCRATCH_HORSE') {
      if (state.phase === 'setup' && state.scratchedHorses.length < 4) {
        const h = parseInt(payload.horse);
        if (h >= 2 && h <= 12 && !state.scratchedHorses.includes(h)) {
          state.scratchedHorses.push(h);
          const scratchIdx = state.scratchedHorses.length - 1;
          const penalty = (scratchIdx + 1) * state.baseBet;
          state.pot = Math.round((state.pot + penalty) * 100) / 100;
          changed = true;
        }
      }
    }

    else if (type === 'UNSCRATCH_HORSE') {
      if (state.phase === 'setup') {
        const h = parseInt(payload.horse);
        const scratchIdx = state.scratchedHorses.indexOf(h);
        if (scratchIdx !== -1) {
          const penalty = (scratchIdx + 1) * state.baseBet;
          state.pot = Math.max(0, Math.round((state.pot - penalty) * 100) / 100);
          state.scratchedHorses = state.scratchedHorses.filter(x => x !== h);
          changed = true;
        }
      }
    }

    else if (type === 'START_RACE') {
      if (state.phase === 'setup' && state.scratchedHorses.length === 4) {
        state.phase = 'racing';
        state.raceStartTime = Date.now();
        changed = true;
      }
    }

    else if (type === 'ROLL_HORSE') {
      const scratchIdxSetup = state.scratchedHorses.indexOf(parseInt(payload.horse));
      if (state.phase === 'setup' && scratchIdxSetup !== -1) {
        // Clicking a scratched horse during setup adds its penalty to the pot
        const h = parseInt(payload.horse);
        const penalty = (scratchIdxSetup + 1) * state.baseBet;
        state.pot = Math.round((state.pot + penalty) * 100) / 100;
        changed = true;
      } else if (state.phase === 'racing') {
        const h = parseInt(payload.horse);
        if (h < 2 || h > 12) return;

        pushHistory(state);
        state.rollCount = (state.rollCount || 0) + 1;

        const scratchIdx = state.scratchedHorses.indexOf(h);
        if (scratchIdx !== -1) {
          const penalty = (scratchIdx + 1) * state.baseBet;
          state.pot = Math.round((state.pot + penalty) * 100) / 100;
          state.rollLog.push({ horse: h, kind: 'penalty', amount: penalty });
        } else {
          state.positions[h] = (state.positions[h] || 0) + 1;
          state.rollLog.push({ horse: h, kind: 'move' });
          if (state.positions[h] >= TRACK_LENGTHS[h]) {
            state.winner = h;
            state.phase = 'finished';
            state.savedGameId = saveGameRecord(state);
          }
        }
        if (state.rollLog.length > 10) state.rollLog.shift();
        changed = true;
      }
    }

    else if (type === 'UNDO') {
      if ((state.phase === 'racing' || state.phase === 'finished') && state.history.length > 0) {
        if (state.phase === 'finished') removeGameRecord(state.savedGameId);
        const prev = JSON.parse(state.history.pop());
        Object.assign(state, prev);
        changed = true;
      }
    }

    else if (type === 'RESET') {
      Object.assign(state, createGameState());
      changed = true;
    }

    if (changed) {
      saveActiveSessions();
      io.to(currentSession).emit('state_update', state);
    }
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (_req, res) =>
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  );
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`Race Board server → http://localhost:${PORT}`)
);
