import { useEffect, useRef, useState } from 'react';
import socketService from '../services/socketService';
import '../styles/TriviaGame.css';

const DEFAULT_TIMER_SECONDS = 15;

export default function TriviaGame({ matchId, playerName, opponentName }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(DEFAULT_TIMER_SECONDS);
  const [status, setStatus] = useState('Waiting for trivia to start...');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const handleTriviaStart = (data) => {
      if (data.matchId !== matchId) return;

      setQuestions(data.questions || []);
      setCurrentIndex(0);
      setSelectedIndex(null);
      setScore(0);
      setCountdown(DEFAULT_TIMER_SECONDS);
      setStatus('Answer each question before time runs out.');
      setGameStarted(true);
      setGameFinished(false);
    };

    socketService.on('trivia-start', handleTriviaStart);

    return () => {
      socketService.off('trivia-start', handleTriviaStart);
      clearInterval(timerRef.current);
    };
  }, [matchId]);

  useEffect(() => {
    if (!gameStarted || gameFinished || selectedIndex !== null) return;

    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(-1);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameStarted, gameFinished, currentIndex, selectedIndex]);

  const currentQuestion = questions[currentIndex];

  const finishGame = (finalScore) => {
    setGameFinished(true);
    setStatus('Finished! Waiting for opponent to finish...');
    socketService.sendTriviaFinished(matchId, finalScore, questions.length);
  };

  const handleAnswer = (answerIndex) => {
    if (!currentQuestion || selectedIndex !== null || gameFinished) return;

    clearInterval(timerRef.current);
    setSelectedIndex(answerIndex);

    const correct = answerIndex === currentQuestion.correctIndex;
    const newScore = correct ? score + 1 : score;

    if (correct) {
      setScore(newScore);
      setStatus('Correct!');
    } else if (answerIndex === -1) {
      setStatus('Time ran out.');
    } else {
      setStatus('Wrong answer.');
    }

    setTimeout(() => {
      const nextIndex = currentIndex + 1;

      if (nextIndex >= questions.length) {
        finishGame(newScore);
      } else {
        setCurrentIndex(nextIndex);
        setSelectedIndex(null);
        setCountdown(DEFAULT_TIMER_SECONDS);
        setStatus('Next question.');
      }
    }, 1200);
  };

  if (!gameStarted || !currentQuestion) {
    return (
      <div className="trivia-game-container">
        <div className="trivia-waiting">
          <h3>Trivia Challenge</h3>
          <p>{status}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trivia-game-container">
      <div className="trivia-header">
        <div>
          <h3>Secret Trivia Screen</h3>
          <p className="trivia-subtitle">
            You and {opponentName || 'your opponent'} are playing separately.
          </p>
        </div>

        <div className="trivia-scoreboard">
          <div className="score-pill">
            <span>{playerName || 'You'}</span>
            <strong>{score}</strong>
          </div>
        </div>
      </div>

      <div className="trivia-body">
        <div className="trivia-question-card">
          <div className="trivia-meta">
            <span>
              Question {currentIndex + 1} / {questions.length}
            </span>
            <span className="trivia-timer">{countdown}s</span>
          </div>

          <h4>{currentQuestion.question}</h4>

          <div className="trivia-options-grid">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedIndex === index;
              const isCorrect =
                selectedIndex !== null && index === currentQuestion.correctIndex;
              const isWrong =
                selectedIndex !== null &&
                isSelected &&
                index !== currentQuestion.correctIndex;

              return (
                <button
                  key={`${option}-${index}`}
                  className={`trivia-option ${isSelected ? 'selected' : ''} ${
                    isCorrect ? 'correct' : ''
                  } ${isWrong ? 'wrong' : ''}`}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedIndex !== null || gameFinished}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="trivia-status-panel">
          <p>{status}</p>

          {selectedIndex !== null && (
            <p>
              Correct answer:{' '}
              <strong>{currentQuestion.options[currentQuestion.correctIndex]}</strong>
            </p>
          )}

          {gameFinished && <p>Waiting for opponent to finish...</p>}
        </div>
      </div>
    </div>
  );
}