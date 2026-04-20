import { useEffect, useRef, useState } from 'react';
import { HORSES, HORSE_COLORS, TRACK_LENGTHS, penaltyFor } from '../horseData';
import HorseToken from './HorseToken';
import { playMove, playPenalty, playStart, playWinner, initAudio } from '../sounds';

/**
 * Row layout — two sections:
 *
 *  [row-fixed]                        [row-track — flex:1, space-between]
 *  [label][s4][s3][s2][s1][start]     [t1]   [t2]  …  [tN]
 *
 *  row-fixed is the same pixel width on every row.
 *  row-track fills the remaining space and uses justify-content:space-between,
 *  so the first cell is flush-left and the last cell (finish) is always flush-right —
 *  all finish lines align in the same column regardless of N.
 *  Horses with fewer steps get wider gaps; horse 7 (13 steps) has the tightest gaps.
 */
function TrackRow({ horse, position, isScratched, scratchIndex, isWinner }) {
  const tLen    = TRACK_LENGTHS[horse];
  const color   = HORSE_COLORS[horse];
  const atFinish = !isScratched && position >= tLen;

  return (
    <div className={`board-row ${isWinner ? 'row-winner' : ''} ${isScratched ? 'row-scratched' : ''}`}>

      {/* ── Fixed section ── */}
      <div className="row-fixed">
        {/* Label */}
        <div className="bcell label-cell">
          <HorseToken number={horse} fluid scratched={isScratched} />
        </div>

        {/* Scratch slots — left→right: slot 4, 3, 2, 1
            scratchIndex 0 (1st) → slot 1 → rightmost scratch col  */}
        {[3, 2, 1, 0].map(si => {
          const hasToken = isScratched && scratchIndex === si;
          return (
            <div key={si} className={`bcell scratch-bcell ${hasToken ? 'bcell-occupied' : ''}`}>
              {hasToken && <HorseToken number={horse} fluid />}
            </div>
          );
        })}

        {/* Starting gate */}
        <div className={`bcell start-bcell ${!isScratched && position === 0 ? 'bcell-occupied' : ''}`}>
          {!isScratched && position === 0 && <HorseToken number={horse} fluid />}
        </div>
      </div>

      {/* ── Track section — space-between so finish always at right edge ── */}
      <div className="row-track">
        {Array.from({ length: tLen }, (_, i) => {
          const trackPos  = i + 1;
          const isFinish  = trackPos === tLen;
          const showToken = !isScratched && (
            position === trackPos || (atFinish && isFinish)
          );

          return (
            <div
              key={trackPos}
              className={[
                'bcell',
                isFinish ? 'finish-bcell' : 'active-bcell',
                showToken    ? 'bcell-occupied' : '',
                isWinner && isFinish ? 'bcell-winner' : '',
              ].filter(Boolean).join(' ')}
              style={isFinish ? { '--fc': color } : {}}
            >
              {showToken && <HorseToken number={horse} fluid />}
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default function RaceBoard({ gameState, sessionCode }) {
  const { phase, baseBet, scratchedHorses, positions, pot, winner } = gameState;
  const prevRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    if (!soundEnabled || !prevRef.current) { prevRef.current = gameState; return; }
    const prev = prevRef.current;
    if (prev.phase === 'setup' && phase === 'racing')           playStart();
    else if (phase === 'finished' && prev.phase !== 'finished') playWinner();
    else if (gameState.pot > prev.pot)                          playPenalty();
    else if (HORSES.some(h => (positions[h]||0) > (prev.positions[h]||0))) playMove();
    prevRef.current = gameState;
  }, [gameState, soundEnabled]);

  const payout     = pot / 4;
  const isSetup    = phase === 'setup';
  const isRacing   = phase === 'racing';
  const isFinished = phase === 'finished';

  return (
    <div className="race-board">

      {/* ── Top bar ── */}
      <header className="board-header">
        <div className="board-title">
          <span className="board-icon">🐎</span>
          <span>Race Board</span>
        </div>
        <div className="board-meta">
          <span className="board-session">Session: <strong>{sessionCode}</strong></span>
          {!isSetup && <span className="board-pot">Pot: <strong>${pot.toFixed(2)}</strong></span>}
          {!isSetup && <span className="board-payout">Payout/card: <strong>${payout.toFixed(2)}</strong></span>}
          <span className={`board-phase phase-${phase}`}>
            {isSetup ? 'Setup' : isRacing ? '🏇 Racing' : '🏆 Finished'}
          </span>
        </div>
        {!soundEnabled && (
          <button className="sound-unlock-btn" onClick={() => { initAudio(); setSoundEnabled(true); }}>
            🔇 Click to enable sound
          </button>
        )}
      </header>

      {/* ── Winner banner ── */}
      {isFinished && winner && (
        <div className="winner-banner"
          style={{ background: `linear-gradient(135deg, ${HORSE_COLORS[winner]}, ${HORSE_COLORS[winner]}99)` }}>
          <span className="winner-trophy">🏆</span>
          <span className="winner-text">Horse {winner} Wins!</span>
          <span className="winner-amounts">Pot: ${pot.toFixed(2)} · ${payout.toFixed(2)} per card</span>
        </div>
      )}

      {/* ── Setup state ── */}
      {isSetup && (
        <div className="board-setup-overlay">
          <p>Waiting for setup…</p>
          <p className="board-setup-sub">Use the controller to configure and start the race.</p>
        </div>
      )}

      {/* ── Track ── */}
      {!isSetup && (
        <div className="track-wrap">

          {/* Zone labels */}
          <div className="zone-bar">
            <div className="zb-spacer" />
            <div className="zb-fixed-labels">
              <div className="zb-section zb-scratch">← SCRATCHED<br /><span>4 · 3 · 2 · 1</span></div>
              <div className="zb-section zb-start">START<br /><span>▶</span></div>
            </div>
            <div className="zb-section zb-finish">FINISH LINE →</div>
          </div>

          {/* Horse rows */}
          <div className="rows-wrap">
            {HORSES.map(horse => {
              const si = scratchedHorses.indexOf(horse);
              return (
                <TrackRow
                  key={horse}
                  horse={horse}
                  position={positions[horse] || 0}
                  isScratched={si !== -1}
                  scratchIndex={si}
                  baseBet={baseBet}
                  isWinner={winner === horse}
                />
              );
            })}
          </div>

        </div>
      )}

      {/* ── Footer ── */}
      {!isSetup && scratchedHorses.length > 0 && (
        <div className="board-footer">
          <span className="footer-label">Scratched:</span>
          {scratchedHorses.map((h, i) => (
            <span key={h} className="footer-scratch" style={{ color: HORSE_COLORS[h] }}>
              #{i+1} Horse {h} (+${penaltyFor(i, baseBet).toFixed(2)})
            </span>
          ))}
        </div>
      )}

    </div>
  );
}
