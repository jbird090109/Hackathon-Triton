import { useEffect, useRef, useState } from 'react';
import socketService from '../services/socketService';
import '../styles/TriviaGame.css';

const DEFAULT_TIMER_SECONDS = 15;

export default function TriviaGame({ matchId, playerName, opponentName }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [countdown, setCountdown] = useState(DEFAULT_TIMER_SECONDS);
  const [scores, setScores] = useState({ you: 0, opponent: 0 });
  const [status, setStatus] = useState('Waiting for trivia match to start...');
  const [roundActive, setRoundActive] = useState(false);
  const [waitingOnOpponent, setWaitingOnOpponent] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef(null);
  const ownSocketId = useRef(null);

  useEffect(() => {
    const handleTriviaStart = (data) => {
      if (data.matchId !== matchId) return;
      ownSocketId.current = socketService.getSocket()?.id;
      setQuestions(data.questions);
      setCurrentIndex(data.currentQuestionIndex);
      setScores({ you: 0, opponent: 0 });
      setSelectedIndex(null);
      setCorrectIndex(null);
      setCountdown(DEFAULT_TIMER_SECONDS);
      setGameOver(false);
      setStatus('Trivia is live! Answer fast to beat your opponent.');
      setRoundActive(true);
      setWaitingOnOpponent(false);
    };

    const handleTriviaUpdate = (data) => {
      if (data.matchId !== matchId) return;
      ownSocketId.current = ownSocketId.current || socketService.getSocket()?.id;
      const ownScore = ownSocketId.current ? data.scores[ownSocketId.current] ?? 0 : 0;
      const opponentSocketId = Object.keys(data.scores).find((id) => id !== ownSocketId.current);
      const opponentScore = opponentSocketId ? data.scores[opponentSocketId] : 0;

      setScores({ you: ownScore, opponent: opponentScore });
      setCorrectIndex(data.correctIndex ?? null);
      setWaitingOnOpponent(!data.bothAnswered);

      if (data.roundResult) {
        setStatus(data.roundResult);
      }

      if (data.isFinalQuestion) {
        setGameOver(true);
        setRoundActive(false);
        setStatus('Game complete! Waiting for results...');
      } else {
        setCurrentIndex(data.currentQuestionIndex);
        setQuestions((prev) => (prev.length ? prev : data.questions || prev));

        if (data.correctIndex === null || data.correctIndex === undefined) {
          setSelectedIndex(null);
          setCountdown(DEFAULT_TIMER_SECONDS);
          setRoundActive(true);
          setStatus('New question loaded. Answer now!');
        } else {
          setRoundActive(false);
        }
      }
    };

    socketService.on('trivia-start', handleTriviaStart);
    socketService.on('trivia-update', handleTriviaUpdate);

    return () => {
      socketService.off('trivia-start', handleTriviaStart);
      socketService.off('trivia-update', handleTriviaUpdate);
      clearInterval(timerRef.current);
    };
  }, [matchId, playerName]);

  useEffect(() => {
    if (!roundActive || gameOver) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timerRef.current);
          submitAnswer(-1);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [roundActive, gameOver]);

  const submitAnswer = (index) => {
    if (!roundActive || selectedIndex !== null || gameOver) return;
    setSelectedIndex(index);
    setRoundActive(false);
    setWaitingOnOpponent(true);
    setStatus('Answer sent. Waiting for opponent...');
    socketService.sendTriviaAnswer(matchId, index);
  };

  const currentQuestion = questions[currentIndex] || null;
  const optionButtons = currentQuestion?.options || [];

  const formatScore = (value) => value ?? 0;

  return (
    <div className="trivia-game-container">
      <div className="trivia-header">
        <div>
          <h3>Trivia Challenge</h3>
          <p className="trivia-subtitle">First to finish with the higher score wins.</p>
        </div>
        <div className="trivia-scoreboard">
          <div className="score-pill">
            <span>You</span>
            <strong>{formatScore(scores.you)}</strong>
          </div>
          <div className="score-pill opponent">
            <span>{opponentName || 'Opponent'}</span>
            <strong>{formatScore(scores.opponent)}</strong>
          </div>
        </div>
      </div>

      {currentQuestion ? (
        <div className="trivia-body">
          <div className="trivia-question-card">
            <div className="trivia-meta">
              <span>Question {currentIndex + 1}</span>
              <span className="trivia-timer">⏱ {countdown}s</span>
            </div>
            <h4>{currentQuestion.question}</h4>
            <div className="trivia-options-grid">
              {optionButtons.map((option, index) => {
                const isSelected = selectedIndex === index;
                const isCorrect = correctIndex === index;
                const isWrongSelection = isSelected && correctIndex !== null && correctIndex !== index;
                return (
                  <button
                    key={option}
                    className={`trivia-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrongSelection ? 'wrong' : ''}`}
                    onClick={() => submitAnswer(index)}
                    disabled={selectedIndex !== null || !roundActive || gameOver}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="trivia-status-panel">
            <p>{status}</p>
            {waitingOnOpponent && <p className="opponent-wait">Waiting on opponent to answer...</p>}
            {correctIndex !== null && (
              <p className="round-result">Correct answer: {currentQuestion.options[correctIndex]}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="trivia-waiting">
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}
