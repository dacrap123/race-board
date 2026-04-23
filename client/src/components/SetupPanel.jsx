import { HORSES, HORSE_COLORS, penaltyFor } from '../horseData';
import HorseToken from './HorseToken';

const BET_PRESETS = [0.25, 0.50, 1, 2, 5, 10];

export default function SetupPanel({ gameState, dispatch }) {
  const { baseBet, scratchedHorses } = gameState;

  function toggleScratch(horse) {
    if (scratchedHorses.includes(horse)) {
      // Re-clicking a scratched horse adds its penalty to the pot (handled server-side)
      dispatch('ROLL_HORSE', { horse });
    } else if (scratchedHorses.length < 4) {
      dispatch('SCRATCH_HORSE', { horse });
    }
  }

  function canStart() {
    return scratchedHorses.length === 4;
  }

  return (
    <div className="setup-panel">
      <h2 className="setup-title">Race Setup</h2>

      {/* Base Bet */}
      <section className="setup-section">
        <h3 className="section-label">Base Bet</h3>
        <div className="bet-presets">
          {BET_PRESETS.map(v => (
            <button
              key={v}
              className={`preset-btn ${baseBet === v ? 'active' : ''}`}
              onClick={() => dispatch('SET_BASE_BET', { amount: v })}
            >
              ${v % 1 === 0 ? v : v.toFixed(2)}
            </button>
          ))}
        </div>
        <div className="bet-custom">
          <span className="bet-custom-label">Custom:</span>
          <input
            type="number"
            className="bet-input"
            min="0.01"
            step="0.25"
            value={baseBet}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (v > 0) dispatch('SET_BASE_BET', { amount: v });
            }}
          />
        </div>
      </section>

      {/* Scratch Selection */}
      <section className="setup-section">
        <h3 className="section-label">
          Scratch Horses
          <span className="section-sub"> — tap in order ({scratchedHorses.length}/4)</span>
        </h3>

        <div className="horse-grid">
          {HORSES.map(h => {
            const scratchIdx = scratchedHorses.indexOf(h);
            const isScratched = scratchIdx !== -1;
            const full = scratchedHorses.length >= 4 && !isScratched;

            return (
              <button
                key={h}
                className={`horse-pick-btn ${isScratched ? 'picked' : ''} ${full ? 'full' : ''}`}
                style={{
                  '--hc': HORSE_COLORS[h],
                  borderColor: isScratched ? HORSE_COLORS[h] : 'transparent',
                }}
                onClick={() => toggleScratch(h)}
                disabled={full}
              >
                <HorseToken number={h} size={44} scratched={isScratched} />
                {isScratched && (
                  <span className="horse-pick-badge">{scratchIdx + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Penalty Summary */}
      {scratchedHorses.length > 0 && (
        <section className="setup-section penalty-summary">
          <h3 className="section-label">Penalty Schedule</h3>
          <div className="penalty-rows">
            {scratchedHorses.map((h, i) => (
              <div key={h} className="penalty-row">
                <span>Scratch #{i + 1} — Horse {h}</span>
                <span className="penalty-amount">
                  {i + 1}× ${baseBet.toFixed(2)} = <strong>${penaltyFor(i, baseBet).toFixed(2)}</strong>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <button
        className="start-btn"
        disabled={!canStart()}
        onClick={() => dispatch('START_RACE')}
      >
        {canStart() ? '🏁 Start Race' : `Scratch ${4 - scratchedHorses.length} more horse${scratchedHorses.length === 3 ? '' : 's'} to start`}
      </button>
    </div>
  );
}
