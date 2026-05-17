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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameStatus, setGameStatus] = useState('in-progress');
  const [connectionState, setConnectionState] = useState('new');
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const isMountedRef = useRef(true);  // Track if component is still mounted

  // WebRTC setup
  useEffect(() => {
    if (!matchData?.matchId) {
      console.log('⏳ Waiting for matchData...');
      return;
    }

    console.log('🚀 WebRTC useEffect triggered for match:', matchData.matchId);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
      ],
    });
    
    console.log('✅ RTCPeerConnection created, signalingState:', pc.signalingState);
    pcRef.current = pc;
    isMountedRef.current = true;  // Mark component as mounted

    const remoteStream = new MediaStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    pc.ontrack = (event) => {
      console.log('🎥 Received remote track:', event.track.kind);
      
      if (remoteVideoRef.current) {
        if (event.streams && event.streams[0]) {
          console.log('✅ Setting remote stream to video element');
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', pc.iceConnectionState);
      setConnectionState(pc.iceConnectionState || 'new');
    };

    pc.onconnectionstatechange = () => {
      console.log('Peer connection state changed:', pc.connectionState);
      setConnectionState(pc.connectionState || 'new');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        // Serialize the ICE candidate properly for transmission
        socketService.sendIceCandidate(matchData.matchId, {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        });
      }
    };

    const startLocalStream = async () => {
      try {
        // Check if component is still mounted
        if (!isMountedRef.current) {
          console.log('⚠️ Component unmounted, skipping stream setup');
          return null;
        }

        // Check if peer connection is still valid
        if (!pc || pc.signalingState === 'closed') {
          console.error('❌ Peer connection is closed, cannot add tracks');
          return null;
        }

        console.log('Requesting camera/microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        console.log('✅ Local stream acquired:', stream);
        console.log('Video tracks:', stream.getVideoTracks());
        console.log('Audio tracks:', stream.getAudioTracks());

        // Check again if component is still mounted after async operation
        if (!isMountedRef.current) {
          console.log('⚠️ Component unmounted during stream setup, cleaning up stream');
          stream.getTracks().forEach(track => track.stop());
          return null;
        }

        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('✅ Local video element updated');
        }

        // Verify connection state again before adding tracks
        if (pc.signalingState === 'closed') {
          console.log('ℹ️ Peer connection was closed, skipping track addition (effect will retry)');
          stream.getTracks().forEach((track) => track.stop());
          return null;
        }

        stream.getTracks().forEach((track) => {
          console.log('Adding track to peer connection:', track.kind);
          pc.addTrack(track, stream);
        });

        console.log('✅ All tracks added to peer connection');
        return stream;
      } catch (err) {
        console.error('❌ Error accessing camera:', err);
        alert(`Camera/Microphone Error: ${err.message}`);
        return null;
      }
    };

    const createOffer = async () => {
      try {
        console.log('🎬 Creating WebRTC offer...');
        if (!localStreamRef.current) {
          console.log('Local stream not ready, starting...');
          await startLocalStream();
        }

        const offer = await pc.createOffer();
        console.log('Offer created:', offer);
        await pc.setLocalDescription(offer);
        console.log('Local description set, sending offer to peer...');
        
        // Serialize the offer properly for transmission
        socketService.sendOffer(matchData.matchId, {
          type: offer.type,
          sdp: offer.sdp,
        });
      } catch (err) {
        console.error('❌ Failed to create offer:', err);
      }
    };

    const handleMatchReady = async () => {
      console.log('🎮 Match ready! isPlayer1:', matchData.isPlayer1);
      if (matchData.isPlayer1) {
        console.log('Player 1 - creating offer...');
        await createOffer();
      } else {
        console.log('Player 2 - waiting for offer from player 1...');
      }
    };

    const handleOffer = async ({ offer }) => {
      try {
        console.log('📥 Received WebRTC offer:', offer);
        if (!localStreamRef.current) {
          console.log('Local stream not ready, starting...');
          await startLocalStream();
        }

        // Convert plain object back to RTCSessionDescription
        const offerDescription = new RTCSessionDescription({
          type: 'offer',
          sdp: offer.sdp,
        });
        console.log('Setting remote description (offer)...');
        await pc.setRemoteDescription(offerDescription);
        console.log('Remote description set, creating answer...');
        
        const answer = await pc.createAnswer();
        console.log('Answer created:', answer);
        await pc.setLocalDescription(answer);
        console.log('Local description set (answer), sending to peer...');
        
        // Serialize the answer properly for transmission
        socketService.sendAnswer(matchData.matchId, {
          type: answer.type,
          sdp: answer.sdp,
        });
      } catch (err) {
        console.error('❌ Failed to handle offer:', err);
      }
    };

    const handleAnswer = async ({ answer }) => {
      try {
        console.log('📥 Received WebRTC answer:', answer);
        // Convert plain object back to RTCSessionDescription
        const answerDescription = new RTCSessionDescription({
          type: 'answer',
          sdp: answer.sdp,
        });
        console.log('Setting remote description (answer)...');
        await pc.setRemoteDescription(answerDescription);
        console.log('✅ Remote description set (answer)');
      } catch (err) {
        console.error('❌ Failed to handle answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        console.log('📍 Received ICE candidate:', candidate);
        if (candidate && candidate.candidate) {
          // Create RTCIceCandidate from serialized object
          const iceCandidate = new RTCIceCandidate({
            candidate: candidate.candidate,
            sdpMLineIndex: candidate.sdpMLineIndex,
            sdpMid: candidate.sdpMid,
          });
          console.log('Adding ICE candidate...');
          await pc.addIceCandidate(iceCandidate);
          console.log('✅ ICE candidate added');
        }
      } catch (err) {
        console.error('❌ Failed to add ICE candidate:', err);
      }
    };

    socketService.on('match-ready', handleMatchReady);
    socketService.on('webrtc-offer', handleOffer);
    socketService.on('webrtc-answer', handleAnswer);
    socketService.on('webrtc-ice-candidate', handleIceCandidate);

    const setupConnection = async () => {
      console.log('🔗 Setting up WebRTC connection for match', matchData.matchId);
      
      if (!isMountedRef.current) {
        console.log('⚠️ Component unmounted, skipping setup');
        return;
      }
      
      await startLocalStream();
      
      if (!isMountedRef.current) {
        console.log('⚠️ Component unmounted after stream setup');
        return;
      }
      console.log('Joining match room...');
      socketService.joinMatch(matchData.matchId);
    };

    setupConnection();

    return () => {
      console.log('🧹 WebRTC cleanup triggered for match:', matchData.matchId);
      isMountedRef.current = false;  // Mark component as unmounted
      console.log('PC signalingState at cleanup:', pc?.signalingState);
      
      socketService.off('match-ready', handleMatchReady);
      socketService.off('webrtc-offer', handleOffer);
      socketService.off('webrtc-answer', handleAnswer);
      socketService.off('webrtc-ice-candidate', handleIceCandidate);

      if (pc && pc.signalingState !== 'closed') {
        console.log('Closing peer connection...');
        pc.close();
        console.log('✅ Peer connection closed');
      }

      if (localStreamRef.current) {
        console.log('Stopping local stream tracks...');
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [matchData?.matchId]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Ensure remote video plays when stream is set
  useEffect(() => {
    const remoteVideo = remoteVideoRef.current;
    if (!remoteVideo) return;

    const checkAndPlay = () => {
      if (remoteVideo.srcObject && remoteVideo.srcObject.getTracks().length > 0) {
        console.log('📹 Remote video stream detected, playing...');
        remoteVideo
          .play()
          .then(() => {
            console.log('✅ Remote video is playing!');
          })
          .catch((err) => {
            console.error('⚠️ Remote video playback error:', err);
          });
      }
    };

    // Check immediately and also set up listeners
    checkAndPlay();
    remoteVideo.addEventListener('loadedmetadata', checkAndPlay);

    return () => {
      remoteVideo.removeEventListener('loadedmetadata', checkAndPlay);
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
            style={{ background: '#000' }}
          />
          <div className="player-info">
            <span className="player-name">Opponent</span>
            <span className="player-label">{opponentName}</span>
          </div>
        </div>
      </div>

      <div className="connection-status">
        <p>Connection: {connectionState}</p>
        {connectionState === 'new' || connectionState === 'connecting' ? (
          <p>Waiting for opponent to connect...</p>
        ) : null}
      </div>

      {/* Game Display Area - Shows results from Java backend */}
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
