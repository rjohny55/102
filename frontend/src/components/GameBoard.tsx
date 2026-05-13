import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, GameStatus, Board } from '../game/types';
import { ROWS, COLS, GAME_DURATION, MATCH_DELAY, DROP_DELAY, SCORE_PER_TILE, LEVEL_UP_SCORE } from '../game/constants';
import {
  createBoard,
  findMatches,
  removeMatches,
  dropTiles,
  refillBoard,
  swapTiles,
  isAdjacent,
  hasValidMoves,
  resetTileIdCounter,
} from '../game/boardLogic';
import TileComponent from './Tile';

interface GameBoardProps {
  onGameOver?: (score: number, level: number, moves: number) => void;
  onUpdate?: (score: number, level: number, timeLeft: number, isPlaying: boolean) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ onGameOver, onUpdate }) => {
  const [board, setBoard] = useState<Board>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [moves, setMoves] = useState(0);
  const [selectedTile, setSelectedTile] = useState<Position | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.idle);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [matchedPositions, setMatchedPositions] = useState<Set<string>>(new Set());
  const [newTileIds, setNewTileIds] = useState<Set<string>>(new Set());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameStatus(GameStatus.game_over);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Initialize / reset game
  const initGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    resetTileIdCounter();
    const newBoard = createBoard();
    setBoard(newBoard);
    setScore(0);
    setLevel(1);
    setMoves(0);
    setSelectedTile(null);
    setGameStatus(GameStatus.idle);
    setTimeLeft(GAME_DURATION);
    setMatchedPositions(new Set());
    setNewTileIds(new Set());
    isProcessingRef.current = false;
    // Notify parent
    if (onUpdate) {
      onUpdate(0, 1, GAME_DURATION, true);
    }
    // Start timer immediately
    startTimer();
  }, [startTimer, onUpdate]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Notify parent on game over
  useEffect(() => {
    if (gameStatus === GameStatus.game_over && onGameOver) {
      onGameOver(score, level, moves);
    }
  }, [gameStatus, score, level, moves, onGameOver]);

  // Notify parent of state updates for HUD
  useEffect(() => {
    if (onUpdate) {
      const isPlaying = board.length > 0 && gameStatus !== GameStatus.game_over;
      onUpdate(score, level, timeLeft, isPlaying);
    }
  }, [score, level, timeLeft, gameStatus, board.length, onUpdate]);

  // Wait a beat then check for valid moves
  useEffect(() => {
    if (gameStatus === GameStatus.idle && board.length > 0) {
      const checkMoves = setTimeout(() => {
        if (!hasValidMoves(board)) {
          setGameStatus(GameStatus.game_over);
        }
      }, 500);
      return () => clearTimeout(checkMoves);
    }
  }, [gameStatus, board]);

  // Process matches cascade
  const processMatches = useCallback(
    async (currentBoard: Board, currentScore: number, currentMoves: number) => {
      isProcessingRef.current = true;
      let comboMultiplier = 1;
      let boardAfterSwap = currentBoard;
      let currentScoreValue = currentScore;
      let currentMovesValue = currentMoves;

      while (true) {
        const matches = findMatches(boardAfterSwap);
        if (matches.size === 0) break;

        // Animate matched tiles
        setMatchedPositions(matches);
        setGameStatus(GameStatus.matching);

        // Score
        currentScoreValue += matches.size * SCORE_PER_TILE * comboMultiplier;
        setScore(currentScoreValue);

        await delay(MATCH_DELAY);

        // Remove matches
        let boardAfterRemove = removeMatches(boardAfterSwap, matches);
        setBoard(boardAfterRemove);
        setMatchedPositions(new Set());

        // Drop tiles
        setGameStatus(GameStatus.dropping);
        await delay(DROP_DELAY);

        const { board: boardAfterDrop } = dropTiles(boardAfterRemove);

        setBoard(boardAfterDrop as Board);

        await delay(DROP_DELAY);

        // Refill empty cells
        const boardAfterRefill = refillBoard(boardAfterDrop as Board);
        // Mark new tiles for entrance animation
        const newIds = new Set<string>();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const t = boardAfterRefill[r][c];
            if (t && boardAfterDrop[r][c] === null) {
              newIds.add(t.id);
            }
          }
        }
        setNewTileIds(newIds);
        setBoard(boardAfterRefill);

        await delay(DROP_DELAY);
        setNewTileIds(new Set());

        boardAfterSwap = boardAfterRefill;
        comboMultiplier++;
      }

      // Check for valid moves
      if (!hasValidMoves(boardAfterSwap)) {
        setGameStatus(GameStatus.game_over);
      } else {
        setGameStatus(GameStatus.idle);
      }

      setScore(currentScoreValue);
      setMoves(currentMovesValue);
      isProcessingRef.current = false;
    },
    [],
  );

  // Handle tile click
  const handleTileClick = useCallback(
    (pos: Position) => {
      if (isProcessingRef.current) return;
      if (gameStatus !== GameStatus.idle && gameStatus !== GameStatus.selected)
        return;

      if (!selectedTile) {
        setSelectedTile(pos);
        setGameStatus(GameStatus.selected);
        return;
      }

      // Already selected
      if (selectedTile.row === pos.row && selectedTile.col === pos.col) {
        // Deselect
        setSelectedTile(null);
        setGameStatus(GameStatus.idle);
        return;
      }

      if (!isAdjacent(selectedTile, pos)) {
        // Select the new tile instead
        setSelectedTile(pos);
        setGameStatus(GameStatus.selected);
        return;
      }

      // Attempt swap
      const pos1 = selectedTile;
      setSelectedTile(null);
      setGameStatus(GameStatus.swapping);

      const boardAfterSwap = swapTiles(board, pos1, pos);
      setBoard(boardAfterSwap);

      // Check for matches
      const matches = findMatches(boardAfterSwap);
      if (matches.size === 0) {
        // Invalid swap - swap back
        setTimeout(() => {
          const boardSwappedBack = swapTiles(boardAfterSwap, pos1, pos);
          setBoard(boardSwappedBack);
          setGameStatus(GameStatus.idle);
        }, 300);
        return;
      }

      // Valid swap - process matches cascade
      processMatches(boardAfterSwap, score, moves + 1);
    },
    [board, selectedTile, gameStatus, score, moves, processMatches],
  );

  // Level up check
  useEffect(() => {
    const newLevel = Math.floor(score / LEVEL_UP_SCORE) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [score, level]);

  if (board.length === 0) {
    return (
      <div className="game-board__empty">
        <button className="game-board__new-btn" onClick={initGame}>
          Start Game
        </button>
      </div>
    );
  }

  return (
    <div className="game-board__container">
      {/* Game Over Overlay */}
      {gameStatus === GameStatus.game_over && (
        <div className="game-board__overlay">
          <div className="game-board__overlay-content">
            <h2>Game Over!</h2>
            <p>Score: {score}</p>
            <p>Level: {level}</p>
            <p>Moves: {moves}</p>
            <button className="game-board__new-btn" onClick={initGame}>
              New Game
            </button>
          </div>
        </div>
      )}

      {/* Board */}
      <div
        className="game-board__grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: '4px',
          width: '100%',
          maxWidth: '480px',
          aspectRatio: '1 / 1',
        }}
      >
        {board.flatMap((row, rowIdx) =>
          row.map((tile, colIdx) => {
            if (!tile) return null;
            const isSelected =
              selectedTile !== null &&
              selectedTile.row === rowIdx &&
              selectedTile.col === colIdx;
            const isMatched = matchedPositions.has(`${rowIdx},${colIdx}`);
            const isNewTileFlag = newTileIds.has(tile.id);

            return (
              <div
                key={tile.id}
                className="game-board__cell"
                style={{
                  gridRow: rowIdx + 1,
                  gridColumn: colIdx + 1,
                }}
              >
                <TileComponent
                  tile={tile}
                  isSelected={isSelected}
                  gameStatus={gameStatus}
                  isMatched={isMatched}
                  isNewTile={isNewTileFlag}
                  onClick={handleTileClick}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default GameBoard;
