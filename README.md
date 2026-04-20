# Race Board

Digital companion for a horse racing dice game. Tracks horse positions, scratched horses, penalties, and the pot — across multiple devices in real time.

## Quick Start

### 1. Start the server
```bash
cd server
npm install
npm run dev
```

### 2. Start the client (separate terminal)
```bash
cd client
npm install
npm run dev
```

### 3. Open the app
- http://localhost:5173

---

## Modes

| Mode | Use case |
|------|----------|
| **Single Device** | Everything on one screen (laptop at the table) |
| **Display Mode** | Projector — shows the board, no controls |
| **Controller Mode** | Phone/tablet — tap rolled numbers, manage setup |

### Multi-device setup
1. Open Display Mode on the projector — note the 4-letter session code
2. Open Controller Mode on each phone — enter the session code
3. All devices sync automatically via WebSocket

---

## Gameplay

### Setup phase
- Set the **base bet** amount
- Tap horses **in order** to scratch them (4 required)
  - 1st scratched = 1× base bet penalty
  - 2nd scratched = 2× base bet penalty
  - 3rd scratched = 3× base bet penalty
  - 4th scratched = 4× base bet penalty
- Press **Start Race**

### Racing phase
- After each dice roll, tap the rolled number on the controller
- **Active horse** → advances one step on the track
- **Scratched horse** → adds its penalty to the pot (no movement)
- Race ends when any horse reaches position 10

### Pot & Payout
- Only scratch penalties add to the pot
- Payout = pot ÷ 4 (one share per winning card)

### Controls
- **Undo** — reverses the last roll (up to 20 steps)
- **Reset** — clears everything and returns to setup

---

## Replacing Horse Tokens (Sprite Sheet)

Currently tokens are colored SVG circles with numbers. To use a custom sprite sheet:

1. Create `client/public/sprite.png` — place horses 2–12 in a 4-column grid, 100×100px per cell:

```
[ 2][ 3][ 4][ 5]   row 0
[ 6][ 7][ 8][ 9]   row 1
[10][11][12][ -]   row 2
```

2. Edit `client/src/components/HorseToken.jsx` — replace the return with:

```jsx
const col = [2,3,4,5,6,7,8,9,10,11,12].indexOf(number);
const row = Math.floor(col / 4);
const colInRow = col % 4;
return (
  <div style={{
    width: size, height: size, borderRadius: '50%', overflow: 'hidden',
    backgroundImage: 'url(/sprite.png)',
    backgroundSize: `${4 * 100}px ${3 * 100}px`,
    backgroundPosition: `-${colInRow * 100}px -${row * 100}px`,
  }} />
);
```

---

## Custom Sounds

Drop these files into `client/public/sounds/` to override the generated tones:

| File | Plays when |
|------|-----------|
| `start.mp3` | Race begins |
| `move.mp3` | Active horse advances |
| `penalty.mp3` | Scratched horse is rolled |
| `winner.mp3` | A horse crosses the finish line |

If the files are missing the app falls back to Web Audio API generated tones automatically.

---

## Project Structure

```
race-board/
├── server/
│   ├── index.js          # Express + Socket.IO server, game state
│   └── package.json
└── client/
    ├── public/sounds/    # Optional audio overrides
    ├── src/
    │   ├── App.jsx       # Root — mode routing, socket connection
    │   ├── App.css       # All styles
    │   ├── socket.js     # Socket.IO client instance
    │   ├── horseData.js  # Horse numbers, colors, constants
    │   ├── sounds.js     # Web Audio API sound generation
    │   └── components/
    │       ├── LandingPage.jsx    # Mode + session code selection
    │       ├── RaceBoard.jsx      # Projector display board
    │       ├── HorseToken.jsx     # Circular horse token
    │       ├── SetupPanel.jsx     # Base bet + scratch selection
    │       └── ControllerPanel.jsx# Roll buttons + undo/reset
    ├── index.html
    ├── package.json
    └── vite.config.js    # Proxies /socket.io to server in dev
```
