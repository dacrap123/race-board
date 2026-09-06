import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let c = '';
  for (let i = 0; i < 4; i++) {
    c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return c;
}

export default function LandingPage({ onJoin, onStats }) {
  const sharedCode = new URLSearchParams(window.location.search).get('join')?.toUpperCase().slice(0, 4) || '';
  const [step, setStep] = useState(sharedCode ? 'controller' : 'pick');
  const [sessionCode] = useState(generateCode);
  const [inputCode, setInputCode] = useState(sharedCode);
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setShareStatus('Copied');
    } catch { setShareStatus('Copy unavailable'); }
    window.setTimeout(() => setShareStatus(''), 1800);
  }

  async function shareCode() {
    if (!navigator.share) return copyCode();
    try {
      await navigator.share({ title: 'Race Board session', text: `Join my Race Board session: ${sessionCode}`, url: joinUrl });
    } catch (_) {}
  }

  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${sessionCode}`;

  function handlePick(mode) {
    setStep(mode);
    setJoinError('');
    if (mode === 'single') onJoin('single', sessionCode);
  }

  function handleDisplayJoin() {
    onJoin('display', sessionCode);
  }

  async function handleControllerJoin() {
    const code = inputCode.toUpperCase().trim();
    if (code.length < 4) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch(`/api/sessions/${code}`);
      const { exists } = await res.json();
      if (exists) {
        onJoin('controller', code);
      } else {
        setJoinError(`No active session "${code}" — check the code on the display screen.`);
      }
    } catch {
      setJoinError('Could not reach server. Is it running?');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-logo">🐎</div>
        <h1 className="landing-title">Race Board</h1>
        <p className="landing-sub">Digital companion for your horse racing dice game</p>

        {step === 'pick' && (
          <div className="landing-modes">
            <button className="mode-btn" onClick={() => handlePick('single')}>
              <span className="mode-icon">📱</span>
              <span>
                <span className="mode-label">Single Device</span>
                <span className="mode-desc">Board + controller on one screen</span>
              </span>
            </button>
            <button className="mode-btn" onClick={() => setStep('display')}>
              <span className="mode-icon">📺</span>
              <span>
                <span className="mode-label">Display Mode</span>
                <span className="mode-desc">Projector / large screen</span>
              </span>
            </button>
            <button className="mode-btn" onClick={() => setStep('controller')}>
              <span className="mode-icon">🎮</span>
              <span>
                <span className="mode-label">Controller Mode</span>
                <span className="mode-desc">Phone / tablet remote</span>
              </span>
            </button>
            <button className="mode-btn mode-btn-stats" onClick={onStats}>
              <span className="mode-icon">📊</span>
              <span>
                <span className="mode-label">Statistics</span>
                <span className="mode-desc">Win rates, records &amp; history</span>
              </span>
            </button>
          </div>
        )}

        {step === 'display' && (
          <div className="landing-section">
            <p className="landing-hint">Share this code with your controller devices:</p>
            <div className="session-code-display">{sessionCode}</div>
            <div className="join-qr" aria-label={`QR code to join session ${sessionCode}`}>
              <QRCodeSVG value={joinUrl} size={148} bgColor="#151b2d" fgColor="#f8fafc" level="M" includeMargin />
              <span>Scan to join on a phone</span>
            </div>
            <div className="session-code-actions">
              <button className="secondary-btn" onClick={copyCode}>⧉ Copy Code</button>
              <button className="secondary-btn" onClick={shareCode}>↗ Share</button>
            </div>
            {shareStatus && <span className="share-status" role="status">{shareStatus}</span>}
            <button className="primary-btn" onClick={handleDisplayJoin}>
              Open Display Board →
            </button>
            <button className="back-btn" onClick={() => setStep('pick')}>← Back</button>
          </div>
        )}

        {step === 'controller' && (
          <div className="landing-section">
            <p className="landing-hint">Enter the session code shown on the display:</p>
            <input
              className={`code-input${joinError ? ' code-input-error' : ''}`}
              maxLength={4}
              placeholder="XXXX"
              value={inputCode}
              onChange={e => { setInputCode(e.target.value.toUpperCase()); setJoinError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleControllerJoin()}
              autoFocus
            />
            {joinError && <p className="join-error">{joinError}</p>}
            <button
              className="primary-btn"
              onClick={handleControllerJoin}
              disabled={inputCode.trim().length < 4 || joining}
            >
              {joining ? 'Checking…' : 'Join Session →'}
            </button>
            <button className="back-btn" onClick={() => { setStep('pick'); setJoinError(''); }}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

