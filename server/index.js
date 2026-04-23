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
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ── Stats persistence ────────────────────────────────────────────────────────

function loadStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); }
  catch { return { games: [] }; }
}

function saveGameRecord(state) {
  const stats = loadStats();
  stats.games.push({
    id: Date.now(),
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
  2: 3,  3: 5,  4: 7,  5: 9,  6: 11, 7: 13,
  8: 11, 9: 9, 10: 7, 11: 5, 12: 3,
};

function createGameState() {
  const positions = {};
  for (let i = 2; i <= 12; i++) positions[i] = 0;
  return {
    phase: 'setup',
    baseBet: 1,
    scratchedHorses: [],
    positions,
    pot: 0,
    winner: null,
    rollCount: 0,
    raceStartTime: null,
    history: [],
  };
}

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
        } else {
          state.positions[h] = (state.positions[h] || 0) + 1;
          if (state.positions[h] >= TRACK_LENGTHS[h]) {
            state.winner = h;
            state.phase = 'finished';
            saveGameRecord(state);
          }
        }
        changed = true;
      }
    }

    else if (type === 'UNDO') {
      if (state.history.length > 0) {
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
