import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { HORSES, HORSE_COLORS, TRACK_LENGTHS, penaltyFor } from '../horseData';
import HorseToken from './HorseToken';
import { playMove, playPenalty, playStart, playWinner, initAudio } from '../sounds';

function TrackRow({ horse, position, isScratched, scratchIndex, baseBet, isWinner }) {
  const tLen    = TRACK_LENGTHS[horse];
  const color   = HORSE_COLORS[horse];
  const atFinish = !isScratched && position >= tLen;

  return (
    <div className={`board-row ${isWinner ? 'row-winner' : ''} ${isScratched ? 'row-scratched' : ''}`}>

      <div className="row-fixed">
        {[3, 2, 1, 0].map(si => {
          const hasToken = isScratched && scratchIndex === si;
          return (
            <div key={si} className={`bcell scratch-bcell ${hasToken ? 'bcell-occupied' : ''}`}>
              {hasToken && <HorseToken number={horse} fluid scratched penalty={penaltyFor(scratchIndex, baseBet)} />}
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

function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function RaceBoard({ gameState, sessionCode, connected = true, dispatch, canControl = true }) {
  const { phase, baseBet, scratchedHorses, positions, pot, winner, rollLog = [] } = gameState;
  const prevRef = useRef(null);
  // Sound is enabled by default. Browsers may still require the first game
  // action as the user gesture that unlocks audio, which Start Race provides.
  const [soundEnabled] = useState(true);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  // Snapshot winner data so the modal survives a server reset
  const [winnerSnap, setWinnerSnap] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!gameState.raceStartTime || phase === 'setup') return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [gameState.raceStartTime, phase]);

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

  // Close the modal when a reset or undo returns the game to a non-finished phase.
  useEffect(() => {
    if (phase !== 'finished') {
      setShowWinnerModal(false);
      setWinnerSnap(null);
    }
  }, [phase]);

  const payout     = pot / 4;
  const quarters   = Math.round(payout / 0.25);
  const elapsedSeconds = gameState.raceStartTime
    ? Math.max(0, Math.floor(((phase === 'finished' ? now : Date.now()) - gameState.raceStartTime) / 1000))
    : 0;
  const isSetup    = phase === 'setup';
  const isRacing   = phase === 'racing';
  const isFinished = phase === 'finished';
  const lastRoll = rollLog.length ? rollLog[rollLog.length - 1] : null;

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
          {!isSetup && <span className="board-timer">⏱ {formatElapsed(elapsedSeconds)}</span>}
        </div>
        <span className={`board-connection ${connected ? 'status-on' : 'status-off'}`}>
          {connected ? '● Connected' : '● Disconnected'}
        </span>
        {!isSetup && lastRoll && (
          <span className="board-last-roll" aria-live="polite">
            {lastRoll.kind === 'penalty' ? '⚠' : '➜'} Horse {lastRoll.horse}
          </span>
        )}
      </header>

      {/* ── Winner modal — only closes via New Game button ── */}
      {showWinnerModal && winnerSnap && (
        <div className="winner-overlay">
          <div className="winner-modal" style={{ '--wc': HORSE_COLORS[winnerSnap.winner] }}>
            <div className="winner-modal-trophy">🏆</div>
            <HorseToken number={winnerSnap.winner} size={110} />
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
            <div className="winner-modal-actions">
              {canControl && dispatch && gameState.history?.length > 0 && (
                <button className="winner-modal-undo" onClick={() => {
                  setShowWinnerModal(false);
                  setWinnerSnap(null);
                  dispatch('UNDO');
                }}>
                  ↩ Undo Winning Roll
                </button>
              )}
              {canControl ? <button className="winner-modal-dismiss" onClick={() => {
                if (window.confirm('Start a new race? The current race will be reset.')) {
                  setShowWinnerModal(false);
                  setWinnerSnap(null);
                  if (dispatch) dispatch('RESET');
                }
              }}>
                New Game
              </button> : (
                <div className="winner-modal-viewer-note">Start a new game from the controller.</div>
              )}
            </div>
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
      <div className="track-container">

      {/* Setup overlay — blurs board and shows scratch list */}
      {isSetup && (
        <div className="setup-scratch-overlay">
          <div className="setup-scratch-card">
            <div className="ssc-header">
              <span>Race Setup</span>
              {pot > 0 && <span className="ssc-pot">Pot: ${pot.toFixed(2)}</span>}
            </div>
            {scratchedHorses.length === 0 ? (
              <p className="ssc-empty">Scratch 4 horses on the controller to begin</p>
            ) : (
              <div className="ssc-list">
                {scratchedHorses.map((h, i) => (
                  <div key={h} className="ssc-row">
                    <span className="ssc-num">{i + 1}</span>
                    <HorseToken number={h} size={32} />
                    <span className="ssc-horse-name" style={{ color: HORSE_COLORS[h] }}>Horse {h}</span>
                    <span className="ssc-penalty">{i + 1}× ${baseBet.toFixed(2)} = <strong>${penaltyFor(i, baseBet).toFixed(2)}</strong></span>
                    {canControl && dispatch && (
                      <button className="ssc-remove" onClick={() => dispatch('UNSCRATCH_HORSE', { horse: h })}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="ssc-status">
              {scratchedHorses.length < 4
                ? `Scratch ${4 - scratchedHorses.length} more horse${4 - scratchedHorses.length !== 1 ? 's' : ''} to start`
                : '✓ Ready — press Start Race on the controller'}
            </div>
          </div>
        </div>
      )}

      <div className={`track-wrap${isSetup ? ' track-blurred' : ''}`}>

        <div className="zone-bar">
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
      </div>{/* end track-container */}

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
