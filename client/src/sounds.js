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

// Trumpet note — sawtooth + detuned copy + lowpass, full ADSR envelope
function trumpetNote(freq, startTime, duration, volume = 0.35) {
  try {
    const c = getCtx();
    const osc1  = c.createOscillator();
    const osc2  = c.createOscillator();
    const gain  = c.createGain();
    const filt  = c.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.004; // slight detune for richness

    filt.type = 'lowpass';
    filt.frequency.value = freq * 9;
    filt.Q.value = 1.2;

    osc1.connect(filt); osc2.connect(filt);
    filt.connect(gain); gain.connect(c.destination);

    const atk = 0.018;
    const dec = 0.04;
    const sus = volume * 0.78;
    const rel = 0.055;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + atk);
    gain.gain.linearRampToValueAtTime(sus, startTime + atk + dec);
    gain.gain.setValueAtTime(sus, startTime + duration - rel);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc1.start(startTime); osc1.stop(startTime + duration + 0.02);
    osc2.start(startTime); osc2.stop(startTime + duration + 0.02);
  } catch (_) {}
}

// Classic horse racing "Call to the Post" trumpet fanfare
function startGen() {
  const c = getCtx();
  const t = c.currentTime;
  // G4 C5 E5 G5 (hold) E5 G5 (long hold)
  [
    { freq: 392, time: 0.00, dur: 0.14 },
    { freq: 523, time: 0.15, dur: 0.14 },
    { freq: 659, time: 0.30, dur: 0.14 },
    { freq: 784, time: 0.45, dur: 0.38 },
    { freq: 659, time: 0.88, dur: 0.14 },
    { freq: 784, time: 1.04, dur: 0.60 },
  ].forEach(n => trumpetNote(n.freq, t + n.time, n.dur, 0.38));
}

// Victory fanfare + crowd cheer
function winnerGen() {
  const c = getCtx();
  const t = c.currentTime;
  // Short punchy victory call
  [
    { freq: 523, time: 0.00, dur: 0.11 },
    { freq: 523, time: 0.12, dur: 0.11 },
    { freq: 523, time: 0.24, dur: 0.11 },
    { freq: 659, time: 0.36, dur: 0.28 },
    { freq: 784, time: 0.66, dur: 0.55 },
  ].forEach(n => trumpetNote(n.freq, t + n.time, n.dur, 0.42));

  // Crowd cheer swells in after the fanfare
  setTimeout(cheerGen, 700);
}

// Satisfying mechanical click for horse moves
function moveGen() {
  try {
    const c = getCtx();
    const t = c.currentTime;

    // Noise transient (the "click" attack)
    const bufLen = Math.floor(c.sampleRate * 0.018);
    const buf    = c.createBuffer(1, bufLen, c.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);

    const noise     = c.createBufferSource();
    noise.buffer    = buf;
    const nFilt     = c.createBiquadFilter();
    nFilt.type      = 'bandpass';
    nFilt.frequency.value = 1600;
    nFilt.Q.value   = 0.7;
    const nGain     = c.createGain();
    nGain.gain.setValueAtTime(0.55, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(c.destination);
    noise.start(t);

    // Short tonal body (gives the click a satisfying "thock")
    const osc  = c.createOscillator();
    const oGain = c.createGain();
    osc.type   = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
    oGain.gain.setValueAtTime(0.22, t);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(oGain); oGain.connect(c.destination);
    osc.start(t); osc.stop(t + 0.06);
  } catch (_) {}
}

// Penalty sound — descending tone
function penaltyGen() {
  try {
    const c = getCtx();
    const t = c.currentTime;
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.linearRampToValueAtTime(200, t + 0.28);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t); osc.stop(t + 0.36);
  } catch (_) {}
}

// Crowd cheer — band-pass filtered noise with LFO modulation
function cheerGen() {
  try {
    const c   = getCtx();
    const t   = c.currentTime;
    const dur = 4.0;

    const bufLen = Math.floor(c.sampleRate * dur);
    const buf    = c.createBuffer(2, bufLen, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    }

    const noise = c.createBufferSource();
    noise.buffer = buf;

    const bp  = c.createBiquadFilter();
    bp.type   = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 0.25;

    // LFO makes the crowd "swell"
    const lfo     = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value  = 2.8;
    lfoGain.gain.value   = 350;
    lfo.connect(lfoGain); lfoGain.connect(bp.frequency);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.32, t + 0.35);
    gain.gain.setValueAtTime(0.32, t + dur - 0.4);
    gain.gain.linearRampToValueAtTime(0, t + dur);

    noise.connect(bp); bp.connect(gain); gain.connect(c.destination);

    lfo.start(t); lfo.stop(t + dur);
    noise.start(t);
  } catch (_) {}
}

async function tryFile(path, fallback) {
  try {
    const c   = getCtx();
    const res = await fetch(path, { method: 'HEAD' });
    if (!res.ok) throw new Error();
    const buf     = await (await fetch(path)).arrayBuffer();
    const decoded = await c.decodeAudioData(buf);
    const src     = c.createBufferSource();
    src.buffer    = decoded;
    src.connect(c.destination);
    src.start();
  } catch (_) { fallback(); }
}

export const playMove    = () => moveGen();
export const playPenalty = () => tryFile('/sounds/penalty.mp3', penaltyGen);
export const playStart   = () => tryFile('/sounds/start.mp3',   startGen);
export const playWinner  = () => tryFile('/sounds/winner.mp3',  winnerGen);
