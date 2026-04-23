import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { HORSES, HORSE_COLORS, TRACK_LENGTHS, penaltyFor } from '../horseData';
import HorseToken from './HorseToken';
import { playMove, playPenalty, playStart, playWinner, initAudio } from '../sounds';

function TrackRow({ horse, position, isScratched, scratchIndex, isWinner }) {
  const tLen    = TRACK_LENGTHS[horse];
  const color   = HORSE_COLORS[horse];
  const atFinish = !isScratched && position >= tLen;

  return (
    <div className={`board-row ${isWinner ? 'row-winner' : ''} ${isScratched ? 'row-scratched' : ''}`}>

      <div className="row-fixed">
        <div className="bcell label-cell">
          <HorseToken number={horse} fluid scratched={isScratched} />
        </div>
        {[3, 2, 1, 0].map(si => {
          const hasToken = isScratched && scratchIndex === si;
          return (
            <div key={si} className={`bcell scratch-bcell ${hasToken ? 'bcell-occupied' : ''}`}>
              {hasToken && <HorseToken number={horse} fluid />}
            </div>
          );
        })}
        <div className={`bcell start-bcell ${!isScratched && position === 0 ? 'bcell-occupied' : ''}`}>
          {!isScratched && position === 0 && <HorseToken number={horse} fluid />}
        </div>
      </div>

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
                showToken ? 'bcell-occupied' : '',
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

function fireConfetti(color) {
  const base = { colors: [color, '#ffffff', '#ffd700', '#f59e0b'] };
  // First burst: in front of the modal (z-index > 1000)
  confetti({ ...base, zIndex: 1100, particleCount: 120, spread: 70,  origin: { x: 0.5, y: 0.4 } });
  // Remaining bursts: behind the modal (z-index < 1000)
  setTimeout(() => confetti({ ...base, zIndex: 999, particleCount: 80, spread: 90,  origin: { x: 0.2, y: 0.5 } }), 250);
  setTimeout(() => confetti({ ...base, zIndex: 999, particleCount: 80, spread: 90,  origin: { x: 0.8, y: 0.5 } }), 450);
  setTimeout(() => confetti({ ...base, zIndex: 999, particleCount: 60, spread: 120, origin: { x: 0.5, y: 0.3 } }), 700);
}

export default function RaceBoard({ gameState, sessionCode, dispatch }) {
  const { phase, baseBet, scratchedHorses, positions, pot, winner } = gameState;
  const prevRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  // Snapshot winner data so the modal survives a server reset
  const [winnerSnap, setWinnerSnap] = useState(null);

  // Sound effects
  useEffect(() => {
    if (!soundEnabled || !prevRef.current) { prevRef.current = gameState; return; }
    const prev = prevRef.current;
    if (prev.phase === 'setup' && phase === 'racing')           playStart();
    else if (phase === 'finished' && prev.phase !== 'finished') playWinner();
    else if (gameState.pot > prev.pot)                          playPenalty();
    else if (HORSES.some(h => (positions[h]||0) > (prev.positions[h]||0))) playMove();
    prevRef.current = gameState;
  }, [gameState, soundEnabled]);

  // Open the modal when the race finishes — snapshot data so it survives broadcasts.
  useEffect(() => {
    if (phase === 'finished' && winner) {
      const snap = { winner, pot, payout: pot / 4, quarters: Math.round((pot / 4) / 0.25) };
      setWinnerSnap(snap);
      setShowWinnerModal(true);
      fireConfetti(HORSE_COLORS[winner]);
    }
  }, [phase, winner]);

  // Close the modal when a RESET is received (phase returns to 'setup').
  useEffect(() => {
    if (phase === 'setup') {
      setShowWinnerModal(false);
      setWinnerSnap(null);
    }
  }, [phase]);

  const payout     = pot / 4;
  const quarters   = Math.round(payout / 0.25);
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
          {!isSetup && (
            <span className="board-payout">
              Payout/card: <strong>${payout.toFixed(2)}</strong>
              <span className="board-quarters">{quarters} quarter{quarters !== 1 ? 's' : ''}</span>
            </span>
          )}
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

      {/* ── Winner modal — only closes via New Game button ── */}
      {showWinnerModal && winnerSnap && (
        <div className="winner-overlay">
          <div className="winner-modal" style={{ '--wc': HORSE_COLORS[winnerSnap.winner] }}>
            <div className="winner-modal-trophy">🏆</div>
            <div className="winner-modal-horse" style={{ color: HORSE_COLORS[winnerSnap.winner] }}>
              Horse {winnerSnap.winner}
            </div>
            <div className="winner-modal-wins">Wins the Race!</div>
            <div className="winner-modal-divider" style={{ background: HORSE_COLORS[winnerSnap.winner] }} />
            <div className="winner-modal-amounts">
              <div className="winner-modal-pot">
                <span className="winner-modal-amount-label">Total Pot</span>
                <span className="winner-modal-amount-value">${winnerSnap.pot.toFixed(2)}</span>
              </div>
              <div className="winner-modal-per-card">
                <span className="winner-modal-amount-label">Per Card</span>
                <span className="winner-modal-amount-value" style={{ color: '#22c55e' }}>
                  ${winnerSnap.payout.toFixed(2)}
                </span>
                <span className="winner-modal-quarters">
                  {winnerSnap.quarters} quarter{winnerSnap.quarters !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button className="winner-modal-dismiss" onClick={() => {
              setShowWinnerModal(false);
              setWinnerSnap(null);
              if (dispatch) dispatch('RESET');
            }}>
              New Game
            </button>
          </div>
        </div>
      )}

      {/* ── Setup status bar ── */}
      {isSetup && (
        <div className="board-setup-bar">
          {scratchedHorses.length === 0
            ? 'Waiting for setup — scratch 4 horses on the controller to begin'
            : scratchedHorses.length < 4
              ? `${scratchedHorses.length} of 4 horses scratched — scratch ${4 - scratchedHorses.length} more to start`
              : '4 horses scratched — ready to start'}
        </div>
      )}

      {/* ── Track (always visible, even during setup) ── */}
      <div className="track-wrap">

        <div className="zone-bar">
          <div className="zb-spacer" />
          <div className="zb-fixed-labels">
            <div className="zb-section zb-scratch">← SCRATCHED<br /><span>4 · 3 · 2 · 1</span></div>
            <div className="zb-section zb-start">START<br /><span>▶</span></div>
          </div>
          <div className="zb-track-spacer" />
          <div className="zb-section zb-finish">🏁</div>
        </div>

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
