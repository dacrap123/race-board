import { HORSES, HORSE_COLORS, penaltyFor } from '../horseData';
import HorseToken from './HorseToken';
import { initAudio, playMove, playPenalty, playWinner } from '../sounds';

export default function ControllerPanel({ gameState, dispatch }) {
  const { baseBet, scratchedHorses, positions, phase, winner, pot } = gameState;
  const isFinished = phase === 'finished';

  function handleRoll(horse) {
    if (isFinished) return;
    initAudio();
    const scratchIdx = scratchedHorses.indexOf(horse);
    if (scratchIdx !== -1) {
      playPenalty();
    } else if (positions[horse] + 1 >= 10) {
      playWinner();
    } else {
      playMove();
    }
    dispatch('ROLL_HORSE', { horse });
  }

  return (
    <div className="controller-panel">
      {isFinished && (
        <div className="controller-winner-banner" style={{ background: HORSE_COLORS[winner] }}>
          🏆 Horse {winner} wins! · Pot: ${pot.toFixed(2)} · Payout: ${(pot / 4).toFixed(2)}/card
        </div>
      )}

      <div className="controller-header">
        <span className="controller-phase">
          {isFinished ? 'Race Over' : '🎲 Tap rolled number'}
        </span>
        <span className="controller-pot">
          Pot: <strong>${pot.toFixed(2)}</strong>
        </span>
      </div>

      <div className="roll-grid">
        {HORSES.map(h => {
          const scratchIdx = scratchedHorses.indexOf(h);
          const isScratched = scratchIdx !== -1;
          const penalty = isScratched ? penaltyFor(scratchIdx, baseBet) : null;
          const isWinner = winner === h;
          const color = HORSE_COLORS[h];

          return (
            <button
              key={h}
              className={`roll-btn ${isScratched ? 'roll-scratched' : 'roll-active'} ${isWinner ? 'roll-winner' : ''}`}
              style={isScratched
                ? {}
                : { '--hc': color, background: color }
              }
              onClick={() => handleRoll(h)}
              disabled={isFinished}
            >
              <HorseToken number={h} size={52} scratched={isScratched} />
              {isScratched && (
                <span className="roll-penalty-tag">+${penalty.toFixed(2)}</span>
              )}
              {isWinner && <span className="roll-winner-tag">🏆</span>}
            </button>
          );
        })}
      </div>

      <div className="controller-actions">
        <button
          className="action-btn undo-btn"
          onClick={() => dispatch('UNDO')}
          disabled={isFinished}
        >
          ↩ Undo
        </button>
        <button
          className="action-btn reset-btn"
          onClick={() => {
            if (window.confirm('Reset the race? All progress will be lost.')) {
              dispatch('RESET');
            }
          }}
        >
          ↺ Reset
        </button>
      </div>

      <div className="controller-legend">
        <span className="legend-item active-legend">■ Active horse → advances position</span>
        <span className="legend-item scratch-legend">■ Scratched → adds penalty to pot</span>
      </div>
    </div>
  );
}
