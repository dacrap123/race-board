import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
} from 'recharts';
import { HORSE_COLORS } from '../horseData';

const HORSES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Theoretical win probability based on 2d6 distribution (active horses only varies,
// but as a baseline we show pure dice probability across all 11 horses)
const DICE_PROB = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};
const TOTAL_COMBOS = 36;

function fmt$(n) { return `$${Number(n).toFixed(2)}`; }
function fmtDur(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={accent ? { borderColor: accent } : {}}>
      <div className="stat-card-value" style={accent ? { color: accent } : {}}>{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

function SectionHeader({ children }) {
  return <h2 className="stats-section-header">{children}</h2>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">Horse {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#e2e8f0' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
          {p.name?.includes('%') || p.name === 'Win %' || p.name === 'Expected %' ? '%' : ''}
        </div>
      ))}
    </div>
  );
};

export default function StatsPage({ onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => { setError('Could not load stats. Is the server running?'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="stats-loading">
      <div className="loading-spinner">📊</div>
      <div>Loading stats…</div>
    </div>
  );

  if (error) return (
    <div className="stats-loading">
      <div className="loading-error">{error}</div>
      <button className="back-btn" onClick={onBack}>← Back</button>
    </div>
  );

  const games = stats?.games ?? [];
  const totalGames = games.length;

  if (totalGames === 0) {
    return (
      <div className="stats-page">
        <div className="stats-topbar">
          <button className="stats-back-btn" onClick={onBack}>← Back</button>
          <h1 className="stats-title">📊 Statistics</h1>
        </div>
        <div className="stats-empty">
          <div className="stats-empty-icon">🐎</div>
          <div className="stats-empty-text">No games recorded yet</div>
          <div className="stats-empty-sub">Play your first race and stats will appear here.</div>
        </div>
      </div>
    );
  }

  // ── Compute aggregates ───────────────────────────────────────────────────

  const totalPot = games.reduce((s, g) => s + g.pot, 0);
  const avgPot   = totalPot / totalGames;
  const biggestPot = Math.max(...games.map(g => g.pot));
  const totalRolls = games.reduce((s, g) => s + (g.rollCount || 0), 0);
  const avgRolls   = totalRolls / totalGames;

  const durations = games.map(g => g.durationSeconds).filter(d => d != null);
  const fastestGame = durations.length ? Math.min(...durations) : null;
  const longestGame = durations.length ? Math.max(...durations) : null;

  // Per-horse stats
  const horseStats = {};
  HORSES.forEach(h => {
    horseStats[h] = { wins: 0, scratches: 0, scratchPenalty: 0, appearances: 0 };
  });

  games.forEach(g => {
    HORSES.forEach(h => {
      const scratchIdx = g.scratchedHorses.indexOf(h);
      if (scratchIdx !== -1) {
        horseStats[h].scratches++;
        // penalty = (position+1) * baseBet, but we don't know how many times it was rolled
        // just record it was scratched and at what cost per-roll
        horseStats[h].scratchPenalty += (scratchIdx + 1) * (g.baseBet || 1);
      } else {
        horseStats[h].appearances++;
      }
    });
    if (g.winner) horseStats[g.winner].wins++;
  });

  const mostWins   = HORSES.reduce((a, b) => horseStats[a].wins >= horseStats[b].wins ? a : b);
  const mostScratched = HORSES.reduce((a, b) => horseStats[a].scratches >= horseStats[b].scratches ? a : b);
  const biggestPenaltyHorse = HORSES.reduce((a, b) =>
    horseStats[a].scratchPenalty >= horseStats[b].scratchPenalty ? a : b);

  // Win rate vs expected
  const winRateData = HORSES.map(h => {
    const appearances = horseStats[h].appearances;
    const wins        = horseStats[h].wins;
    const winPct      = appearances > 0 ? (wins / appearances) * 100 : 0;
    const expectedPct = (DICE_PROB[h] / TOTAL_COMBOS) * 100;
    return {
      horse: h,
      name: `${h}`,
      'Win %': parseFloat(winPct.toFixed(1)),
      'Expected %': parseFloat(expectedPct.toFixed(1)),
      wins,
      appearances,
      color: HORSE_COLORS[h],
    };
  });

  // Scratch frequency
  const scratchData = HORSES.map(h => ({
    horse: h,
    name: `${h}`,
    Scratches: horseStats[h].scratches,
    'Penalty Generated': parseFloat(horseStats[h].scratchPenalty.toFixed(2)),
    color: HORSE_COLORS[h],
  }));

  // Pot size over time (last 30 games)
  const recentGames = games.slice(-30);
  const potOverTime = recentGames.map((g, i) => ({
    game: i + 1,
    Pot: parseFloat(g.pot.toFixed(2)),
  }));

  // Radar: normalised horse performance (wins, appearances, not scratched)
  const radarData = HORSES.map(h => ({
    horse: `${h}`,
    wins: horseStats[h].wins,
    appearances: horseStats[h].appearances,
    scratches: horseStats[h].scratches,
  }));

  // Recent games table (newest first)
  const recentTable = [...games].reverse().slice(0, 15);

  return (
    <div className="stats-page">

      {/* ── Top bar ── */}
      <div className="stats-topbar">
        <button className="stats-back-btn" onClick={onBack}>← Back</button>
        <h1 className="stats-title">📊 Statistics</h1>
        <span className="stats-game-count">{totalGames} game{totalGames !== 1 ? 's' : ''} recorded</span>
      </div>

      <div className="stats-content">

        {/* ── Hero cards ── */}
        <div className="stat-cards-grid">
          <StatCard label="Games Played"     value={totalGames} />
          <StatCard label="Average Pot"      value={fmt$(avgPot)} />
          <StatCard label="Biggest Pot"      value={fmt$(biggestPot)} accent="#f59e0b" />
          <StatCard label="Total Rolls"      value={totalRolls.toLocaleString()} sub={`~${avgRolls.toFixed(1)} per game`} />
          <StatCard label="Fastest Race"     value={fmtDur(fastestGame)} />
          <StatCard label="Longest Race"     value={fmtDur(longestGame)} />
          <StatCard label="Most Wins"        value={`Horse ${mostWins}`} accent={HORSE_COLORS[mostWins]} sub={`${horseStats[mostWins].wins} win${horseStats[mostWins].wins !== 1 ? 's' : ''}`} />
          <StatCard label="Most Scratched"   value={`Horse ${mostScratched}`} accent={HORSE_COLORS[mostScratched]} sub={`${horseStats[mostScratched].scratches}×`} />
        </div>

        {/* ── Win rate vs expected ── */}
        <SectionHeader>Win Rate vs Expected Probability</SectionHeader>
        <div className="chart-card">
          <p className="chart-note">Actual win % (among games horse wasn't scratched) vs theoretical dice probability</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={winRateData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232f47" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Horse', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="Win %" radius={[4, 4, 0, 0]}>
                {winRateData.map(d => <Cell key={d.horse} fill={d.color} />)}
              </Bar>
              <Bar dataKey="Expected %" fill="#334155" radius={[4, 4, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Scratch frequency ── */}
        <SectionHeader>Scratch Frequency</SectionHeader>
        <div className="chart-card">
          <p className="chart-note">How often each horse has been scratched across all games</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scratchData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232f47" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Scratches" radius={[4, 4, 0, 0]}>
                {scratchData.map(d => <Cell key={d.horse} fill={d.color} opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Pot over time ── */}
        {potOverTime.length >= 2 && (
          <>
            <SectionHeader>Pot Size Over Time</SectionHeader>
            <div className="chart-card">
              <p className="chart-note">Pot size for each of the last {potOverTime.length} games</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={potOverTime} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232f47" />
                  <XAxis dataKey="game" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Game #', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Pot']} contentStyle={{ background: '#141928', border: '1px solid #232f47', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="Pot" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── Per-horse breakdown table ── */}
        <SectionHeader>Horse Breakdown</SectionHeader>
        <div className="chart-card">
          <div className="horse-table-wrap">
            <table className="horse-table">
              <thead>
                <tr>
                  <th>Horse</th>
                  <th>Wins</th>
                  <th>Active Games</th>
                  <th>Win Rate</th>
                  <th>Times Scratched</th>
                  <th>Penalty Generated</th>
                </tr>
              </thead>
              <tbody>
                {HORSES.map(h => {
                  const hs = horseStats[h];
                  const winRate = hs.appearances > 0
                    ? ((hs.wins / hs.appearances) * 100).toFixed(1)
                    : '—';
                  return (
                    <tr key={h}>
                      <td>
                        <span className="horse-table-dot" style={{ background: HORSE_COLORS[h] }} />
                        Horse {h}
                      </td>
                      <td>{hs.wins}</td>
                      <td>{hs.appearances}</td>
                      <td>{winRate}{winRate !== '—' ? '%' : ''}</td>
                      <td>{hs.scratches}</td>
                      <td>{hs.scratchPenalty > 0 ? fmt$(hs.scratchPenalty) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recent games ── */}
        <SectionHeader>Recent Games</SectionHeader>
        <div className="chart-card">
          <div className="horse-table-wrap">
            <table className="horse-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Winner</th>
                  <th>Pot</th>
                  <th>Rolls</th>
                  <th>Duration</th>
                  <th>Scratched</th>
                </tr>
              </thead>
              <tbody>
                {recentTable.map(g => (
                  <tr key={g.id}>
                    <td className="td-dim">{new Date(g.timestamp).toLocaleDateString()}</td>
                    <td>
                      <span className="horse-table-dot" style={{ background: HORSE_COLORS[g.winner] }} />
                      Horse {g.winner}
                    </td>
                    <td style={{ color: '#22c55e' }}>{fmt$(g.pot)}</td>
                    <td>{g.rollCount ?? '—'}</td>
                    <td className="td-dim">{fmtDur(g.durationSeconds)}</td>
                    <td>
                      {g.scratchedHorses.map(h => (
                        <span key={h} className="scratch-pip" style={{ background: HORSE_COLORS[h] }}>{h}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
