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
  const remoteCandidatesRef = useRef([]);

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

    useEffect(() => {
      if (!matchData?.matchId) return;

      console.log('[GameRoom] Initializing connection for match', matchData.matchId, 'gameId=', gameId);

      isMountedRef.current = true;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
      });

      pcRef.current = pc;

      // buffer for remote candidates that arrive before pc is ready
      remoteCandidatesRef.current = [];

      pc.ontrack = (event) => {
        console.log('[GameRoom] ontrack', event);
        if (remoteVideoRef.current && event.streams?.[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setRemoteCameraActive(true);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[GameRoom] ICE state', pc.iceConnectionState);
        setConnectionState(pc.iceConnectionState || 'new');
      };

      pc.onconnectionstatechange = () => {
        console.log('[GameRoom] connectionState', pc.connectionState);
        setConnectionState(pc.connectionState || 'new');
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[GameRoom] local ICE candidate -> sending', event.candidate);
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

          console.log('[GameRoom] requesting getUserMedia');
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
          console.log('[GameRoom] local stream obtained');

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          stream.getTracks().forEach((track) => {
            try {
              pc.addTrack(track, stream);
            } catch (err) {
              console.warn('[GameRoom] addTrack failed', err);
            }
          });

          return stream;
        } catch (err) {
          console.error('[GameRoom] Camera/Microphone error:', err);
          setCameraError('Camera unavailable or permission denied');
          setLocalCameraActive(false);
          return null;
        }
      };

      const createOffer = async () => {
        try {
          if (!localStreamRef.current) {
            // attempt but do not block if it fails
            await startLocalStream().catch(() => {});
          }

          if (pc.signalingState === 'closed') return;

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          console.log('[GameRoom] sending offer');
          socketService.sendOffer(matchData.matchId, {
            type: offer.type,
            sdp: offer.sdp,
          });
        } catch (err) {
          console.error('[GameRoom] Failed to create offer:', err);
        }
      };

      const handleMatchReady = async () => {
        console.log('[GameRoom] match-ready received');
        if (matchData.isPlayer1) {
          await createOffer();
        }
      };

      const handleOffer = async ({ offer }) => {
        console.log('[GameRoom] received offer', !!offer);
        try {
          // ensure we attempt to get local media but do not block
          await startLocalStream().catch(() => {});

          if (pc.signalingState === 'closed') return;

          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: 'offer',
              sdp: offer.sdp,
            })
          );

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          console.log('[GameRoom] sending answer');
          socketService.sendAnswer(matchData.matchId, {
            type: answer.type,
            sdp: answer.sdp,
          });
        } catch (err) {
          console.error('[GameRoom] Failed to handle offer:', err);
        }
      };

      const handleAnswer = async ({ answer }) => {
        console.log('[GameRoom] received answer', !!answer);
        try {
          if (pc.signalingState === 'closed') return;

          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: 'answer',
              sdp: answer.sdp,
            })
          );
        } catch (err) {
          console.error('[GameRoom] Failed to handle answer:', err);
        }
      };

      const handleIceCandidate = async ({ candidate }) => {
        console.log('[GameRoom] remote ICE candidate received', candidate);
        try {
          if (!candidate?.candidate) return;

          // if pc not ready yet, buffer it
          if (!pcRef.current || pc.signalingState === 'stable' || pc.remoteDescription == null) {
            console.log('[GameRoom] buffering remote candidate');
            remoteCandidatesRef.current.push(candidate);
            return;
          }

          await pc.addIceCandidate(
            new RTCIceCandidate({
              candidate: candidate.candidate,
              sdpMLineIndex: candidate.sdpMLineIndex,
              sdpMid: candidate.sdpMid,
            })
          );
        } catch (err) {
          console.error('[GameRoom] Failed to add ICE candidate:', err);
        }
      };

      socketService.on('match-ready', handleMatchReady);
      socketService.on('webrtc-offer', handleOffer);
      socketService.on('webrtc-answer', handleAnswer);
      socketService.on('webrtc-ice-candidate', handleIceCandidate);

      const setupConnection = async () => {
        // try to get camera but join the match regardless so game flow isn't blocked
        startLocalStream().catch(() => {});
        console.log('[GameRoom] joining match room', matchData.matchId);
        socketService.joinMatch(matchData.matchId);
      };

      setupConnection();

      // after some delay, flush any buffered remote candidates
      const flushBuffered = () => {
        if (!remoteCandidatesRef.current || remoteCandidatesRef.current.length === 0) return;
        console.log('[GameRoom] Flushing', remoteCandidatesRef.current.length, 'buffered candidates');
        remoteCandidatesRef.current.forEach(async (c) => {
          try {
            await pc.addIceCandidate(
              new RTCIceCandidate({
                candidate: c.candidate,
                sdpMLineIndex: c.sdpMLineIndex,
                sdpMid: c.sdpMid,
              })
            );
          } catch (err) {
            console.warn('[GameRoom] failed to add buffered candidate', err);
          }
        });
        remoteCandidatesRef.current = [];
      };

      const flushTimer = setInterval(flushBuffered, 1500);

      return () => {
        console.log('[GameRoom] tearing down connection for', matchData.matchId);
        isMountedRef.current = false;
        setLocalCameraActive(false);
        setRemoteCameraActive(false);
        clearInterval(flushTimer);

        socketService.off('match-ready', handleMatchReady);
        socketService.off('webrtc-offer', handleOffer);
        socketService.off('webrtc-answer', handleAnswer);
        socketService.off('webrtc-ice-candidate', handleIceCandidate);

        try {
          if (pc && pc.signalingState !== 'closed') {
            pc.close();
          }
        } catch (err) {
          console.warn('[GameRoom] error closing pc', err);
        }

        try {
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
          }
        } catch (err) {
          console.warn('[GameRoom] error stopping tracks', err);
        }
      };
    }, [matchData?.matchId, matchData?.isPlayer1, gameId]);
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