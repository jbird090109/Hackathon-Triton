import { useEffect, useRef, useState } from 'react';
import '../styles/JudgeView.css';

export default function JudgeView({
  gameName,
  player1Name,
  player2Name,
  onVoteSubmitted,
  onLeaveGame,
}) {
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [voted, setVoted] = useState(null);
  const [gameActive, setGameActive] = useState(true);

  // Timer
  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVote = (winner) => {
    setVoted(winner);
    onVoteSubmitted({
      winner,
      votedAt: Date.now(),
      gameName,
      player1: player1Name,
      player2: player2Name,
    });
  };

  const handleLeaveGame = () => {
    setGameActive(false);
    onLeaveGame();
  };

  return (
    <div className="judge-view-container">
      <div className="judge-header">
        <h2>🏛️ Judge View</h2>
        <p className="game-name">{gameName}</p>
        <p className="time-display">⏱️ {formatTime(elapsedTime)}</p>
      </div>

      <div className="judge-video-grid">
        {/* Player 1 */}
        <div className="judge-video-container">
          <video
            ref={video1Ref}
            autoPlay
            playsInline
            className={`judge-video ${voted === player1Name ? 'highlight-winner' : ''}`}
          />
          <div className="judge-player-info">
            <span className="judge-player-name">{player1Name}</span>
          </div>
        </div>

        {/* VS indicator */}
        <div className="vs-indicator">
          <span>VS</span>
        </div>

        {/* Player 2 */}
        <div className="judge-video-container">
          <video
            ref={video2Ref}
            autoPlay
            playsInline
            className={`judge-video ${voted === player2Name ? 'highlight-winner' : ''}`}
          />
          <div className="judge-player-info">
            <span className="judge-player-name">{player2Name}</span>
          </div>
        </div>
      </div>

      {/* Judge Controls */}
      <div className="judge-controls">
        <div className="judge-criteria">
          <h3>📋 Judging Criteria:</h3>
          <ul>
            <li>Performance Quality</li>
            <li>Effort & Engagement</li>
            <li>Entertainment Value</li>
            <li>Overall Impression</li>
          </ul>
        </div>

        {!voted ? (
          <div className="voting-buttons">
            <button
              onClick={() => handleVote(player1Name)}
              className="vote-btn player1-vote"
            >
              ✓ {player1Name} Wins
            </button>
            <button
              onClick={() => handleVote(player2Name)}
              className="vote-btn player2-vote"
            >
              ✓ {player2Name} Wins
            </button>
          </div>
        ) : (
          <div className="vote-submitted">
            <div className="vote-info">
              <h3>✓ Vote Submitted!</h3>
              <p>Winner: <strong>{voted}</strong></p>
              <p className="vote-time">Time: {formatTime(elapsedTime)}</p>
            </div>
            <p className="wait-message">Waiting for game to end...</p>
          </div>
        )}

        <button onClick={handleLeaveGame} className="leave-btn">
          ← Leave Judging
        </button>
      </div>
    </div>
  );
}
