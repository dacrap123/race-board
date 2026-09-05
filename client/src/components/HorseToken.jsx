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
        <img
          className={`horse-token-image ${scratched ? 'horse-token-image-scratched' : ''}`}
          src="/assets/horse-playing-piece.png"
          alt=""
          aria-hidden="true"
        />
        {scratched ? (
          <>
            <span className="ht-number horse-token-number" style={{ opacity: 0.3 }}>{number}</span>
            <div className="ht-x-overlay">✕</div>
          </>
        ) : (
          <span className="ht-number horse-token-number">{number}</span>
        )}
      </div>
    );
  }

  // Picker mode: the CSS variable gives the token a preferred size while
  // allowing its parent grid/container to shrink it on smaller screens.
  return (
    <div className="horse-token" style={{
      '--token-size': `${size}px`,
      '--hc': color,
      borderRadius: '50%',
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'visible',
      userSelect: 'none', flexShrink: 0,
    }}>
      <img
        className={`horse-token-image ${scratched ? 'horse-token-image-scratched' : ''}`}
        src="/assets/horse-playing-piece.png"
        alt=""
        aria-hidden="true"
      />
      {scratched ? (
        <>
          <span className="horse-token-number" style={{ fontWeight: 900, color: '#666', lineHeight: 1 }}>{number}</span>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: size * 0.52, color: '#ef4444', fontWeight: 900, lineHeight: 1 }}>✕</span>
          </div>
        </>
      ) : (
        <span className="horse-token-number" style={{
          fontWeight: 900, color: 'white', lineHeight: 1,
          textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
        }}>{number}</span>
      )}
    </div>
  );
}
