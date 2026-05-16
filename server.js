import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Game queue management
const gameQueues = {
  physical: [],
  acting: [],
  dance: [],
  typing: [],
  drawing: [],
  trivia: [],
};

const judgeQueues = {
  physical: [],
  acting: [],
  dance: [],
  drawing: [],
};

const activeMatches = new Map();
const playerSockets = new Map(); // Map of playerId to socket

// Utility functions
function generateMatchId() {
  return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function findAndMatchPlayers(gameId, isJudge = false) {
  const queue = isJudge ? judgeQueues[gameId] : gameQueues[gameId];

  if (!isJudge && queue.length >= 2) {
    // Match two players
    const player1 = queue.shift();
    const player2 = queue.shift();

    if (player1 && player2) {
      return {
        type: 'player-match',
        players: [player1, player2],
      };
    }
  } else if (isJudge && queue.length > 0) {
    // Check if there's an active match that needs a judge
    const judge = queue.shift();
    
    // Find a match in progress that needs judging
    for (const match of activeMatches.values()) {
      if (match.gameId === gameId && !match.judge && match.status === 'waiting-for-judge') {
        return {
          type: 'judge-match',
          judge: judge,
          match: match,
        };
      }
    }
  }

  return null;
}

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-queue', (data) => {
    const { playerName, gameCategory, isJudge } = data;

    console.log(`${playerName} joining ${gameCategory} queue (Judge: ${isJudge})`);

    const playerData = {
      id: socket.id,
      name: playerName,
      socketId: socket.id,
      gameId: gameCategory,
      isJudge,
      joinedAt: Date.now(),
    };

    playerSockets.set(socket.id, playerData);

    if (isJudge) {
      judgeQueues[gameCategory].push(playerData);
    } else {
      gameQueues[gameCategory].push(playerData);
    }

    socket.join(`queue-${gameCategory}`);

    // Try to match players
    const match = findAndMatchPlayers(gameCategory, isJudge);

    if (match && match.type === 'player-match') {
      // Found two players - create match room
      const matchId = generateMatchId();
      const matchData = {
        id: matchId,
        gameId: gameCategory,
        player1: match.players[0],
        player2: match.players[1],
        judge: null,
        status: 'waiting-for-judge',
        createdAt: Date.now(),
      };

      activeMatches.set(matchId, matchData);

      // Notify both players
      io.to(match.players[0].socketId).emit('match-found', {
        matchId,
        gameId: gameCategory,
        gameName: formatGameName(gameCategory),
        opponentName: match.players[1].name,
        playerId: match.players[0].id,
        isPlayer1: true,
      });

      io.to(match.players[1].socketId).emit('match-found', {
        matchId,
        gameId: gameCategory,
        gameName: formatGameName(gameCategory),
        opponentName: match.players[0].name,
        playerId: match.players[1].id,
        isPlayer1: false,
      });

      // Notify judges if available for this game type
      if (['physical', 'acting', 'dance', 'drawing'].includes(gameCategory)) {
        io.to(`judge-queue-${gameCategory}`).emit('judge-available', {
          matchId,
          gameId: gameCategory,
          gameName: formatGameName(gameCategory),
          player1: match.players[0].name,
          player2: match.players[1].name,
        });
      }
    } else if (match && match.type === 'judge-match') {
      // Judge found a match
      const matchData = match.match;
      matchData.judge = match.judge;
      matchData.status = 'ready';

      io.to(match.judge.socketId).emit('judge-match-found', {
        matchId: matchData.id,
        gameId: gameCategory,
        gameName: formatGameName(gameCategory),
        player1Name: matchData.player1.name,
        player2Name: matchData.player2.name,
      });

      // Notify players that judge is ready
      io.to(matchData.player1.socketId).emit('judge-assigned', {
        judgeName: match.judge.name,
      });

      io.to(matchData.player2.socketId).emit('judge-assigned', {
        judgeName: match.judge.name,
      });
    }
  });

  socket.on('leave-queue', () => {
    const player = playerSockets.get(socket.id);
    if (player) {
      if (player.isJudge) {
        const queueIndex = judgeQueues[player.gameId].findIndex(
          (p) => p.socketId === socket.id
        );
        if (queueIndex > -1) judgeQueues[player.gameId].splice(queueIndex, 1);
      } else {
        const queueIndex = gameQueues[player.gameId].findIndex(
          (p) => p.socketId === socket.id
        );
        if (queueIndex > -1) gameQueues[player.gameId].splice(queueIndex, 1);
      }
      playerSockets.delete(socket.id);
    }
  });

  socket.on('game-data', (data) => {
    // Relay game data from Java backend to connected players
    console.log('Game data received:', data);
    // Broadcast to all players in the match room
    io.emit('game-update', data);
  });

  socket.on('game-result', (data) => {
    console.log('Game result:', data);
    // Notify all connected players/judges of the result
    io.emit('game-ended', data);
  });

  socket.on('judge-vote', (vote) => {
    console.log('Judge vote:', vote);
    // Process judge vote and update results
    io.emit('judge-voted', vote);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const player = playerSockets.get(socket.id);
    if (player) {
      if (player.isJudge) {
        const queueIndex = judgeQueues[player.gameId].findIndex(
          (p) => p.socketId === socket.id
        );
        if (queueIndex > -1) judgeQueues[player.gameId].splice(queueIndex, 1);
      } else {
        const queueIndex = gameQueues[player.gameId].findIndex(
          (p) => p.socketId === socket.id
        );
        if (queueIndex > -1) gameQueues[player.gameId].splice(queueIndex, 1);
      }
      playerSockets.delete(socket.id);
    }
  });
});

// Helper function to format game names
function formatGameName(gameId) {
  const names = {
    physical: 'Physical Game',
    acting: 'Acting Game',
    dance: 'Dance Battle',
    typing: 'Tug of War Typing',
    drawing: 'Drawing Game',
    trivia: 'Trivia',
  };
  return names[gameId] || gameId;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Get queue status
app.get('/api/queues', (req, res) => {
  const status = {};
  for (const [gameId, queue] of Object.entries(gameQueues)) {
    status[gameId] = {
      players: queue.length,
      judges: judgeQueues[gameId] ? judgeQueues[gameId].length : 0,
    };
  }
  res.json(status);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready at http://localhost:${PORT}`);
});
