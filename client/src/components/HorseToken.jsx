import { HORSE_COLORS } from '../horseData';

/**
 * HorseToken — two modes:
 *
 *  fluid=false (default): uses the `size` prop (number in px) for inline styling.
 *  fluid=true:            ignores `size`, reads --D from CSS for fully responsive sizing.
 *                         Use this inside track cells so the token scales with the board.
 */
export default function HorseToken({ number, size = 48, scratched = false, fluid = false }) {
  const color = HORSE_COLORS[number];

  if (fluid) {
    return (
      <div
        className={`ht-fluid ${scratched ? 'ht-scratched' : ''}`}
        style={{ '--hc': color }}
      >
        {scratched ? (
          <>
            <span className="ht-emoji" style={{ opacity: 0.2 }}>🐎</span>
            <span className="ht-number" style={{ opacity: 0.3 }}>{number}</span>
            <div className="ht-x-overlay">✕</div>
          </>
        ) : (
          <>
            <span className="ht-emoji">🐎</span>
            <span className="ht-number">{number}</span>
          </>
        )}
      </div>
    );
  }

  // Fixed-size mode
  const numSize   = Math.round(size * 0.40);
  const emojiSize = Math.round(size * 0.28);
  const borderW   = Math.max(2, Math.round(size * 0.055));

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      backgroundColor: scratched ? '#2a2a2a' : color,
      border: `${borderW}px solid ${scratched ? '#444' : 'rgba(255,255,255,0.35)'}`,
      boxShadow: scratched ? 'none' : `0 3px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      userSelect: 'none', flexShrink: 0,
    }}>
      {scratched ? (
        <>
          <span style={{ fontSize: emojiSize, opacity: 0.25, lineHeight: 1 }}>🐎</span>
          <span style={{ fontSize: numSize, fontWeight: 900, color: '#666', lineHeight: 1 }}>{number}</span>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: size * 0.52, color: '#ef4444', fontWeight: 900, lineHeight: 1 }}>✕</span>
          </div>
        </>
      ) : (
        <>
          <span style={{ fontSize: emojiSize, lineHeight: 1, marginBottom: 1 }}>🐎</span>
          <span style={{
            fontSize: numSize, fontWeight: 900, color: 'white', lineHeight: 1,
            textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
          }}>{number}</span>
        </>
      )}
    </div>
  );
}
