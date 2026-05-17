import { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import GameSelection from './components/GameSelection';
import WaitingScreen from './components/WaitingScreen';
import GameRoom from './components/GameRoom';
import ResultsScreen from './components/ResultsScreen';
import socketService from './services/socketService';
import './App.css';

function App() {
  const [appState, setAppState] = useState('welcome');
  const [playerName, setPlayerName] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  // Initialize socket connection on mount
  useEffect(() => {
    socketService.connect();

    // Listen for match found events
    socketService.on('match-found', (data) => {
      console.log('Match found:', data);
      setMatchData(data);
      setAppState('game-room');
    });

    // Listen for game results
    socketService.on('game-ended', (result) => {
      console.log('Game ended:', result);
      const localWinner = result.winnerName === playerName ? 'You' : result.winnerName;
      const localLoser = result.winnerName === playerName ? result.loserName : 'You';
      setGameResult({
        ...result,
        winner: localWinner,
        loser: localLoser,
      });
      setAppState('results');
    });

    

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Handle Welcome Screen - Player enters name
  const handleWelcomeStart = (name) => {
    setPlayerName(name);
    setAppState('game-selection');
  };

  // Handle Game Selection - Player chooses game
  const handleGameSelect = ({ gameId, gameName }) => {
    setSelectedGame({ gameId, gameName });
    setAppState('waiting');

    // Join the matchmaking queue
    socketService.joinQueue(playerName, gameId);
  };

  // Handle Back from Game Selection
  const handleBackFromSelection = () => {
    setAppState('welcome');
  };

  // Handle Cancel Matchmaking
  const handleCancelMatchmaking = () => {
    socketService.leaveQueue();
    setAppState('game-selection');
  };

  // Handle Game End
  const handleGameEnd = () => {
    socketService.leaveQueue();
    setAppState('welcome');
    setPlayerName('');
    setSelectedGame(null);
    setMatchData(null);
  };

  // Handle Play Again
  const handlePlayAgain = () => {
    setAppState('game-selection');
    setGameResult(null);
    setMatchData(null);
  };

  // Render based on app state
  const renderState = () => {
    switch (appState) {
      case 'welcome':
        return <WelcomeScreen onStart={handleWelcomeStart} />;

      case 'game-selection':
        return (
          <GameSelection
            playerName={playerName}
            onGameSelect={handleGameSelect}
            onBack={handleBackFromSelection}
          />
        );

      case 'waiting':
        return (
          <WaitingScreen
            gameName={selectedGame?.gameName}
            onMatchFound={() => {}}
            onCancel={handleCancelMatchmaking}
          />
        );

      case 'game-room':
        return matchData ? (
          <GameRoom
            playerName={playerName}
            opponentName={matchData.opponentName}
            gameName={matchData.gameName}
            gameId={matchData.gameId}
            matchData={matchData}
            onGameEnd={handleGameEnd}
          />
        ) : null;

      

      case 'results':
        return gameResult ? (
          <ResultsScreen
            winner={gameResult.winner}
            loser={gameResult.loser}
            gameName={gameResult.gameName}
            judgeVote={gameResult.judgeVote}
            onPlayAgain={handlePlayAgain}
            onExit={handleGameEnd}
          />
        ) : null;

      default:
        return <WelcomeScreen onStart={handleWelcomeStart} />;
    }
  };

  return <div className="app">{renderState()}</div>;
}

export default App;