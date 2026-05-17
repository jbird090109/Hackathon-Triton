import '../styles/ResultsScreen.css';

export default function ResultsScreen({
  winner,
  loser,
  gameName,
  onPlayAgain,
  onExit,
}) {
  const isWinner = winner === 'You';

  return (
    <div className="results-container">
      <div className="results-box">
        {isWinner ? (
          <>
            <div className="celebration">
              <h1 className="celebrate-text">🎉 YOU WIN! 🎉</h1>
              <div className="confetti"></div>
              <div className="confetti"></div>
              <div className="confetti"></div>
            </div>

            <div className="results-details">
              <div className="result-stat">
                <span className="stat-label">Game:</span>
                <span className="stat-value">{gameName}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Opponent:</span>
                <span className="stat-value">{loser}</span>
              </div>
              
            </div>
          </>
        ) : (
          <>
            <div className="game-over">
              <h1 className="game-over-text">Game Over</h1>
              <p className="loser-message">Better luck next time!</p>
            </div>

            <div className="results-details">
              <div className="result-stat">
                <span className="stat-label">Game:</span>
                <span className="stat-value">{gameName}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Winner:</span>
                <span className="stat-value winner-name">{winner}</span>
              </div>
              
            </div>
          </>
        )}

        <div className="results-actions">
          <button onClick={onPlayAgain} className="play-again-btn">
            🎮 Play Again
          </button>
          <button onClick={onExit} className="exit-btn">
            Exit Arena
          </button>
        </div>

        <div className="stats-summary">
          <h3>Session Stats</h3>
          <p>🎯 Matches Played: 1</p>
          <p>🏆 Win Rate: {isWinner ? '100%' : '0%'}</p>
        </div>
      </div>
    </div>
  );
}
