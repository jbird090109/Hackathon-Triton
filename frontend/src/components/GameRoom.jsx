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

    let pc;
    const pendingCandidates = [];

    const setup = async () => {
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }
        ],
      });

      pcRef.current = pc;

      console.log("PC CREATED");

      pc.ontrack = (event) => {
        console.log("TRACK RECEIVED");

        if (remoteVideoRef.current && event.streams?.[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];

          remoteVideoRef.current.play().catch(() => {
            console.log("Autoplay blocked");
          });

          setRemoteCameraActive(true);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE STATE:", pc.iceConnectionState);
        setConnectionState(pc.iceConnectionState);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("SENDING ICE");

          socketService.sendIceCandidate(matchData.matchId, {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
          });
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      videoRef.current.srcObject = stream;

      setLocalCameraActive(true);

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      console.log("LOCAL STREAM READY");

      const createOffer = async () => {
        console.log("CREATING OFFER");

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socketService.sendOffer(matchData.matchId, {
          type: offer.type,
          sdp: offer.sdp,
        });

        console.log("OFFER SENT");
      };

      const handleOffer = async ({ offer }) => {
        console.log("OFFER RECEIVED");

        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: "offer",
            sdp: offer.sdp,
          })
        );

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketService.sendAnswer(matchData.matchId, {
          type: answer.type,
          sdp: answer.sdp,
        });

        console.log("ANSWER SENT");

        for (const c of pendingCandidates) {
          await pc.addIceCandidate(c);
        }
        pendingCandidates.length = 0;
      };

      const handleAnswer = async ({ answer }) => {
        console.log("ANSWER RECEIVED");

        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: "answer",
            sdp: answer.sdp,
          })
        );

        for (const c of pendingCandidates) {
          await pc.addIceCandidate(c);
        }
        pendingCandidates.length = 0;
      };

      const handleIce = async ({ candidate }) => {
        if (!candidate?.candidate) return;

        const ice = new RTCIceCandidate({
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid,
        });

        console.log("ICE RECEIVED");

        if (!pc.remoteDescription) {
          pendingCandidates.push(ice);
          return;
        }

        await pc.addIceCandidate(ice);
      };

      socketService.on("webrtc-offer", handleOffer);
      socketService.on("webrtc-answer", handleAnswer);
      socketService.on("webrtc-ice-candidate", handleIce);

      socketService.joinMatch(matchData.matchId);

      if (matchData.isPlayer1) {
        setTimeout(createOffer, 1000);
      }
    };

    setup();

    return () => {
      isMountedRef.current = false;

      if (pc) pc.close();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      socketService.off("webrtc-offer");
      socketService.off("webrtc-answer");
      socketService.off("webrtc-ice-candidate");
    };
  }, [matchData?.matchId]);

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
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
    }
  };

  const toggleVideo = () => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !newVideoOff;
      });
    }
  };

  const handleEndGame = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    onGameEnd();
  };

  return (
    <div className="game-room-container">
      <div className="game-room-header">
        <h2>{gameName}</h2>
        <p>Connection: {connectionState}</p>
      </div>

      <div className="video-grid">
        <video ref={videoRef} autoPlay muted playsInline />
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>

      <div className="game-controls">
        <button onClick={toggleMute}>Mute</button>
        <button onClick={toggleVideo}>Video</button>
        <button onClick={handleEndGame}>Leave</button>
      </div>

      {gameId === 'trivia' ? (
        <TriviaGame
          matchId={matchData?.matchId}
          playerName={playerName}
          opponentName={opponentName}
        />
      ) : (
        <div>Waiting for game...</div>
      )}
    </div>
  );
}