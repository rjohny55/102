import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import GameBoard from '../components/GameBoard';

interface GameResult {
  score: number;
  level: number;
  moves: number;
}

const GamePage: React.FC = () => {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleUpdate = useCallback(
    (newScore: number, newLevel: number, newTimeLeft: number, playing: boolean) => {
      setScore(newScore);
      setLevel(newLevel);
      setTimeLeft(newTimeLeft);
      setIsPlaying(playing);
    },
    [],
  );

  const handleGameOver = useCallback(
    (finalScore: number, finalLevel: number, finalMoves: number) => {
      setGameResult({ score: finalScore, level: finalLevel, moves: finalMoves });
      setIsPlaying(false);
    },
    [],
  );

  const handleSaveScore = useCallback(async () => {
    if (!gameResult) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/game/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: gameResult.score,
          level: gameResult.level,
          moves: gameResult.moves,
        }),
      });

      if (response.ok) {
        setSaveMessage('Score saved successfully!');
      } else {
        setSaveMessage('Failed to save score. Please try again.');
      }
    } catch {
      setSaveMessage('Network error. Score could not be saved.');
    } finally {
      setSaving(false);
    }
  }, [gameResult]);

  const handleNewGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setIsPlaying(false);
    setGameResult(null);
    setSaveMessage(null);
  }, []);

  return (
    <div className="game-page">
      <h1 className="game-page__title">Match-3</h1>
      {user && <p className="game-welcome">Welcome, {user.username}!</p>}

      {/* HUD */}
      <div className="game-page__hud">
        <div className="game-page__hud-item">
          <span className="game-page__hud-label">Score</span>
          <span className="game-page__hud-value">{score}</span>
        </div>
        <div className="game-page__hud-item">
          <span className="game-page__hud-label">Level</span>
          <span className="game-page__hud-value">{level}</span>
        </div>
        <div className="game-page__hud-item">
          <span className="game-page__hud-label">Time</span>
          <span className="game-page__hud-value">{timeLeft}s</span>
        </div>
      </div>

      {/* Game Board */}
      <div className="game-page__board-wrapper">
        <GameBoard
          onGameOver={handleGameOver}
          onUpdate={handleUpdate}
        />
      </div>

      {/* Result & Save */}
      {gameResult && (
        <div className="game-page__result">
          <h2>Final Score: {gameResult.score}</h2>
          <p>Level reached: {gameResult.level}</p>
          <p>Total moves: {gameResult.moves}</p>

          <div className="game-page__actions">
            <button
              className="game-page__btn game-page__btn--primary"
              onClick={handleSaveScore}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Score'}
            </button>
            <button
              className="game-page__btn game-page__btn--secondary"
              onClick={handleNewGame}
            >
              Play Again
            </button>
          </div>

          {saveMessage && (
            <p className="game-page__save-message">{saveMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePage;
