import { useState, useEffect } from 'react';
import socket from './socket';
import LandingPage from './components/LandingPage';
import RaceBoard from './components/RaceBoard';
import SetupPanel from './components/SetupPanel';
import ControllerPanel from './components/ControllerPanel';
import StatsPage from './components/StatsPage';

export default function App() {
  const [mode, setMode] = useState(null);           // 'display' | 'controller' | 'single' | 'stats'
  const [sessionCode, setSessionCode] = useState('');
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  function dispatch(type, payload = {}) {
    socket.emit('action', { type, payload });
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
    return <StatsPage onBack={() => setMode(null)} />;
  }

  // Landing
  if (!mode || !sessionCode) {
    return (
      <LandingPage
        onJoin={(m, code) => { setMode(m); setSessionCode(code); }}
        onStats={() => setMode('stats')}
      />
    );
  }

  // Connection states
  if (error) {
    return (
      <div className="loading-screen">
        <div className="loading-error">{error}</div>
        <button className="back-btn" onClick={() => { setMode(null); setSessionCode(''); setError(''); }}>
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
          <button className="ctrl-leave" onClick={() => { setMode(null); setSessionCode(''); }}>Leave</button>
        </div>
        {gameState.phase === 'setup'
          ? <SetupPanel gameState={gameState} dispatch={dispatch} />
          : <ControllerPanel gameState={gameState} dispatch={dispatch} />
        }
      </div>
    );
  }

  // Display mode
  if (mode === 'display') {
    return <RaceBoard gameState={gameState} sessionCode={sessionCode} dispatch={dispatch} />;
  }

  // Single device: stacked board + controls
  return (
    <div className="single-device-layout">
      <div className="single-board-pane">
        <RaceBoard gameState={gameState} sessionCode={sessionCode} dispatch={dispatch} />
      </div>
      <div className="single-ctrl-pane">
        {gameState.phase === 'setup'
          ? <SetupPanel gameState={gameState} dispatch={dispatch} />
          : <ControllerPanel gameState={gameState} dispatch={dispatch} />
        }
      </div>
    </div>
  );
}
