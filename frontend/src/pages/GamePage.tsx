import { useAuth } from '../context/AuthContext';

export default function GamePage() {
  const { user } = useAuth();

  return (
    <div className="game-page">
      <h1>Game</h1>
      {user && <p className="game-welcome">Welcome, {user.username}!</p>}
      <div className="game-container">
        <div className="game-sidebar">
          <div className="game-info">
            <h2>Score</h2>
            <p className="game-score" id="score-display">0</p>
          </div>
          <div className="game-info">
            <h2>Timer</h2>
            <p className="game-timer" id="timer-display">0:00</p>
          </div>
          <div className="game-info">
            <h2>Level</h2>
            <p className="game-level" id="level-display">1</p>
          </div>
        </div>
        <div className="game-board-wrapper" id="game-board">
          {/* GameBoard component will be rendered here by task 3 */}
        </div>
      </div>
    </div>
  );
}
