# Quick Reference Guide

## To Start Playing

### 1. Install & Start Everything

**Terminal 1 - Backend Server:**
```bash
npm install
npm start
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### 2. Open Browser
Go to `http://localhost:5173`

### 3. Play
1. Enter your name
2. Pick a game (can be judge for Physical, Acting, Dance, or Drawing)
3. Wait for opponent
4. Play!

---

## Game Categories

| Game | Players | Judge | How to Win |
|------|---------|-------|-----------|
| 🎭 Physical | 2 | ✓ | Complete challenge first/best |
| 🎬 Acting | 2 | ✓ | Judge picks better performance |
| 💃 Dance | 2 | ✓ | Judge picks better dancer |
| ⌨️ Typing | 2 | ✗ | Type text fastest/most accurate |
| 🎨 Drawing | 2 | ✓ | Judge picks better drawing |
| 🧠 Trivia | 2 | ✗ | Answer most questions correctly |

---

## Component Quick Access

**User Flow:**
```
Welcome Screen
    ↓
Game Selection
    ↓
Waiting Screen
    ↓
Game Room (Players) or Judge View (Judges)
    ↓
Results Screen
```

**Component Files:**
- `WelcomeScreen.jsx` - Name input
- `GameSelection.jsx` - Game & judge choice
- `WaitingScreen.jsx` - Matchmaking
- `GameRoom.jsx` - Main game play
- `JudgeView.jsx` - Judge evaluation
- `ResultsScreen.jsx` - Winner display

**Styling:**
Each component has matching CSS in `src/styles/`

---

## Socket Events Quick Ref

### Player Events
```javascript
// Join queue
socketService.joinQueue(playerName, gameId, isJudge=false)

// Leave queue
socketService.leaveQueue()

// Send game data
socketService.sendGameData(data)

// Submit result
socketService.sendResult(result)
```

### Judge Events
```javascript
// Join as judge
socketService.joinQueue(playerName, gameId, isJudge=true)

// Vote
socketService.sendJudgeVote({winner: 'PlayerName'})
```

### Listen For Events
```javascript
socketService.on('match-found', (data) => {
  // data.opponentName, data.gameName
})

socketService.on('game-ended', (result) => {
  // result.winner, result.loser
})
```

---

## File Locations

```
frontend/src/
├── components/
│   ├── WelcomeScreen.jsx
│   ├── GameSelection.jsx
│   ├── WaitingScreen.jsx
│   ├── GameRoom.jsx
│   ├── JudgeView.jsx
│   └── ResultsScreen.jsx
├── services/
│   └── socketService.js
├── styles/
│   ├── WelcomeScreen.css
│   ├── GameSelection.css
│   ├── WaitingScreen.css
│   ├── GameRoom.css
│   ├── JudgeView.css
│   └── ResultsScreen.css
├── App.jsx
├── App.css
├── index.css
├── main.jsx
└── ...

Root:
├── server.js (Backend)
├── package.json (Backend deps)
├── frontend/
│   └── package.json (Frontend deps)
├── SETUP_GUIDE.md (Full setup)
├── JAVA_INTEGRATION.md (Java backend help)
└── QUICK_REFERENCE.md (This file)
```

---

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Frontend opens at localhost:5173
- [ ] Can enter name on welcome screen
- [ ] Can select games (see icons)
- [ ] Judge checkbox works
- [ ] Waiting screen shows when in queue
- [ ] Camera/mic permissions requested
- [ ] Can toggle mute/camera
- [ ] Judge view shows both players
- [ ] Can vote as judge
- [ ] Results screen shows winner
- [ ] Play again button works
- [ ] Exit button returns home

---

## Common Terminal Commands

```bash
# Start backend
npm start

# Start backend with auto-reload
npm run dev

# Start frontend
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build

# Install new package (backend)
npm install package-name

# Install new package (frontend)
cd frontend && npm install package-name

# Kill port 5000 (if stuck)
lsof -ti:5000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :5000   # Windows
```

---

## Customization Tips

### Change Colors
Edit CSS variables in `src/App.css`:
```css
--primary: #667eea;    /* Main color */
--secondary: #764ba2;  /* Secondary */
--accent: #f39c12;     /* Highlights */
```

### Add New Game
1. Add to `GAMES` array in `GameSelection.jsx`
2. Update backend queues in `server.js`
3. Set `hasJudge: true/false`

### Modify Video Feed
In `GameRoom.jsx`:
```javascript
video: { width: 1280, height: 720, facingMode: 'user' }
```

### Change Matchmaking Timeout
In `socketService.js` or `server.js`, add timeout logic

---

## Deployment Checklist

- [ ] Update Socket.IO URL from `localhost:5000`
- [ ] Build frontend: `npm run build`
- [ ] Deploy backend server
- [ ] Deploy frontend to static host
- [ ] Update CORS in `server.js`
- [ ] Test all game flows
- [ ] Test judge system
- [ ] Monitor error logs

---

## Useful Links

- **Socket.IO Docs**: https://socket.io/docs/
- **React Docs**: https://react.dev/
- **Vite Docs**: https://vitejs.dev/

---

## Support

**Backend issues?**
- Check `server.js` logs
- Verify port 5000 available
- Check Socket.IO connections

**Frontend issues?**
- Check browser console (F12)
- Verify Socket.IO connected
- Check component props

**Video issues?**
- Allow camera permissions
- Check browser console
- Test with different camera
