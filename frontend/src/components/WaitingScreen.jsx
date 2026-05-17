import { useEffect, useState } from 'react';
import '../styles/WaitingScreen.css';

export default function WaitingScreen({ gameName, onMatchFound, onCancel }) {
  const [dots, setDots] = useState('');
  const [waitTime, setWaitTime] = useState(0);

  useEffect(() => {
    // Animated loading dots
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 500);

    // Wait time counter
    const timeInterval = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const formatWaitTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="waiting-container">
      <div className="waiting-box">
        <div className="waiting-animation">
          <div className="spinner"></div>
        </div>

        <h2>Searching for an opponent{dots}</h2>
        <p className="game-name">{gameName}</p>

        <div className="wait-info">
          <p>People online: ~{Math.floor(Math.random() * 50) + 10}</p>
          <p>Wait time: {formatWaitTime(waitTime)}</p>
        </div>

        <div className="tips">
          <h3>💡 While you wait:</h3>
          <ul>
            <li>✓ Make sure your camera works</li>
            <li>✓ Check your microphone</li>
            <li>✓ Find some space to play</li>
            <li>✓ Get ready to compete!</li>
          </ul>
        </div>

        <button onClick={onCancel} className="cancel-button">
          Cancel Matchmaking
        </button>
      </div>
    </div>
  );
}
