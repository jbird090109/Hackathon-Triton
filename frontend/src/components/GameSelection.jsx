import '../styles/GameSelection.css';

const GAMES = [
  {
    id: 'physical',
    name: 'Physical Game',
    description: 'Compete in physical challenges',
  },
  {
    id: 'acting',
    name: 'Acting Game',
    description: 'Show your acting skills',
  },
  {
    id: 'dance',
    name: 'Dance Battle',
    description: 'Show off your dance moves',
  },
  {
    id: 'typing',
    name: 'Tug of War Typing',
    description: 'Type your way to victory',
  },
  {
    id: 'drawing',
    name: 'Drawing Game',
    description: 'Draw and guess',
  },
  {
    id: 'trivia',
    name: 'Trivia',
    description: 'Answer questions to win',
  },
];

export default function GameSelection({ playerName, onGameSelect, onBack }) {
  const handleSelectGame = (game) => {
    onGameSelect({
      gameId: game.id,
      gameName: game.name,
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
          <div key={game.id} className="game-card">
            <h3>{game.name}</h3>
            <p>{game.description}</p>
            <button
              className="confirm-button"
              onClick={() => handleSelectGame(game)}
            >
              Join Game
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
