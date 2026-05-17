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

          useEffect(() => {
            if (!matchData?.matchId) return;

            isMountedRef.current = true;

            const pc = new RTCPeerConnection({
              iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
            });

            pcRef.current = pc;

            pc.ontrack = (event) => {
              if (remoteVideoRef.current && event.streams?.[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
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

                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                }

                stream.getTracks().forEach((track) => {
                  pc.addTrack(track, stream);
                });

                return stream;
              } catch (err) {
                console.error('Camera/Microphone error:', err);
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
              } catch (err) {
                console.error('Failed to handle answer:', err);
              }
            };

            const handleIceCandidate = async ({ candidate }) => {
              try {
                if (!candidate?.candidate || pc.signalingState === 'closed') return;

                await pc.addIceCandidate(
                  new RTCIceCandidate({
                    candidate: candidate.candidate,
                    sdpMLineIndex: candidate.sdpMLineIndex,
                    sdpMid: candidate.sdpMid,
                  })
                );
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
          }, [matchData?.matchId, matchData?.isPlayer1]);
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