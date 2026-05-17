import { useEffect, useState } from 'react';
import socketService from '../services/socketService';

const ACTING_PROMPTS = [
  'Riding a tricycle',
  'Watching a romantic comedy',
  'Doing the backstroke',
  'Running on a treadmill',
  'Flying in first class',
  'Sleeping in a hammock',
  'Cooking meat',
  'Listening to classical music',
  'Driving a go-kart',
  'Writing a letter of complaint',
  'Tobogganing down a hill',
  'Flying a drone',
  'Winning an award',
  'Gardening',
  'Sailing a boat',
  'Acting on stage',
  'Playing a cowbell',
  'Pretending to be surprised',
  'Putting on a wig',
  'Wrestling',
  'Watching YouTube',
  'Teaching a language',
  'Taking a bath',
  'Learning something new',
  'Paddle boarding'
];

const TOTAL_PROMPTS = 5;

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export default function ActingGame({ matchId, playerName, opponentName }) {
  const [started, setStarted] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState('ready');
  const [selectedPrompts, setSelectedPrompts] = useState([]);

  useEffect(() => {
    socketService.on('game-update', (data) => {
      if (data.matchId !== matchId) return;

      if (
        data.eventType === 'player-ready' &&
        data.playerName !== playerName
      ) {
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

      const randomized = shuffleArray(ACTING_PROMPTS).slice(
        0,
        TOTAL_PROMPTS
      );

      setSelectedPrompts(randomized);

      setTimeout(() => {
        setCurrentPrompt(randomized[0]);
      }, 250);
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

    if (nextIndex >= selectedPrompts.length) {
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
    setCurrentPrompt(selectedPrompts[nextIndex]);
  };

  return (
    <div className="challenge-game-container">
      <h3>Acting Challenge</h3>

      <p className="challenge-subtitle">
        Opponent: {opponentName}
      </p>

      {!started ? (
        <div className="challenge-start-panel">
          <p>Choose your character and press start.</p>

          <button
            className="challenge-start-btn"
            onClick={handleStart}
          >
            🎬 Start Acting
          </button>

          <p className="challenge-tip">
            Both players must click start to begin the scene.
          </p>
        </div>
      ) : finished ? (
        <div className="challenge-finished-panel">
          <h4>🎭 Scene complete!</h4>

          <p>
            Awesome performance — results will be processed shortly.
          </p>
        </div>
      ) : status === 'waiting' ? (
        <div className="challenge-waiting-panel">
          <p>
            Waiting for {opponentName} to click start...
          </p>

          <p>
            {opponentReady
              ? 'Opponent is ready! Starting soon...'
              : 'Opponent is not ready yet.'}
          </p>
        </div>
      ) : (
        <div className="challenge-active-panel">
          <p className="challenge-status">
            Prompt {promptIndex + 1} / {selectedPrompts.length}
          </p>

          <div className="challenge-prompt-box">
            {currentPrompt}
          </div>

          <button
            className="challenge-next-btn"
            onClick={handleNext}
          >
            {promptIndex + 1 >= selectedPrompts.length
              ? 'Finish Act'
              : 'Next Prompt'}
          </button>
        </div>
      )}
    </div>
  );
}