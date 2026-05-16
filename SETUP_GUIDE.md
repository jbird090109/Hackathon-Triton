# Triton Games - Game Arena Platform

A real-time multiplayer game platform with video chat integration, allowing players to compete in various challenges and judges to evaluate performances.

## Features

✅ **Multi-Game Support**
- Physical Game
- Acting Game  
- Dance Battle
- Tug of War Typing
- Drawing Game
- Trivia

✅ **Real-Time Matchmaking**
- Automatic player pairing in the same game category
- Judge assignment for supported games
- Queue management with Socket.IO

✅ **Judge System**
- Available for: Physical, Acting, Dance, and Drawing games
- Real-time voting interface
- Performance criteria scoring

✅ **Video Chat Integration**
- Built-in video/audio streaming
- Mute and camera controls
- Player status indicators

## Project Structure

```
Hackathon-Triton/
├── frontend/                      # React + Vite application
│   ├── src/
│   │   ├── components/           # UI Components
│   │   │   ├── WelcomeScreen.jsx
│   │   │   ├── GameSelection.jsx
│   │   │   ├── WaitingScreen.jsx
│   │   │   ├── GameRoom.jsx
│   │   │   ├── JudgeView.jsx
│   │   │   └── ResultsScreen.jsx
│   │   ├── services/
│   │   │   └── socketService.js  # WebSocket communication
│   │   ├── styles/               # Component styles
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── server.js                     # Node.js + Express backend
├── package.json                  # Backend dependencies
└── README.md
```

## Setup Instructions

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Install Backend Dependencies

From the project root:

```bash
npm install
```

### 3. Start the Backend Server

From the project root:

```bash
npm start
# OR for development with auto-reload
npm run dev
```

The server will run on `http://localhost:5000`

### 4. Start the Frontend Development Server

In a separate terminal from the frontend directory:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

## How It Works

### User Flow

1. **Welcome Screen** → User enters their name
2. **Game Selection** → Choose game category and judge role (if eligible)
3. **Matchmaking** → System finds opponent/judge in queue
4. **Game Room** → Players compete with video chat
   - For judges: Watch both players and vote
5. **Results** → See winner and stats

### Architecture

```
Frontend (React)
    ↓
Socket.IO Client
    ↓
Node.js Server (Express + Socket.IO)
    ↓
Game Logic Handler
    ↓
Java Backend (Your friends' code)
```

### Socket.IO Events

**Client → Server:**
- `join-queue`: Player joins matchmaking
- `leave-queue`: Player leaves matchmaking
- `accept-match`: Player accepts match
- `game-data`: Send game state updates
- `game-result`: Submit game result
- `judge-vote`: Judge submits vote

**Server → Client:**
- `match-found`: Match created, game starting
- `judge-match-found`: Judge matched to game
- `judge-assigned`: Judge assigned to player's match
- `game-ended`: Game finished, show results
- `game-update`: Real-time game state
- `judge-voted`: Judge voted on winner

## Integration with Java Backend

Your Java backend can integrate by:

1. **Sending game data** - After each game action:
```javascript
socketService.sendGameData({
  gameId: 'physical',
  player1Score: 100,
  player2Score: 95,
  timestamp: Date.now()
})
```

2. **Sending game results** - When game ends:
```javascript
socketService.sendResult({
  winner: 'Player1',
  loser: 'Player2',
  gameName: 'Physical Game',
  judgeVote: 'Judge Name' // if applicable
})
```

3. **Receiving events** - Listen for:
```javascript
socketService.on('game-result', (data) => {
  // Handle result from UI
})

socketService.on('judge-vote', (vote) => {
  // Handle judge decision
})
```

## Display Results on Screen

The `GameRoom` component has a `.game-display-area` section that displays game state:

```jsx
<div className="game-display-area">
  <div className="game-content">
    {/* Your game content here */}
    <p>Current Score: Player1: {score1} vs Player2: {score2}</p>
  </div>
</div>
```

Update this area with data from your Java backend.

## Video Chat Setup

The `GameRoom` uses WebRTC (Simple Peer library ready for implementation):

```javascript
// Your WebRTC stream would be set up here
const videoRef = useRef(null);
// Currently using native getUserMedia - easily upgradeable to P2P
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/queues` - View current queue status

## Key Components Reference

### WelcomeScreen
Props: `onStart(playerName)`
- Input for player name
- Welcome information

### GameSelection  
Props: `playerName`, `onGameSelect(gameData)`, `onBack()`
- 6 game cards for selection
- Judge checkbox (when available)
- Shows judge availability badge

### WaitingScreen
Props: `gameName`, `isJudge`, `onCancel()`
- Loading animation
- Wait time counter
- Tips and player count

### GameRoom
Props: `playerName`, `opponentName`, `gameName`, `gameId`, `onGameEnd()`
- Dual video feeds
- Game display area
- Audio/video controls
- Timer

### JudgeView
Props: `gameName`, `player1Name`, `player2Name`, `onVoteSubmitted(vote)`, `onLeaveGame()`
- Side-by-side video feeds
- Voting buttons
- Judging criteria display

### ResultsScreen
Props: `winner`, `loser`, `gameName`, `judgeVote`, `onPlayAgain()`, `onExit()`
- Winner announcement
- Match stats
- Play again / Exit buttons

## Customization

### Add New Game
1. Add to `GAMES` array in `GameSelection.jsx`
2. Update socket.io server queues
3. Adjust judge availability if needed

### Change Colors
Update CSS variables in component style files or main `App.css`

### Modify Video Feed
Update video constraints in `GameRoom.jsx`:
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720 },
  audio: true,
})
```

## Troubleshooting

**Video not showing?**
- Check browser camera permissions
- Ensure HTTPS in production
- Check browser console for errors

**Can't connect to server?**
- Ensure backend is running on port 5000
- Check CORS settings in server.js
- Verify Socket.IO URL in socketService.js

**Matchmaking stuck?**
- Check queue status: `http://localhost:5000/api/queues`
- Verify players are in same category
- Check browser console for errors

## Performance Tips

- Use WebRTC for better video performance
- Implement graceful reconnection
- Compress game state updates
- Cache judge list for popular games

## Future Enhancements

- [ ] Implement WebRTC for P2P video
- [ ] Add player ratings/rankings
- [ ] Implement chat during games
- [ ] Add spectator mode
- [ ] Implement match replay
- [ ] Add friends/social features
- [ ] Mobile app version

## Support

Check browser console for detailed error messages. Each socket event is logged for debugging.
