import { useEffect, useState } from 'react';
import socketService from '../services/socketService';

const ACTING_PROMPTS = [
  'Act like a dolphin',
  'Act like Dwayne “The Rock” Johnson',
  'Act like a clumsy robot',
  'Act like a pirate searching for treasure',
  'Act like a movie trailer announcer',
  'Act like a chef cooking a giant pizza',
  'Act like a superhero saving the city',
  'Act like a catwalk model on a runway',
  'Act like a sneaky ninja',
  'Act like a dinosaur waking up',
];

export default function ActingGame({ matchId, playerName, opponentName }) {
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
      setTimeout(() => setCurrentPrompt(ACTING_PROMPTS[0]), 250);
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
    if (nextIndex >= ACTING_PROMPTS.length) {
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
    setCurrentPrompt(ACTING_PROMPTS[nextIndex]);
  };

  return (
    <div className="challenge-game-container">
      <h3>Acting Challenge</h3>
      <p className="challenge-subtitle">Opponent: {opponentName}</p>
      {!started ? (
        <div className="challenge-start-panel">
          <p>Choose your character and press start.</p>
          <button className="challenge-start-btn" onClick={handleStart}>
            🎬 Start Acting
          </button>
          <p className="challenge-tip">Both players must click start to begin the scene.</p>
        </div>
      ) : finished ? (
        <div className="challenge-finished-panel">
          <h4>🎭 Scene complete!</h4>
          <p>Awesome performance — now wait for the judge decision.</p>
        </div>
      ) : status === 'waiting' ? (
        <div className="challenge-waiting-panel">
          <p>Waiting for {opponentName} to click start...</p>
          <p>{opponentReady ? 'Opponent is ready! Starting soon...' : 'Opponent is not ready yet.'}</p>
        </div>
      ) : (
        <div className="challenge-active-panel">
          <p className="challenge-status">Prompt {promptIndex + 1} / {ACTING_PROMPTS.length}</p>
          <div className="challenge-prompt-box">{currentPrompt}</div>
          <button className="challenge-next-btn" onClick={handleNext}>
            {promptIndex + 1 >= ACTING_PROMPTS.length ? 'Finish Act' : 'Next Prompt'}
          </button>
        </div>
      )}
    </div>
  );
}
