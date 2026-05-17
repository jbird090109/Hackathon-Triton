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
const playerSockets = new Map();

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
  {
    question: 'What does CPU stand for?',
    options: [
      'Central Processing Unit',
      'Computer Personal Unit',
      'Central Program Utility',
      'Computer Processing User',
    ],
    correctIndex: 0,
  },
  {
    question: 'Which company created the iPhone?',
    options: ['Samsung', 'Google', 'Apple', 'Microsoft'],
    correctIndex: 2,
  },
  {
    question: 'What language is mainly used for Android app development?',
    options: ['Java', 'Python', 'HTML', 'Swift'],
    correctIndex: 0,
  },
  {
    question: 'How many days are in a leap year?',
    options: ['364', '365', '366', '367'],
    correctIndex: 2,
  },
  {
    question: 'Which animal is known as the king of the jungle?',
    options: ['Tiger', 'Lion', 'Elephant', 'Bear'],
    correctIndex: 1,
  },
  {
    question: 'What color do you get when you mix red and blue?',
    options: ['Green', 'Purple', 'Orange', 'Yellow'],
    correctIndex: 1,
  },
];

const TRIVIA_QUESTION_COUNT = 10;

function generateMatchId() {
  return `match-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

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

function removePlayerFromQueues(socketId) {
  const player = playerSockets.get(socketId);
  if (!player) return;

  const queues = player.isJudge ? judgeQueues : gameQueues;
  const queue = queues[player.gameId];

  if (queue) {
    const index = queue.findIndex((p) => p.socketId === socketId);
    if (index !== -1) queue.splice(index, 1);
  }

  playerSockets.delete(socketId);
}

function findAndMatchPlayers(gameId, isJudge = false) {
  const queue = isJudge ? judgeQueues[gameId] : gameQueues[gameId];

  if (!queue) return null;

  if (!isJudge && queue.length >= 2) {
    const player1 = queue.shift();
    const player2 = queue.shift();

    return {
      type: 'player-match',
      players: [player1, player2],
    };
  }

  if (isJudge && queue.length > 0) {
    const judge = queue.shift();

    for (const match of activeMatches.values()) {
      if (
        match.gameId === gameId &&
        !match.judge &&
        match.status === 'waiting-for-judge'
      ) {
        return {
          type: 'judge-match',
          judge,
          match,
        };
      }
    }
  }

  return null;
}

function startTriviaMatch(match) {
  const questionOrder = shuffleArray(
    triviaQuestions.map((_, index) => index)
  ).slice(0, TRIVIA_QUESTION_COUNT);

  const questions = questionOrder.map((index) => triviaQuestions[index]);

  match.trivia = {
    questions,
    started: true,
  };

  match.triviaResults = {};

  io.to(match.id).emit('trivia-start', {
    matchId: match.id,
    questions,
    totalQuestions: questions.length,
    players: {
      [match.player1.socketId]: match.player1.name,
      [match.player2.socketId]: match.player2.name,
    },
  });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-queue', (data) => {
    const { playerName, gameCategory, isJudge } = data;

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
      if (!judgeQueues[gameCategory]) judgeQueues[gameCategory] = [];
      judgeQueues[gameCategory].push(playerData);
    } else {
      if (!gameQueues[gameCategory]) gameQueues[gameCategory] = [];
      gameQueues[gameCategory].push(playerData);
    }

    socket.join(`queue-${gameCategory}`);

    const match = findAndMatchPlayers(gameCategory, isJudge);

    if (match && match.type === 'player-match') {
      const matchId = generateMatchId();

      const matchData = {
        id: matchId,
        gameId: gameCategory,
        player1: match.players[0],
        player2: match.players[1],
        judge: null,
        status: gameCategory === 'trivia' ? 'ready' : 'waiting-for-judge',
        createdAt: Date.now(),
      };

      activeMatches.set(matchId, matchData);

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
    }

    if (match && match.type === 'judge-match') {
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

      io.to(matchData.player1.socketId).emit('judge-assigned', {
        judgeName: match.judge.name,
      });

      io.to(matchData.player2.socketId).emit('judge-assigned', {
        judgeName: match.judge.name,
      });
    }
  });

  socket.on('leave-queue', () => {
    removePlayerFromQueues(socket.id);
  });

  socket.on('join-match', async ({ matchId }) => {
    const match = activeMatches.get(matchId);
    if (!match) return;

    socket.join(matchId);
    console.log(`Socket ${socket.id} joined match room ${matchId}`);

    const clients = await io.in(matchId).allSockets();
    const requiresJudge = match.judge || match.status === 'waiting-for-judge';
    const requiredClients = requiresJudge ? 3 : 2;

    if (clients.size >= requiredClients) {
      io.to(matchId).emit('match-ready', { matchId });

      if (match.gameId === 'trivia' && !match.trivia?.started) {
        startTriviaMatch(match);
      }
    }
  });

  socket.on('trivia-finished', ({ matchId, score, totalQuestions }) => {
    const match = activeMatches.get(matchId);
    if (!match) return;

    if (!match.triviaResults) {
      match.triviaResults = {};
    }

    const player = playerSockets.get(socket.id);

    match.triviaResults[socket.id] = {
      score,
      totalQuestions,
      name: player?.name || 'Player',
    };

    const results = Object.values(match.triviaResults);

    if (results.length === 2) {
      const [p1, p2] = results;

      let winnerName;
      let loserName;

      if (p1.score > p2.score) {
        winnerName = p1.name;
        loserName = p2.name;
      } else if (p2.score > p1.score) {
        winnerName = p2.name;
        loserName = p1.name;
      } else {
        winnerName = 'Tie';
        loserName = 'No loser';
      }

      io.to(matchId).emit('game-ended', {
        winnerName,
        loserName,
        gameName: 'Trivia',
        finalScores: {
          [p1.name]: p1.score,
          [p2.name]: p2.score,
        },
        matchId,
      });

      activeMatches.delete(matchId);
    }
  });

  socket.on('webrtc-offer', ({ matchId, offer }) => {
    socket.to(matchId).emit('webrtc-offer', { offer });
  });

  socket.on('webrtc-answer', ({ matchId, answer }) => {
    socket.to(matchId).emit('webrtc-answer', { answer });
  });

  socket.on('webrtc-ice-candidate', ({ matchId, candidate }) => {
    socket.to(matchId).emit('webrtc-ice-candidate', { candidate });
  });

  socket.on('game-data', (data) => {
    io.emit('game-update', data);
  });

  socket.on('game-result', (data) => {
    io.emit('game-ended', data);
  });

  socket.on('judge-vote', (vote) => {
    const { matchId, winner, gameName } = vote;
    const match = activeMatches.get(matchId);
    if (!match) return;

    let loserName = 'Opponent';
    if (match.player1.name === winner) {
      loserName = match.player2.name;
    } else if (match.player2.name === winner) {
      loserName = match.player1.name;
    }

    io.to(matchId).emit('game-ended', {
      winnerName: winner,
      loserName,
      gameName,
      judgeVote: `Judge chose ${winner}`,
      matchId,
    });

    activeMatches.delete(matchId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    removePlayerFromQueues(socket.id);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

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