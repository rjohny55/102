import { TileType, Position, Board } from './types';
import { ROWS, COLS, TILE_TYPES_COUNT } from './constants';

let tileIdCounter = 0;

function generateTileId(): string {
  return `tile-${tileIdCounter++}`;
}

export function resetTileIdCounter(): void {
  tileIdCounter = 0;
}

/**
 * Returns a random TileType, optionally excluding one or more types.
 */
export function getRandomTileType(exclude?: TileType | TileType[]): TileType {
  const excludes = exclude === undefined ? [] : (Array.isArray(exclude) ? exclude : [exclude]);
  const available: TileType[] = [];
  for (let i = 0; i < TILE_TYPES_COUNT; i++) {
    const t = i as TileType;
    if (!excludes.includes(t)) {
      available.push(t);
    }
  }
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Checks if two positions are adjacent (horizontally or vertically).
 */
export function isAdjacent(pos1: Position, pos2: Position): boolean {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/**
 * Deep-clones a board (including Tile objects and their positions).
 */
function cloneBoard(board: Board): Board {
  return board.map(row =>
    row.map(tile =>
      tile
        ? { ...tile, position: { ...tile.position } }
        : null,
    ),
  );
}

/**
 * Creates an 8×8 board filled with random tile types, guaranteeing no
 * initial matches of 3-in-a-row (horizontal or vertical).
 */
export function createBoard(): Board {
  const board: Board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const excluded: TileType[] = [];

      // Horizontal check: if two tiles to the left share the same type,
      // do not place that type here (would make 3-in-a-row).
      if (col >= 2) {
        const t1 = board[row][col - 1];
        const t2 = board[row][col - 2];
        if (t1 && t2 && t1.type === t2.type) {
          excluded.push(t1.type);
        }
      }

      // Vertical check: if two tiles above share the same type,
      // do not place that type here.
      if (row >= 2) {
        const t1 = board[row - 1][col];
        const t2 = board[row - 2][col];
        if (t1 && t2 && t1.type === t2.type) {
          excluded.push(t1.type);
        }
      }

      const type = getRandomTileType(
        excluded.length > 0 ? excluded : undefined,
      );

      board[row][col] = {
        id: generateTileId(),
        type,
        position: { row, col },
      };
    }
  }

  return board;
}

/**
 * Swaps two tiles on a board (returns a new board).
 */
function swapTilesInPlace(board: Board, pos1: Position, pos2: Position): void {
  const tile1 = board[pos1.row][pos1.col];
  const tile2 = board[pos2.row][pos2.col];
  board[pos1.row][pos1.col] = tile2;
  board[pos2.row][pos2.col] = tile1;
  if (tile1) tile1.position = { ...pos2 };
  if (tile2) tile2.position = { ...pos1 };
}

export function swapTiles(
  board: Board,
  pos1: Position,
  pos2: Position,
): Board {
  const newBoard = cloneBoard(board);
  swapTilesInPlace(newBoard, pos1, pos2);
  return newBoard;
}

/**
 * Scans the entire board and returns a Set of "row,col" keys for every
 * tile that is part of a match of 3 or more (horizontal + vertical).
 */
export function findMatches(board: Board): Set<string> {
  const matched = new Set<string>();

  // Horizontal runs
  for (let row = 0; row < ROWS; row++) {
    let col = 0;
    while (col < COLS) {
      const tile = board[row][col];
      if (!tile) {
        col++;
        continue;
      }
      let end = col + 1;
      while (end < COLS && board[row][end]?.type === tile.type) {
        end++;
      }
      if (end - col >= 3) {
        for (let c = col; c < end; c++) {
          matched.add(`${row},${c}`);
        }
      }
      col = end;
    }
  }

  // Vertical runs
  for (let col = 0; col < COLS; col++) {
    let row = 0;
    while (row < ROWS) {
      const tile = board[row][col];
      if (!tile) {
        row++;
        continue;
      }
      let end = row + 1;
      while (end < ROWS && board[end][col]?.type === tile.type) {
        end++;
      }
      if (end - row >= 3) {
        for (let r = row; r < end; r++) {
          matched.add(`${r},${col}`);
        }
      }
      row = end;
    }
  }

  return matched;
}

/**
 * Sets every tile at the provided positions to null (removes them).
 */
export function removeMatches(board: Board, positions: Set<string>): Board {
  const newBoard = cloneBoard(board);
  positions.forEach((key) => {
    const [row, col] = key.split(',').map(Number);
    newBoard[row][col] = null;
  });
  return newBoard;
}

/**
 * Gravity: shifts tiles downward to fill empty cells.
 * Returns the new board and a list of drop movements for animation.
 */
export function dropTiles(
  board: Board,
): { board: Board; drops: Array<{ from: Position; to: Position }> } {
  const newBoard = cloneBoard(board);
  const drops: Array<{ from: Position; to: Position }> = [];

  for (let col = 0; col < COLS; col++) {
    let writeRow = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (newBoard[row][col] !== null) {
        if (row !== writeRow) {
          newBoard[writeRow][col] = newBoard[row][col];
          newBoard[row][col] = null;
          if (newBoard[writeRow][col]) {
            newBoard[writeRow][col]!.position = { row: writeRow, col };
          }
          drops.push({
            from: { row, col },
            to: { row: writeRow, col },
          });
        }
        writeRow--;
      }
    }
  }

  return { board: newBoard, drops };
}

/**
 * Fills every null cell on the board with a brand new random tile.
 */
export function refillBoard(board: Board): Board {
  const newBoard = cloneBoard(board);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (newBoard[row][col] === null) {
        newBoard[row][col] = {
          id: generateTileId(),
          type: getRandomTileType(),
          position: { row, col },
        };
      }
    }
  }

  return newBoard;
}

/**
 * Tries every possible swap of two adjacent tiles. If any swap produces
 * at least one match, the board still has valid moves.
 */
export function hasValidMoves(board: Board): boolean {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      // Try swap right
      if (col + 1 < COLS) {
        const testBoard = swapTiles(board, { row, col }, { row, col: col + 1 });
        if (findMatches(testBoard).size > 0) return true;
      }
      // Try swap down
      if (row + 1 < ROWS) {
        const testBoard = swapTiles(board, { row, col }, { row: row + 1, col });
        if (findMatches(testBoard).size > 0) return true;
      }
    }
  }
  return false;
}
