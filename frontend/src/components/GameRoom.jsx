import { useEffect, useRef, useState } from 'react';
import '../styles/GameRoom.css';
import socketService from '../services/socketService';
import TriviaGame from './TriviaGame';
import PhysicalGame from './PhysicalGame';
import ActingGame from './ActingGame';

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
  console.log("🔥 GameRoom mounted");
  console.log("matchData:", matchData);
  console.log("matchId:", matchData?.matchId);
  console.log("isPlayer1:", matchData?.isPlayer1);

  if (!matchData?.matchId) {
    console.log("❌ No matchId yet");
    return;
  }

  console.log("🚧 Checking matchData before init...");
  if (!matchData?.matchId) return;

  isMountedRef.current = true;
  console.log("🔌 socketService object:", socketService);
  console.log("🔌 socket connected:", socketService?.socket?.connected);
  console.log("🔌 socket id:", socketService?.socket?.id);

  // IMPORTANT: ensure only one PC exists
  if (pcRef.current) {
    pcRef.current.close();
    pcRef.current = null;
  }

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
  });
  console.log("🧠 PeerConnection CREATED");

  pcRef.current = pc;

  const pendingCandidates = [];
  let hasRemoteOffer = false;

  // -------------------
  // TRACK HANDLING
  // -------------------
  pc.ontrack = (event) => {
    console.log("🎥 TRACK EVENT FIRED");
    console.log("🎥 Streams:", event.streams);

    const stream = event.streams?.[0];
    if (remoteVideoRef.current && stream) {
      setTimeout(() => {
        if (!remoteVideoRef.current) return;

        remoteVideoRef.current.srcObject = stream;
        setRemoteCameraActive(true);

        remoteVideoRef.current
          .play()
          .then(() => console.log("▶️ remote video playing"))
          .catch((e) => console.log("❌ play blocked:", e));
      }, 0);
    }
  };

  // -------------------
  // STATE LOGGING
  // -------------------
  pc.oniceconnectionstatechange = () => {
    console.log("🧊 ICE STATE:", pc.iceConnectionState);
    setConnectionState(pc.iceConnectionState || 'new');
  };

  pc.onconnectionstatechange = () => {
    console.log("🔗 CONNECTION STATE:", pc.connectionState);
    setConnectionState(pc.connectionState || 'new');
  };

  // -------------------
  // ICE SEND
  // -------------------
  pc.onicecandidate = (event) => {
    if (!event.candidate) return;

    socketService.sendIceCandidate(matchData.matchId, {
      candidate: event.candidate.candidate,
      sdpMLineIndex: event.candidate.sdpMLineIndex,
      sdpMid: event.candidate.sdpMid,
    });
  };

  // -------------------
  // LOCAL STREAM
  // -------------------
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setLocalCameraActive(true);

      stream.getTracks().forEach((track) => {
        if (pc.signalingState !== 'closed') {
          pc.addTrack(track, stream);
        }
      });

      return stream;
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera unavailable or denied');
    }
  };

  // -------------------
  // CREATE OFFER (FIXED)
  // -------------------
  const createOffer = async () => {
    console.log("📤 Creating offer...");
    if (pc.signalingState !== 'stable') return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log("📤 Local description set:", pc.localDescription);
    console.log("📤 Sending offer to server");

    socketService.sendOffer(matchData.matchId, offer);
  };

  // -------------------
  // HANDLE OFFER (FIXED STATE GUARD)
  // -------------------
  const handleOffer = async ({ offer }) => {
    try {
      console.log("📩 Handling offer...");
      await startLocalStream();

      // 🔥 CRITICAL FIX: prevent wrong-state crash
      console.log("📩 Current signaling state:", pc.signalingState);
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        console.log("Ignoring offer due to bad state:", pc.signalingState);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("📩 Remote description set (offer accepted)");
      hasRemoteOffer = true;

      const answer = await pc.createAnswer();
      console.log("📤 Answer created");
      await pc.setLocalDescription(answer);

      socketService.sendAnswer(matchData.matchId, answer);

      // flush ICE
      for (const c of pendingCandidates) {
        await pc.addIceCandidate(c);
      }
      pendingCandidates.length = 0;

    } catch (err) {
      console.error('Failed to handle offer:', err);
    }
  };

  // -------------------
  // HANDLE ANSWER (FIXED GUARD)
  // -------------------
  const handleAnswer = async ({ answer }) => {
    try {
      if (pc.signalingState !== 'have-local-offer') {
        console.log("Ignoring answer due to state:", pc.signalingState);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      for (const c of pendingCandidates) {
        await pc.addIceCandidate(c);
      }
      pendingCandidates.length = 0;

    } catch (err) {
      console.error('Failed to handle answer:', err);
    }
  };

  // -------------------
  // ICE HANDLER (SAFE QUEUE)
  // -------------------
  const handleIceCandidate = async ({ candidate }) => {
    try {
      if (!candidate?.candidate) return;
      console.log("🧊 ICE candidate received:", candidate);

      const ice = new RTCIceCandidate(candidate);
      console.log("🧊 Remote description exists:", !!pc.remoteDescription);

      if (!pc.remoteDescription) {
        pendingCandidates.push(ice);
        return;
      }

      await pc.addIceCandidate(ice);
    } catch (err) {
      console.error('ICE error:', err);
    }
  };

  // -------------------
  // SOCKETS
  // -------------------
  socketService.on('webrtc-offer', handleOffer);
  socketService.on('webrtc-answer', handleAnswer);
  socketService.on('webrtc-ice-candidate', handleIceCandidate);

  socketService.on("webrtc-offer", (data) => {
    console.log("📩 OFFER RECEIVED:", data);
  });
  socketService.on("webrtc-answer", (data) => {
    console.log("📩 ANSWER RECEIVED:", data);
  });
  socketService.on("webrtc-ice-candidate", (data) => {
    console.log("🧊 ICE RECEIVED:", data);
  });
  socketService.on("match-ready", (data) => {
    console.log("🎯 MATCH READY:", data);
  });

  // -------------------
  // INIT
  // -------------------
  const setup = async () => {
    await startLocalStream();
    socketService.joinMatch(matchData.matchId);
    console.log("🚪 Joined match room:", matchData.matchId);

    if (matchData.isPlayer1) {
      setTimeout(createOffer, 500);
    }
  };

  setup();

  // -------------------
  // CLEANUP
  // -------------------
  return () => {
    isMountedRef.current = false;

    socketService.off('webrtc-offer', handleOffer);
    socketService.off('webrtc-answer', handleAnswer);
    socketService.off('webrtc-ice-candidate', handleIceCandidate);
    socketService.off('webrtc-offer');
    socketService.off('webrtc-answer');
    socketService.off('webrtc-ice-candidate');
    socketService.off('match-ready');

    console.log("🧹 GameRoom cleanup running");
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
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
        {matchData?.judgeName && (
          <div className="judge-announcement">
            <span>👨‍⚖️ Judge:</span>
            <strong>{matchData.judgeName}</strong>
          </div>
        )}
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
          ) : gameId === 'physical' ? (
            <PhysicalGame
              matchId={matchData?.matchId}
              playerName={playerName}
              opponentName={opponentName}
            />
          ) : gameId === 'acting' ? (
            <ActingGame
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