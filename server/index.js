const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const sessions = {};

// Track length per horse — mirrors the physical board's pyramid shape.
// Horse 7 is rolled most often (6/36) so it needs the most steps to balance.
const TRACK_LENGTHS = {
  2: 3,  3: 5,  4: 7,  5: 9,  6: 11, 7: 13,
  8: 11, 9: 9, 10: 7, 11: 5, 12: 3,
};

function createGameState() {
  const positions = {};
  for (let i = 2; i <= 12; i++) positions[i] = 0;
  return {
    phase: 'setup',      // 'setup' | 'racing' | 'finished'
    baseBet: 1,
    scratchedHorses: [], // ordered: index 0 = 1st scratched (1x), etc.
    positions,
    pot: 0,
    winner: null,
    history: [],         // undo stack (snapshots without history field)
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
          changed = true;
        }
      }
    }

    else if (type === 'UNSCRATCH_HORSE') {
      if (state.phase === 'setup') {
        const h = parseInt(payload.horse);
        state.scratchedHorses = state.scratchedHorses.filter(x => x !== h);
        changed = true;
      }
    }

    else if (type === 'START_RACE') {
      if (state.phase === 'setup' && state.scratchedHorses.length === 4) {
        state.phase = 'racing';
        changed = true;
      }
    }

    else if (type === 'ROLL_HORSE') {
      if (state.phase === 'racing') {
        const h = parseInt(payload.horse);
        if (h < 2 || h > 12) return;

        pushHistory(state);

        const scratchIdx = state.scratchedHorses.indexOf(h);
        if (scratchIdx !== -1) {
          // Scratched horse: add penalty to pot
          const penalty = (scratchIdx + 1) * state.baseBet;
          state.pot = Math.round((state.pot + penalty) * 100) / 100;
        } else {
          // Active horse: advance one step
          state.positions[h] = (state.positions[h] || 0) + 1;
          if (state.positions[h] >= TRACK_LENGTHS[h]) {
            state.winner = h;
            state.phase = 'finished';
          }
        }
        changed = true;
      }
    }

    else if (type === 'UNDO') {
      if (state.history.length > 0) {
        const prev = JSON.parse(state.history.pop());
        // Restore snapshot fields; history stays as-is (prev has no history key)
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
