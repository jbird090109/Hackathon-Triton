import { useEffect, useRef, useState } from 'react';
import '../styles/GameRoom.css';

export default function GameRoom({
  playerName,
  opponentName,
  gameName,
  gameId,
  onGameEnd,
}) {
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameStatus, setGameStatus] = useState('in-progress');

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize local video
  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    };

    startVideo();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
    }
  };

  const handleEndGame = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    onGameEnd();
  };

  return (
    <div className="game-room-container">
      <div className="game-room-header">
        <div className="game-title">
          <h2>{gameName}</h2>
          <p className="time-display">⏱️ {formatTime(elapsedTime)}</p>
        </div>
      </div>

      <div className="video-grid">
        {/* Local video */}
        <div className="video-container local">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`video-feed ${isVideoOff ? 'video-off' : ''}`}
          />
          <div className="player-info">
            <span className="player-name">You</span>
            <span className="player-label">{playerName}</span>
          </div>
          {isVideoOff && <div className="video-off-overlay">📷 Camera Off</div>}
        </div>

        {/* Remote video (opponent) */}
        <div className="video-container remote">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-feed"
          />
          <div className="player-info">
            <span className="player-name">Opponent</span>
            <span className="player-label">{opponentName}</span>
          </div>
        </div>
      </div>

      {/* Game Display Area - Shows results from Java backend */}
      <div className="game-display-area">
        <div className="game-content">
          {/* This area will be filled by Java backend game logic */}
          <div className="placeholder">
            <p>Game State: {gameStatus}</p>
            <p>Waiting for game data from server...</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="game-controls">
        <button
          onClick={toggleMute}
          className={`control-btn ${isMuted ? 'active' : ''}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <button
          onClick={toggleVideo}
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? '📷' : '📹'}
        </button>

        <button
          onClick={handleEndGame}
          className="control-btn end-btn"
          title="End game"
        >
          ✕ Leave Game
        </button>
      </div>
    </div>
  );
}
