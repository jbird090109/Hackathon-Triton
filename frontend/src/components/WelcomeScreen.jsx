import { useState } from 'react';
import '../styles/WelcomeScreen.css';

export default function WelcomeScreen({ onStart }) {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleStart = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (playerName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    onStart(playerName.trim());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleStart();
    }
  };

  return (
    <div className="welcome-container">
      <div className="welcome-box">
        <div className="welcome-header">
          <h1>ChallengeLink</h1>
          <p>Challenge someone in real-time</p>
        </div>

        <div className="welcome-form">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            maxLength={20}
            className="name-input"
          />
          {error && <p className="error-message">{error}</p>}
          <button onClick={handleStart} className="start-button">
            Enter Arena
          </button>
        </div>

        <div className="welcome-info">
          <h3>How it works:</h3>
          <ul>
            <li>Enter your name</li>
            <li>Choose a game category</li>
            <li>Get matched with another player</li>
            <li>Play and compete</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
