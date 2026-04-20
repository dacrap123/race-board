import { useState } from 'react';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let c = '';
  for (let i = 0; i < 4; i++) {
    c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return c;
}

export default function LandingPage({ onJoin }) {
  const [step, setStep] = useState('pick');   // 'pick' | 'display' | 'controller' | 'single'
  const [sessionCode] = useState(generateCode);
  const [inputCode, setInputCode] = useState('');

  function handlePick(mode) {
    setStep(mode);
    if (mode !== 'controller') {
      // auto-join with generated code
      if (mode === 'single') {
        onJoin('single', sessionCode);
      }
    }
  }

  function handleDisplayJoin() {
    onJoin('display', sessionCode);
  }

  function handleControllerJoin() {
    const code = inputCode.toUpperCase().trim();
    if (code.length >= 4) onJoin('controller', code);
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
              <span className="mode-label">Single Device</span>
              <span className="mode-desc">Board + controller on one screen</span>
            </button>
            <button className="mode-btn" onClick={() => setStep('display')}>
              <span className="mode-icon">📺</span>
              <span className="mode-label">Display Mode</span>
              <span className="mode-desc">Projector / large screen</span>
            </button>
            <button className="mode-btn" onClick={() => setStep('controller')}>
              <span className="mode-icon">🎮</span>
              <span className="mode-label">Controller Mode</span>
              <span className="mode-desc">Phone / tablet remote</span>
            </button>
          </div>
        )}

        {step === 'display' && (
          <div className="landing-section">
            <p className="landing-hint">Share this code with your controller devices:</p>
            <div className="session-code-display">{sessionCode}</div>
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
              className="code-input"
              maxLength={4}
              placeholder="XXXX"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleControllerJoin()}
              autoFocus
            />
            <button
              className="primary-btn"
              onClick={handleControllerJoin}
              disabled={inputCode.trim().length < 4}
            >
              Join Session →
            </button>
            <button className="back-btn" onClick={() => setStep('pick')}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
