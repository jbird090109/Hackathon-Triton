# Java Backend Integration Guide

This guide shows how to integrate your Java game logic with the UI platform.

## Connection Architecture

Your Java game servers should:
1. Connect via Socket.IO or REST API
2. Listen for player actions
3. Send game state updates
4. Return results to the UI

## Quick Start

### Option 1: Direct Socket.IO Integration (Recommended)

Your Java backend can connect to the Node.js server as a client:

```java
import io.socket.client.IO;
import io.socket.client.Socket;

IO.Options options = IO.Options.builder()
    .setReconnection(true)
    .build();

Socket socket = IO.socket("http://localhost:5000", options);

// Listen for game events
socket.on("game-data-needed", args -> {
    JSONObject data = (JSONObject) args[0];
    String gameId = data.getString("gameId");
    
    // Process game logic
    runGame(gameId);
});

// Send game result
socket.emit("game-result", new JSONObject()
    .put("winner", "Player1")
    .put("loser", "Player2")
    .put("gameName", "Physical Game"));

socket.connect();
```

### Option 2: REST API Integration

Call the backend HTTP endpoints:

```java
// Get match info
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("http://localhost:5000/api/queues"))
    .GET()
    .build();

HttpResponse<String> response = client.send(request, 
    HttpResponse.BodyHandlers.ofString());
```

## Game Flow Example

### 1. Physical Game

```java
public class PhysicalGame {
    private Socket socket;
    
    public void startGame(String matchId, String player1, String player2) {
        // Setup game
        int player1JumpJacks = runJumpJackChallenge(player1);
        int player2JumpJacks = runJumpJackChallenge(player2);
        
        // Send periodic updates
        socket.emit("game-data", new JSONObject()
            .put("matchId", matchId)
            .put("player1Score", player1JumpJacks)
            .put("player2Score", player2JumpJacks)
            .put("timestamp", System.currentTimeMillis()));
    }
    
    public void endGame(String winner) {
        socket.emit("game-result", new JSONObject()
            .put("winner", winner)
            .put("loser", "Other Player")
            .put("gameName", "Physical Game"));
    }
}
```

### 2. Acting Game with Judge

```java
public class ActingGame {
    private Socket socket;
    private String judgeId;
    
    public void startGame(String player1, String player2, String judge) {
        this.judgeId = judge;
        
        // Give acting prompts
        String prompt = "Act out a dramatic scene";
        
        // Record performances
        recordPerformance(player1, "performance1.mp4");
        recordPerformance(player2, "performance2.mp4");
        
        // Notify judge
        socket.emit("judge-ready", new JSONObject()
            .put("player1", player1)
            .put("player2", player2));
    }
    
    public void receiveJudgeVote() {
        socket.on("judge-voted", args -> {
            JSONObject vote = (JSONObject) args[0];
            String winner = vote.getString("winner");
            finishGame(winner);
        });
    }
}
```

### 3. Drawing Game

```java
public class DrawingGame {
    private Socket socket;
    
    public void startGame(String player1, String player2) {
        String prompt = "Draw a cat";
        
        // Stream drawing in real-time
        while (gameActive) {
            byte[] drawingData = captureDrawing(player1);
            socket.emit("game-data", new JSONObject()
                .put("player", "player1")
                .put("drawingData", Base64.getEncoder().encodeToString(drawingData))
                .put("timestamp", System.currentTimeMillis()));
            
            Thread.sleep(100); // 10 FPS
        }
    }
}
```

### 4. Typing Game

```java
public class TypingGame {
    private Socket socket;
    
    public void startGame(String player1, String player2) {
        String textToType = "The quick brown fox jumps over the lazy dog";
        
        // Setup game
        GameState state = new GameState(player1, player2, textToType);
        
        // Listen for input
        while (gameActive) {
            String input1 = getPlayerInput(player1);
            String input2 = getPlayerInput(player2);
            
            // Update scores
            state.updateScore(player1, calculateAccuracy(input1));
            state.updateScore(player2, calculateAccuracy(input2));
            
            // Send update
            socket.emit("game-data", new JSONObject()
                .put("player1Progress", state.getProgress(player1))
                .put("player2Progress", state.getProgress(player2)));
        }
    }
}
```

### 5. Trivia Game

