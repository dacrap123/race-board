import { lazy, Suspense, useState, useEffect } from 'react';
import socket from './socket';
import LandingPage from './components/LandingPage';
import RaceBoard from './components/RaceBoard';
import SetupPanel from './components/SetupPanel';
import ControllerPanel from './components/ControllerPanel';
const StatsPage = lazy(() => import('./components/StatsPage'));

export default function App() {
  const sharedSession = new URLSearchParams(window.location.search).get('join')?.toUpperCase().trim() || '';
  const [mode, setMode] = useState(() => {
    if (sharedSession) return 'controller';
    try { return localStorage.getItem('race-board-mode') || null; } catch (_) { return null; }
  });
  const [sessionCode, setSessionCode] = useState(() => {
    if (sharedSession) return sharedSession;
    try { return localStorage.getItem('race-board-session') || ''; } catch (_) { return ''; }
  });
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  function dispatch(type, payload = {}) {
    socket.emit('action', { type, payload });
  }

  function leaveSession() {
    try {
      localStorage.removeItem('race-board-mode');
      localStorage.removeItem('race-board-session');
    } catch (_) {}
    setMode(null);
    setSessionCode('');
    setError('');
  }

  function joinSession(nextMode, code) {
    const normalized = code.toUpperCase().trim();
    try {
      localStorage.setItem('race-board-mode', nextMode);
      localStorage.setItem('race-board-session', normalized);
    } catch (_) {}
    setMode(nextMode);
    setSessionCode(normalized);
  }

  // Connect to server when mode + code are chosen
  useEffect(() => {
    if (!mode || !sessionCode) return;

    socket.connect();

    const onConnect = () => {
      setConnected(true);
      setError('');
      socket.emit('join_session', { code: sessionCode });
    };
    const onDisconnect = () => setConnected(false);
    const onStateUpdate = (state) => setGameState(state);
    const onConnectError = () => setError('Cannot reach server. Is it running?');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state_update', onStateUpdate);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state_update', onStateUpdate);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
      setGameState(null);
      setConnected(false);
    };
  }, [mode, sessionCode]);

  // Stats page
  if (mode === 'stats') {
    return <Suspense fallback={<div className="loading-screen">Loading statistics…</div>}><StatsPage onBack={() => setMode(null)} /></Suspense>;
  }

  // Landing
  if (!mode || !sessionCode) {
    return (
      <LandingPage
        onJoin={joinSession}
        onStats={() => setMode('stats')}
      />
    );
  }

  // Connection states
  if (error && !gameState) {
    return (
      <div className="loading-screen">
        <div className="loading-error">{error}</div>
        <button className="back-btn" onClick={leaveSession}>
          ← Back
        </button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🐎</div>
        <div>{connected ? 'Loading game…' : 'Connecting…'}</div>
      </div>
    );
  }

  // Controller: show setup or controller panel
  if (mode === 'controller') {
    return (
      <div className="controller-wrapper">
        <div className="controller-top-bar">
          <span className="ctrl-session">Session: <strong>{sessionCode}</strong></span>
          <span className={`ctrl-dot ${connected ? 'dot-on' : 'dot-off'}`} />
          <span className={`ctrl-status ${connected ? 'status-on' : 'status-off'}`}>
            {connected ? 'Controller connected' : 'Reconnecting…'}
          </span>
          {!connected && (
            <button className="ctrl-reconnect" onClick={() => socket.connect()}>
              Reconnect
            </button>
          )}
          <button className="ctrl-leave" onClick={leaveSession}>Leave</button>
        </div>
        {gameState.phase === 'setup'
          // In split mode the display owns race audio. The controller only
          // sends the start action; the display hears the state transition.
          ? <SetupPanel gameState={gameState} dispatch={dispatch} />
          : <ControllerPanel gameState={gameState} dispatch={dispatch} />
        }
      </div>
    );
  }

  // Display mode
  if (mode === 'display') {
    return <RaceBoard gameState={gameState} sessionCode={sessionCode} connected={connected} dispatch={dispatch} canControl={false} presentation />;
  }

  // Single device: stacked board + controls
  return (
    <div className="single-device-layout">
      <div className="single-board-pane">
        <RaceBoard gameState={gameState} sessionCode={sessionCode} connected={connected} dispatch={dispatch} setupOnThisScreen />
      </div>
      <div className="single-ctrl-pane">
        {gameState.phase === 'setup'
          ? <SetupPanel gameState={gameState} dispatch={dispatch} playStartCue singleDevice />
          : <ControllerPanel gameState={gameState} dispatch={dispatch} />
        }
      </div>
    </div>
  );
}

