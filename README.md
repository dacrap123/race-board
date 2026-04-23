# Race Board

Digital companion for a horse racing dice game. Tracks horse positions, scratched horses, penalties, and the pot — across multiple devices in real time.

## Quick Start (Python launcher)

Requires [Node.js](https://nodejs.org) and Python 3.

```bash
git clone https://github.com/dacrap123/race-board
cd race-board
py start.py
```

The launcher installs dependencies automatically, starts both the server and client, and opens your browser to http://localhost:5173.

---

## Modes

| Mode | Use case |
|------|----------|
| **Single Device** | Everything on one screen (laptop at the table) |
| **Display Mode** | Projector — shows the board, no controls |
| **Controller Mode** | Phone/tablet — tap rolled numbers, manage setup |
| **Statistics** | Win rates, pot history, scratch frequency charts |

### Multi-device setup
1. Open Display Mode on the projector — note the 4-letter session code
2. Open Controller Mode on each phone — enter the session code
3. All devices sync automatically in real time

---

## Gameplay

### Setup phase
- Set the **base bet** amount
- Tap horses **in order** to scratch them (4 required)
  - 1st scratched = 1× base bet penalty per roll
  - 2nd scratched = 2× base bet penalty per roll
  - 3rd scratched = 3× base bet penalty per roll
  - 4th scratched = 4× base bet penalty per roll
- Press **Start Race**

### Racing phase
- After each dice roll, tap the rolled number on the controller
- **Active horse** → advances one step on the track
- **Scratched horse** → adds its penalty to the pot (no movement)
- Race ends when a horse reaches its finish line

### Pot & Payout
- Only scratch penalties add to the pot
- Payout = pot ÷ 4 (one share per winning card)
- The winner screen shows the payout in dollars and quarters

### Controls
- **Undo** — reverses the last roll (up to 20 steps)
- **New Game** — appears on the winner screen, resets everything and returns to setup

---

## Statistics

Game results are saved automatically to `server/data/stats.json` after every race. Open the **Statistics** page from the landing screen to see:

- Win rate per horse vs. theoretical dice probability
- Scratch frequency per horse
- Pot size over time
- Per-horse breakdown table
- Recent game history

---

## Docker (with Traefik)

### Persistent stats across restarts

Stats are stored in `server/data/stats.json`. Mount this directory as a volume so data survives container restarts and rebuilds:

```yaml
# docker-compose.yml
services:
  race-board:
    build: .
    volumes:
      - ./data:/app/server/data   # stats persist here on the host
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.raceboard.rule=Host(`raceboard.yourdomain.com`)"
      - "traefik.http.services.raceboard.loadbalancer.server.port=3001"
```

Without this volume, stats reset every time the container restarts.

### Building for production

```bash
cd client && npm run build   # outputs to client/dist/
```

The server serves the built client automatically when `NODE_ENV=production`.

---

## Manual Start (without Python launcher)

```bash
# Terminal 1 — server
cd server && npm install && npm run dev

# Terminal 2 — client
cd client && npm install && npm run dev
```

---

## Custom Sounds

Drop MP3 files into `client/public/sounds/` to override the generated audio:

| File | Plays when |
|------|-----------|
| `start.mp3` | Race begins |
| `move.mp3` | Active horse advances |
| `penalty.mp3` | Scratched horse is rolled |
| `winner.mp3` | A horse crosses the finish line |

If the files are missing the app falls back to Web Audio API synthesis automatically.

---

## Project Structure

```
race-board/
├── start.py                  # Launcher — installs deps and starts both servers
├── server/
│   ├── index.js              # Express + Socket.IO server, all game logic
│   ├── data/
│   │   └── stats.json        # Persistent game history (auto-created, mount as volume in Docker)
│   └── package.json
└── client/
    ├── public/sounds/        # Optional MP3 audio overrides
    ├── src/
    │   ├── App.jsx           # Root — mode routing, socket connection
    │   ├── App.css           # All styles
    │   ├── horseData.js      # Horse numbers, colors, track lengths
    │   ├── sounds.js         # Web Audio API sound synthesis
    │   └── components/
    │       ├── LandingPage.jsx     # Mode + session code selection
    │       ├── RaceBoard.jsx       # Display board with winner modal
    │       ├── HorseToken.jsx      # Circular horse token component
    │       ├── SetupPanel.jsx      # Base bet + scratch selection
    │       ├── ControllerPanel.jsx # Roll buttons + undo/reset
    │       └── StatsPage.jsx       # Statistics charts and history
    ├── index.html
    ├── package.json
    └── vite.config.js        # Proxies /socket.io to server in dev
```
