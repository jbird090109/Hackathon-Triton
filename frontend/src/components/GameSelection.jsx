import '../styles/GameSelection.css';

const GAMES = [
  {
    id: 'physical',
    name: 'Physical Game',
    icon: '💪',
    description: 'Compete in physical challenges',
    hasJudge: true,
  },
  {
    id: 'acting',
    name: 'Acting Game',
    icon: '🎭',
    description: 'Show your acting skills',
    hasJudge: true,
  },
  {
    id: 'dance',
    name: 'Dance Battle',
    icon: '💃',
    description: 'Show off your dance moves',
    hasJudge: true,
  },
  {
    id: 'typing',
    name: 'Tug of War Typing',
    icon: '⌨️',
    description: 'Type your way to victory',
    hasJudge: false,
  },
  {
    id: 'drawing',
    name: 'Drawing Game',
    icon: '🎨',
    description: 'Draw and guess',
    hasJudge: true,
  },
  {
    id: 'trivia',
    name: 'Trivia',
    icon: '🧠',
    description: 'Answer questions to win',
    hasJudge: false,
  },
];

export default function GameSelection({ playerName, onGameSelect, onBack }) {
  const handleSelectGame = (game) => {
    onGameSelect({
      gameId: game.id,
      gameName: game.name,
      isJudge: false,
    });
  };

  return (
    <div className="game-selection-container">
      <div className="game-selection-header">
        <button onClick={onBack} className="back-button">
          ← Back
        </button>
        <h2>Welcome, <span className="player-name">{playerName}</span>!</h2>
        <p>Choose your game and click to join</p>
      </div>

      <div className="game-grid">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => handleSelectGame(game)}
          >
            <div className="game-icon">{game.icon}</div>
            <h3>{game.name}</h3>
            <p>{game.description}</p>
            <p className="join-hint">Click to join and connect</p>
            {game.hasJudge && (
              <span className="judge-badge">👨‍⚖️ Judge Available</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
