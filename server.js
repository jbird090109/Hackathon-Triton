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

const triviaQuestions = [
  {
    question: 'What planet is known as the Red Planet?',
    options: ['Earth', 'Mars', 'Venus', 'Jupiter'],
    correctIndex: 1,
  },
  {
    question: 'What gas do plants absorb from the atmosphere?',
    options: ['Oxygen', 'Hydrogen', 'Carbon Dioxide', 'Nitrogen'],
    correctIndex: 2,
  },
  {
    question: 'What is the chemical symbol for gold?',
    options: ['Ag', 'Au', 'Fe', 'Go'],
    correctIndex: 1,
  },
  {
    question: 'Who was the first president of the United States?',
    options: ['Abraham Lincoln', 'Thomas Jefferson', 'George Washington', 'John Adams'],
    correctIndex: 2,
  },
  {
    question: 'In what year did World War II end?',
    options: ['1945', '1939', '1918', '1955'],
    correctIndex: 0,
  },
  {
    question: 'Which ancient civilization built the pyramids?',
    options: ['Romans', 'Greeks', 'Mayans', 'Egyptians'],
    correctIndex: 3,
  },
  {
    question: 'How many players are on a soccer team on the field?',
    options: ['9', '10', '11', '12'],
    correctIndex: 2,
  },
  {
    question: 'Which sport uses a shuttlecock?',
    options: ['Tennis', 'Badminton', 'Volleyball', 'Table Tennis'],
    correctIndex: 1,
  },
  {
    question: 'How many points is a touchdown worth in football?',
    options: ['3', '6', '7', '2'],
    correctIndex: 1,
  },
  {
    question: 'Which movie features the character Iron Man?',
    options: ['Justice League', 'Avengers', 'Avatar', 'Titanic'],
    correctIndex: 1,
  },
  {
    question: 'Who is the main wizard in Harry Potter?',
    options: ['Gandalf', 'Merlin', 'Dumbledore', 'Harry Potter'],
    correctIndex: 3,
  },
  {
    question: 'Which movie features talking toys?',
    options: ['Frozen', 'Toy Story', 'Cars', 'Shrek'],
    correctIndex: 1,
  },
  {
    question: 'What is the capital of Japan?',
    options: ['Beijing', 'Tokyo', 'Seoul', 'Bangkok'],
    correctIndex: 1,
  },
  {
    question: 'Which continent is Egypt located in?',
    options: ['Asia', 'Europe', 'Africa', 'South America'],
    correctIndex: 2,
  },
  {
    question: 'Which ocean is the largest?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctIndex: 3,
  },
];

const TRIVIA_QUESTION_COUNT = 10;

// Utility functions
function generateMatchId() {
  return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
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

function buildTriviaPayload(match, roundResult = null, correctIndex = null, isFinal = false) {
  const trivia = match.trivia;
  const question = trivia.questions[trivia.currentIndex];
  const participants = {
    [match.player1.socketId]: match.player1.name,
    [match.player2.socketId]: match.player2.name,
  };

  return {
    matchId: match.id,
    currentQuestionIndex: trivia.currentIndex,
    totalQuestions: trivia.questions.length,
    question: question.question,
    options: question.options,
    scores: {
      [match.player1.socketId]: trivia.scores[match.player1.socketId],
      [match.player2.socketId]: trivia.scores[match.player2.socketId],
    },
    players: participants,
    roundResult,
    correctIndex,
    bothAnswered: trivia.answered.size === 2,
    isFinalQuestion: isFinal,
  };
}

function startTriviaMatch(match) {
  const questionOrder = shuffleArray(triviaQuestions.map((_, index) => index)).slice(0, TRIVIA_QUESTION_COUNT);
  const questions = questionOrder.map((index) => triviaQuestions[index]);
  match.trivia = {
    questions,
    currentIndex: 0,
    scores: {
      [match.player1.socketId]: 0,
      [match.player2.socketId]: 0,
    },
    answered: new Set(),
  };

  const payload = buildTriviaPayload(match, 'Trivia match has started!', null, false);
  io.to(match.id).emit('trivia-start', payload);
}

function advanceTriviaQuestion(matchId) {
  const match = activeMatches.get(matchId);
  if (!match || !match.trivia) return;

  match.trivia.answered.clear();
  match.trivia.currentIndex += 1;

  if (match.trivia.currentIndex >= match.trivia.questions.length) {
    const score1 = match.trivia.scores[match.player1.socketId];
    const score2 = match.trivia.scores[match.player2.socketId];
    const winnerName = score1 >= score2 ? match.player1.name : match.player2.name;
    const loserName = winnerName === match.player1.name ? match.player2.name : match.player1.name;
    const result = {
      winnerName,
      loserName,
      gameName: formatGameName(match.gameId),
      finalScores: {
        [match.player1.name]: score1,
        [match.player2.name]: score2,
      },
      matchId,
    };

    io.to(match.id).emit('game-ended', result);
    activeMatches.delete(matchId);
    return;
  }

  const payload = buildTriviaPayload(match, 'Next question ready!', null, false);
  io.to(match.id).emit('trivia-update', payload);
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

  socket.on('join-match', async ({ matchId }) => {
    socket.join(matchId);
    console.log(`Socket ${socket.id} joined match room ${matchId}`);
    const clients = await io.in(matchId).allSockets();
    if (clients.size === 2) {
      io.to(matchId).emit('match-ready', { matchId });
      const match = activeMatches.get(matchId);
      if (match && match.gameId === 'trivia') {
        startTriviaMatch(match);
      }
    }
  });

  socket.on('trivia-answer', ({ matchId, answerIndex }) => {
    const match = activeMatches.get(matchId);
    if (!match || !match.trivia) return;
    if (!match.trivia.questions[match.trivia.currentIndex]) return;
    if (match.trivia.answered.has(socket.id)) return;

    const currentQuestion = match.trivia.questions[match.trivia.currentIndex];
    if (answerIndex === currentQuestion.correctIndex) {
      match.trivia.scores[socket.id] += 1;
    }
    match.trivia.answered.add(socket.id);

    const roundResult = `${playerSockets.get(socket.id)?.name || 'A player'} answered ${
      answerIndex === currentQuestion.correctIndex ? 'correctly' : 'incorrectly'
    }.`;
    const payload = buildTriviaPayload(match, roundResult, currentQuestion.correctIndex, false);
    io.to(matchId).emit('trivia-update', payload);

    if (match.trivia.answered.size === 2) {
      setTimeout(() => advanceTriviaQuestion(matchId), 1400);
    }
  });

  socket.on('webrtc-offer', ({ matchId, offer }) => {
    console.log(`WebRTC offer for match ${matchId} from ${socket.id}`);
    socket.to(matchId).emit('webrtc-offer', { offer });
  });

  socket.on('webrtc-answer', ({ matchId, answer }) => {
    console.log(`WebRTC answer for match ${matchId} from ${socket.id}`);
    socket.to(matchId).emit('webrtc-answer', { answer });
  });

  socket.on('webrtc-ice-candidate', ({ matchId, candidate }) => {
    console.log(`WebRTC ICE candidate for match ${matchId} from ${socket.id}`);
    socket.to(matchId).emit('webrtc-ice-candidate', { candidate });
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
