// Procedural audio via Web Audio API — no external files required.
// Drop MP3s in /public/sounds/ (start.mp3, move.mp3, penalty.mp3, winner.mp3)
// to override the generated tones.

let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

export function initAudio() {
  try { getCtx().resume(); } catch (_) {}
}

async function tryFile(path, fallback) {
  try {
    const c = getCtx();
    const res = await fetch(path, { method: 'HEAD' });
    if (!res.ok) throw new Error();
    const resp = await fetch(path);
    const buf = await resp.arrayBuffer();
    const decoded = await c.decodeAudioData(buf);
    const src = c.createBufferSource();
    src.buffer = decoded;
    src.connect(c.destination);
    src.start();
  } catch (_) {
    fallback();
  }
}

function tone(freq, dur, type = 'sine', vol = 0.28, delay = 0) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = c.currentTime + delay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch (_) {}
}

function moveGen() {
  tone(659, 0.07, 'sine', 0.22);
  tone(880, 0.07, 'sine', 0.18, 0.07);
}

function penaltyGen() {
  tone(330, 0.14, 'sawtooth', 0.28);
  tone(220, 0.2, 'sawtooth', 0.22, 0.13);
}

function startGen() {
  [523, 659, 784, 1047].forEach((f, i) =>
    tone(f, 0.22, 'square', 0.22, i * 0.13)
  );
}

function winnerGen() {
  const melody = [523, 523, 659, 523, 784, 740, 784];
  const times  = [0, 0.18, 0.36, 0.54, 0.72, 0.90, 1.1];
  melody.forEach((f, i) => tone(f, 0.28, 'square', 0.25, times[i]));
  tone(1047, 0.7, 'square', 0.28, 1.4);
}

export const playMove    = () => tryFile('/sounds/move.mp3',    moveGen);
export const playPenalty = () => tryFile('/sounds/penalty.mp3', penaltyGen);
export const playStart   = () => tryFile('/sounds/start.mp3',   startGen);
export const playWinner  = () => tryFile('/sounds/winner.mp3',  winnerGen);