```java
public class TriviaGame {
    private Socket socket;
    
    public void startGame(String player1, String player2) {
        String[] questions = getRandomQuestions(3);
        int score1 = 0, score2 = 0;
        
        for (String question : questions) {
            // Ask question
            String answer1 = getPlayerAnswer(player1, question);
            String answer2 = getPlayerAnswer(player2, question);
            String correctAnswer = getCorrectAnswer(question);
            
            if (answer1.equals(correctAnswer)) score1++;
            if (answer2.equals(correctAnswer)) score2++;
            
            // Send update
            socket.emit("game-data", new JSONObject()
                .put("question", question)
                .put("scores", new JSONObject()
                    .put("player1", score1)
                    .put("player2", score2)));
        }
        
        String winner = score1 > score2 ? player1 : player2;
        endGame(winner);
    }
}
```

## Receiving Game Data on Frontend

The UI already listens for game updates. In `GameRoom.jsx`:

```javascript
// Add this to the GameRoom component
useEffect(() => {
  socketService.on('game-data', (data) => {
    // Update game display with latest scores/state
    console.log('Game update:', data);
    // setGameState(data);
  });

  socketService.on('game-ended', (result) => {
    // Handle game end
    console.log('Game ended:', result);
  });

  return () => {
    socketService.off('game-data');
    socketService.off('game-ended');
  };
}, []);
```

## Judge System Integration

### Judge Updates

```java
public void notifyJudgeOfAction(String actionType, String actionData) {
    socket.emit("judge-update", new JSONObject()
        .put("actionType", actionType)  // "player1-acting", "player2-drawing"
        .put("data", actionData)
        .put("timestamp", System.currentTimeMillis()));
}
```

### Receiving Judge Vote

```java
public void listenForJudgeDecision(String matchId) {
    socket.on("judge-voted", args -> {
        JSONObject vote = (JSONObject) args[0];
        String winner = vote.getString("winner");
        String votedFor = vote.getString("votedFor");
        
        // Process judge's decision
        finishGameWithJudgeDecision(matchId, winner, votedFor);
    });
}
```

## Event Data Formats

### Game Data Event
```json
{
  "gameId": "physical",
  "matchId": "match-123456",
  "player1": {
    "name": "John",
    "score": 25
  },
  "player2": {
    "name": "Jane", 
    "score": 23
  },
  "timestamp": 1234567890
}
```

### Game Result Event
```json
{
  "winner": "John",
  "loser": "Jane",
  "gameName": "Physical Game",
  "reason": "Higher jump jack count",
  "judgeVote": null,
  "finalScore": {
    "player1": 25,
    "player2": 23
  }
}
```

### Judge Vote Event
```json
{
  "winner": "John",
  "votedFor": "John",
  "judgeComment": "Better performance",
  "votedAt": 1234567890
}
```

## Server Configuration

Add these event handlers to `server.js` for Java backend:

```javascript
io.on('connection', (socket) => {
  // When Java backend connects
  if (socket.handshake.query.isGameServer) {
    console.log('Game server connected');
    
    socket.on('game-data', (data) => {
      // Relay to players
      io.emit('game-update', data);
    });
    
    socket.on('game-result', (result) => {
      // Relay to all clients
      io.emit('game-ended', result);
    });
  }
});
```

## Deployment Considerations

### Firewall Rules
- Open port 5000 for Socket.IO
- Open port 5173 for frontend dev (or custom prod port)

### CORS Setup
Update in `server.js`:
```javascript
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://your-frontend-domain.com',
      'http://your-java-server-ip:port'
    ],
    methods: ['GET', 'POST']
  }
});
```

### Environment Variables
```bash
# Create .env in root directory
SOCKET_URL=http://localhost:5000
GAME_SERVER_PORT=5000
FRONTEND_PORT=5173
```

## Testing

### Test Judge Assignment
1. Start 2 players in "Physical Game"
2. Join as judge in "Physical Game"
3. Verify judge sees both players
4. Test voting

### Test Game Data Flow
1. Start game
2. Check console for `game-data` events
3. Verify scores update in real-time
4. Check `game-result` sends properly

## Common Issues

**Socket connection refused?**
- Ensure server is running: `npm start`
- Check port 5000 is not blocked
- Verify Socket.IO URL in code

**Events not firing?**
- Check socket connection status
- Verify event names match exactly
- Check browser console for errors

**Judge not getting matched?**
- Verify judge checkbox enabled
- Check game supports judges
- Ensure players are in queue

## Support

For issues, check:
1. Server logs: `console.log` statements
2. Browser console: Network and client errors
3. Socket.IO events in dev tools
