import { useEffect, useRef, useState } from 'react';
import '../styles/GameRoom.css';
import socketService from '../services/socketService';
import TriviaGame from './TriviaGame';

export default function GameRoom({
  playerName,
  opponentName,
  gameName,
  gameId,
  matchData,
  onGameEnd,
}) {
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const isMountedRef = useRef(true);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameStatus] = useState('in-progress');
  const [connectionState, setConnectionState] = useState('new');
  const [cameraError, setCameraError] = useState(null);
  const [localCameraActive, setLocalCameraActive] = useState(false);
  const [remoteCameraActive, setRemoteCameraActive] = useState(false);

  useEffect(() => {
    if (!matchData?.matchId) return;

    isMountedRef.current = true;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });

    pcRef.current = pc;

    const pendingCandidates = [];

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams?.[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteCameraActive(true);
      }
    };

    pc.oniceconnectionstatechange = () => {
      setConnectionState(pc.iceConnectionState || 'new');
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState || 'new');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendIceCandidate(matchData.matchId, {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        });
      }
    };

    const startLocalStream = async () => {
      try {
        if (!isMountedRef.current || pc.signalingState === 'closed') return null;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isMountedRef.current || pc.signalingState === 'closed') {
          stream.getTracks().forEach((track) => track.stop());
          return null;
        }

        localStreamRef.current = stream;
        setCameraError(null);
        setLocalCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => {
          if (pc.signalingState !== 'closed') {
            pc.addTrack(track, stream);
          }
        });

        return stream;
      } catch (err) {
        console.error('Camera/Microphone error:', err);
        setCameraError('Camera unavailable or permission denied');
        setLocalCameraActive(false);
        return null;
      }
    };

    const createOffer = async () => {
      try {
        if (!localStreamRef.current) {
          await startLocalStream();
        }

        if (pc.signalingState === 'closed') return;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socketService.sendOffer(matchData.matchId, {
          type: offer.type,
          sdp: offer.sdp,
        });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    };

    const handleMatchReady = async () => {
      if (matchData.isPlayer1) {
        await createOffer();
      }
    };

    const handleOffer = async ({ offer }) => {
      try {
        if (!localStreamRef.current) {
          await startLocalStream();
        }

        if (pc.signalingState === 'closed') return;

        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: 'offer',
            sdp: offer.sdp,
          })
        );

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketService.sendAnswer(matchData.matchId, {
          type: answer.type,
          sdp: answer.sdp,
        });

        for (const c of pendingCandidates) {
          await pc.addIceCandidate(c);
        }
        pendingCandidates.length = 0;
      } catch (err) {
        console.error('Failed to handle offer:', err);
      }
    };

    const handleAnswer = async ({ answer }) => {
      try {
        if (pc.signalingState === 'closed') return;

        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: 'answer',
            sdp: answer.sdp,
          })
        );

        for (const c of pendingCandidates) {
          await pc.addIceCandidate(c);
        }
        pendingCandidates.length = 0;
      } catch (err) {
        console.error('Failed to handle answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (!candidate?.candidate) return;

        const ice = new RTCIceCandidate({
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid,
        });

        if (!pc.remoteDescription) {
          pendingCandidates.push(ice);
          return;
        }

        await pc.addIceCandidate(ice);
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    };

    socketService.on('match-ready', handleMatchReady);
    socketService.on('webrtc-offer', handleOffer);
    socketService.on('webrtc-answer', handleAnswer);
    socketService.on('webrtc-ice-candidate', handleIceCandidate);

    const setupConnection = async () => {
      await startLocalStream();
      socketService.joinMatch(matchData.matchId);
    };

    setupConnection();

    return () => {
      isMountedRef.current = false;
      setLocalCameraActive(false);
      setRemoteCameraActive(false);

      socketService.off('match-ready', handleMatchReady);
      socketService.off('webrtc-offer', handleOffer);
      socketService.off('webrtc-answer', handleAnswer);
      socketService.off('webrtc-ice-candidate', handleIceCandidate);

      if (pc.signalingState !== 'closed') {
        pc.close();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [matchData?.matchId, matchData?.isPlayer1, gameId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
  };

  const toggleVideo = () => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoOff;
      });
    }
  };

  const handleEndGame = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
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
          {!isVideoOff && !localCameraActive && !cameraError && (
            <div className="video-off-overlay">📷 Waiting for your camera...</div>
          )}
          {cameraError && <div className="video-off-overlay">{cameraError}</div>}
        </div>

        <div className="video-container remote">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-feed"
            style={{ background: '#000' }}
          />

          <div className="player-info">
            <span className="player-name">Opponent</span>
            <span className="player-label">{opponentName}</span>
          </div>

          {!remoteCameraActive && (
            <div className="video-off-overlay">🎥 Opponent camera not ready</div>
          )}
        </div>
      </div>

      <div className="connection-status">
        <p>Connection: {connectionState}</p>
        {(connectionState === 'new' || connectionState === 'connecting') && (
          <p>Waiting for opponent to connect...</p>
        )}
      </div>

      <div className="game-display-area">
        <div className="game-content">
          {gameId === 'trivia' ? (
            <TriviaGame
              matchId={matchData?.matchId}
              playerName={playerName}
              opponentName={opponentName}
            />
          ) : (
            <div className="placeholder">
              <p>Game State: {gameStatus}</p>
              <p>Waiting for game data from server...</p>
            </div>
          )}
        </div>
      </div>

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