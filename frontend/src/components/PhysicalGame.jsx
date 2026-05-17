import { useEffect, useState } from 'react';
import socketService from '../services/socketService';

const PHYSICAL_PROMPTS = [
  'Do 10 push-ups',
  'Do 10 burpees',
  'Do 15 squats',
  'Do 20 jumping jacks',
  'Do 10 mountain climbers',
  'Hold a 30 second plank',
  'Do 15 lunges',
  'Do 20 high knees',
  'Do 10 star jumps',
  'Do 10 sit-ups',
];

export default function PhysicalGame({ matchId, playerName, opponentName }) {
  const [started, setStarted] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState('ready');

  useEffect(() => {
    socketService.on('game-update', (data) => {
      if (data.matchId !== matchId) return;
      if (data.eventType === 'player-ready' && data.playerName !== playerName) {
        setOpponentReady(true);
      }
    });

    return () => {
      socketService.off('game-update');
    };
  }, [matchId, playerName]);

  useEffect(() => {
    if (started && opponentReady) {
      setStatus('started');
      setTimeout(() => setCurrentPrompt(PHYSICAL_PROMPTS[0]), 250);
    }
  }, [started, opponentReady]);

  const handleStart = () => {
    setStarted(true);
    socketService.sendGameData({
      matchId,
      eventType: 'player-ready',
      playerName,
    });
    setStatus('waiting');
  };

  const handleNext = () => {
    const nextIndex = promptIndex + 1;
    if (nextIndex >= PHYSICAL_PROMPTS.length) {
      setFinished(true);
      setStatus('finished');
      socketService.sendGameData({
        matchId,
        eventType: 'player-finished',
        playerName,
      });
      return;
    }
    setPromptIndex(nextIndex);
    setCurrentPrompt(PHYSICAL_PROMPTS[nextIndex]);
  };

  return (
    <div className="challenge-game-container">
      <h3>Physical Challenge</h3>
      <p className="challenge-subtitle">Opponent: {opponentName}</p>
      {!started ? (
        <div className="challenge-start-panel">
          <p>Both competitors must click start to begin.</p>
          <button className="challenge-start-btn" onClick={handleStart}>
            🚀 Click to Start
          </button>
          <p className="challenge-tip">Waiting for opponent to join the room and click start.</p>
        </div>
      ) : finished ? (
        <div className="challenge-finished-panel">
          <h4>🎉 Challenge complete!</h4>
          <p>Great work — results will be processed shortly.</p>
        </div>
      ) : status === 'waiting' ? (
        <div className="challenge-waiting-panel">
          <p>Waiting for {opponentName} to click start...</p>
          <p>{opponentReady ? 'Opponent is ready! Starting soon...' : 'Opponent is not ready yet.'}</p>
        </div>
      ) : (
        <div className="challenge-active-panel">
          <p className="challenge-status">Challenge {promptIndex + 1} / {PHYSICAL_PROMPTS.length}</p>
          <div className="challenge-prompt-box">{currentPrompt}</div>
          <button className="challenge-next-btn" onClick={handleNext}>
            {promptIndex + 1 >= PHYSICAL_PROMPTS.length ? 'Finish Challenge' : 'Next Challenge'}
          </button>
        </div>
      )}
    </div>
  );
}
