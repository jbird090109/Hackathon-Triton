import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }

  connect(
    serverUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:5000'
  ) {
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.emit('disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Game-specific methods
  joinQueue(playerName, gameCategory, isJudge = false) {
    this.emit('join-queue', {
      playerName,
      gameCategory,
      isJudge,
      timestamp: Date.now(),
    });
  }

  leaveQueue() {
    this.emit('leave-queue');
  }

  acceptMatch() {
    this.emit('accept-match');
  }

  rejectMatch() {
    this.emit('reject-match');
  }

  sendGameData(data) {
    this.emit('game-data', data);
  }

  sendResult(result) {
    this.emit('game-result', result);
  }

  sendTriviaAnswer(matchId, answerIndex) {
    this.emit('trivia-answer', { matchId, answerIndex });
  }

  sendJudgeVote(vote) {
    this.emit('judge-vote', vote);
  }

  joinMatch(matchId) {
    this.emit('join-match', { matchId });
  }

  sendOffer(matchId, offer) {
    this.emit('webrtc-offer', { matchId, offer });
  }

  sendAnswer(matchId, answer) {
    this.emit('webrtc-answer', { matchId, answer });
  }

  sendIceCandidate(matchId, candidate) {
    this.emit('webrtc-ice-candidate', { matchId, candidate });
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
