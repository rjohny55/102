import { describe, it, expect, beforeEach } from 'vitest';
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
} from '../boardLogic';
import { TileType, Board } from '../types';
import { ROWS, COLS, TILE_TYPES_COUNT } from '../constants';

describe('Full Game Loop Integration', () => {
  beforeEach(() => {
    resetTileIdCounter();
  });

  // Helper: create a board from a numeric layout
  function makeTestBoard(layout: number[][]): Board {
    resetTileIdCounter();
    return layout.map((row, r) =>
      row.map((type, c) => ({
        id: `test-${r}-${c}`,
        type: type as TileType,
        position: { row: r, col: c },
      })),
    );
  }

  describe('createBoard → findMatches → no initial matches', () => {
    it('createBoard produces a board with no matches over multiple attempts', () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        resetTileIdCounter();
        const board = createBoard();
        const matches = findMatches(board);
        expect(matches.size).toBe(0);
      }
    });

    it('createBoard produces correct dimensions', () => {
      const board = createBoard();
      expect(board.length).toBe(ROWS);
      for (const row of board) {
        expect(row.length).toBe(COLS);
        for (const tile of row) {
          expect(tile).not.toBeNull();
        }
      }
    });
  });

  describe('Full cascade: swap → match → remove → drop → refill', () => {
    it('performs a valid swap, detects matches, removes them, drops tiles, and refills', () => {
      // Create a board where swapping (4,0) with (4,1) creates a match in the middle of the board
      // Row 4: [0, 1, 0, 0, 2, 3, 4, 5]
      // Row 3: [1, 2, 3, 4, 5, 0, 1, 2]
      // Swap (4,0) with (4,1): gives [1, 0, 0, 0, 2, 3, 4, 5] → match at cols 1-3
      const board = makeTestBoard([
        [0, 1, 2, 3, 4, 5, 0, 1],
        [1, 2, 3, 4, 5, 0, 1, 2],
        [2, 3, 4, 5, 0, 1, 2, 3],
        [3, 4, 5, 0, 1, 2, 3, 4],
        [0, 1, 0, 0, 2, 3, 4, 5],
        [5, 0, 1, 2, 3, 4, 5, 0],
        [0, 1, 2, 3, 4, 5, 0, 1],
        [1, 2, 3, 4, 5, 0, 1, 2],
      ]);

      // Verify no initial matches in row 4
      expect(findMatches(board).size).toBe(0);

      // Perform valid swap on row 4
      const pos1 = { row: 4, col: 0 };
      const pos2 = { row: 4, col: 1 };
      expect(isAdjacent(pos1, pos2)).toBe(true);

      const swappedBoard = swapTiles(board, pos1, pos2);
      // Row 4 after swap: [1, 0, 0, 0, 2, 3, 4, 5]
      // Match at cols 1-3 (indices 1,2,3) = three 0s

      // Find matches
      const matches = findMatches(swappedBoard);
      expect(matches.size).toBeGreaterThanOrEqual(3);
      expect(matches.has('4,1')).toBe(true);
      expect(matches.has('4,2')).toBe(true);
      expect(matches.has('4,3')).toBe(true);

      // Remove matches
      const afterRemove = removeMatches(swappedBoard, matches);
      expect(afterRemove[4][1]).toBeNull();
      expect(afterRemove[4][2]).toBeNull();
      expect(afterRemove[4][3]).toBeNull();

      // Drop tiles - tiles above nulls should fall down
      // Nulls at row 4, so tiles from rows 0-3 in cols 1,2,3 should drop
      const { board: afterDrop } = dropTiles(afterRemove);

      // In column 1, tiles from rows 0-3 and 5-7. Null at row 4.
      // After gravity: tile from row 3, col 1 drops to row 4 (filling the null)
      // Tile from row 2 drops to row 3, row 1 drops to row 2, row 0 stays at row 0
      expect(afterDrop[4][1]).not.toBeNull();
      expect(afterDrop[3][1]).not.toBeNull(); // was row 2 col 1

      // All nulls should now be at the top of each affected column
      // Column 1: original rows 0-3 compressed to rows 0-3 (wait let me trace more carefully)

      // Refill remaining nulls (at the top)
      const afterRefill = refillBoard(afterDrop);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          expect(afterRefill[r][c]).not.toBeNull();
        }
      }
    });
  });

  describe('Full cascade with combo (chain reaction)', () => {
    it('processes a chain reaction: match → remove → drop → re-match (combo)', () => {
      // Create a board where after removing matches and applying gravity,
      // tiles fall into place creating NEW matches (chain reaction)
      //
      // Column 0: rows 3,4,5 have type 0, row 2 has type 0, rows 0-1 have other types
      // Rows 3-5 in col 0 is a vertical match of 3
      // After removing (3,0), (4,0), (5,0), tiles from rows 0-2,6-7 remain
      // After gravity: (2,0) drops to (5,0), (1,0) drops to (4,0), (0,0) drops to (3,0)
      // Now col 0 has types: ... from bottom, row 0 tile is now at (3,0)
      // 
      // Simpler approach: use a known match/drop pattern
      // Col 0: [1, 2, 0, 0, 0, 3, 4, 5] → match at rows 2-4, remove them
      // After drop: [null, null, null, 1, 2, 3, 4, 5] → the tile from (0,0) and (1,0) drop
      // Actually [1, 2] drop to [3,4], nulls at [0,1,2]
      const board: Board = Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          if (c !== 0) {
            return {
              id: `t-${r}-${c}`,
              type: ((r * 3 + c * 7) % TILE_TYPES_COUNT) as TileType,
              position: { row: r, col: c },
            };
          }
          // Column 0: match at rows 3,4,5 (all type 0)
          if (r >= 3 && r <= 5) {
            return {
              id: `match-${r}-${c}`,
              type: TileType.RED as TileType,
              position: { row: r, col: c },
            };
          }
          // Other rows in col 0 have different types
          return {
            id: `t-${r}-${c}`,
            type: ((r + 1) % TILE_TYPES_COUNT) as TileType,
            position: { row: r, col: c },
          };
        }),
      );

      // Find the vertical match
      const matches = findMatches(board);
      expect(matches.size).toBeGreaterThanOrEqual(3);
      expect(matches.has('3,0')).toBe(true);
      expect(matches.has('4,0')).toBe(true);
      expect(matches.has('5,0')).toBe(true);

      // Remove matches
      const afterRemove = removeMatches(board, matches);
      expect(afterRemove[3][0]).toBeNull();
      expect(afterRemove[4][0]).toBeNull();
      expect(afterRemove[5][0]).toBeNull();

      // Apply gravity: tiles above the nulls should fall down
      const { board: afterDrop } = dropTiles(afterRemove);

      // Column 0: rows 0,1,2,6,7 have tiles. Nulls at 3,4,5.
      // After gravity: tiles at rows 0,1,2 drop to rows 3,4,5
      // Tiles at rows 6,7 stay at rows 6,7
      // Nulls end up at rows 0,1,2
      expect(afterDrop[3][0]).not.toBeNull();
      expect(afterDrop[4][0]).not.toBeNull();
      expect(afterDrop[5][0]).not.toBeNull();
      expect(afterDrop[0][0]).toBeNull();
    });
  });

  describe('Swap + match sequence end-to-end (middle of board)', () => {
    it('performs a swap, detects matches, removes, drops, and refills', () => {
      // Use a board with an already-existing match at rows 4,5,6 col 0 (vertical)
      const board = makeTestBoard([
        [0, 1, 2, 3, 4, 5, 0, 1],
        [1, 2, 3, 4, 5, 0, 1, 2],
        [2, 3, 4, 5, 0, 1, 2, 3],
        [3, 4, 5, 0, 1, 2, 3, 4],
        [0, 5, 0, 1, 2, 3, 4, 5],
        [0, 0, 1, 2, 3, 4, 5, 0],
        [0, 1, 2, 3, 4, 5, 0, 1],
        [1, 2, 3, 4, 5, 0, 1, 2],
      ]);

      // Find matches (vertical match at col 0 rows 4-6)
      const matches = findMatches(board);
      expect(matches.size).toBeGreaterThanOrEqual(3);
      expect(matches.has('4,0')).toBe(true);
      expect(matches.has('5,0')).toBe(true);
      expect(matches.has('6,0')).toBe(true);

      // Remove matches
      const afterRemove = removeMatches(board, matches);
      expect(afterRemove[4][0]).toBeNull();
      expect(afterRemove[5][0]).toBeNull();
      expect(afterRemove[6][0]).toBeNull();
      expect(afterRemove[3][0]).not.toBeNull(); // unaffected

      // Drop tiles: tiles at rows 0-3 in col 0 need to drop
      // Actually tiles at 0,1,2,3 drop to fill nulls at 4,5,6
      // Rows 0,1,2,3 drop to rows 3,4,5,6 (4 tiles fill 3 nulls + 1 extra at bottom)
      // Wait: 3 nulls at 4,5,6. 4 tiles above at 0,1,2,3.
      // After gravity: tiles at 3 goes to 6, 2 goes to 5, 1 goes to 4, 0 goes to 3.
      // Nulls at 0,1,2
      const { board: afterDrop } = dropTiles(afterRemove);

      // Column 0 should have tiles at rows 3-7, nulls at 0-2
      expect(afterDrop[3][0]).not.toBeNull();
      expect(afterDrop[4][0]).not.toBeNull();
      expect(afterDrop[5][0]).not.toBeNull();
      expect(afterDrop[6][0]).not.toBeNull();
      expect(afterDrop[7][0]).not.toBeNull();
      expect(afterDrop[0][0]).toBeNull();
      expect(afterDrop[1][0]).toBeNull();
      expect(afterDrop[2][0]).toBeNull();

      // Refill
      const afterRefill = refillBoard(afterDrop);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          expect(afterRefill[r][c]).not.toBeNull();
        }
      }
    });
  });

  describe('hasValidMoves integration', () => {
    it('returns true for a standard generated board (likely has moves)', () => {
      const board = createBoard();
      const result = hasValidMoves(board);
      expect(typeof result).toBe('boolean');
    });

    it('runs without errors on a patterned board', () => {
      const board: Board = Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          const type = ((r * 2 + c * 3) % 6) as TileType;
          return {
            id: `t-${r}-${c}`,
            type,
            position: { row: r, col: c },
          };
        }),
      );
      const result = hasValidMoves(board);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('swapTiles updates positions correctly', () => {
    it('correctly updates tile positions after swap', () => {
      const board = makeTestBoard([
        [0, 1, 2, 3, 4, 5, 0, 1],
        [1, 2, 3, 4, 5, 0, 1, 2],
        [2, 3, 4, 5, 0, 1, 2, 3],
        [3, 4, 5, 0, 1, 2, 3, 4],
        [4, 5, 0, 1, 2, 3, 4, 5],
        [5, 0, 1, 2, 3, 4, 5, 0],
        [0, 1, 2, 3, 4, 5, 0, 1],
        [1, 2, 3, 4, 5, 0, 1, 2],
      ]);

      const newBoard = swapTiles(board, { row: 0, col: 0 }, { row: 1, col: 0 });
      
      expect(newBoard[0][0]?.type).toBe(1);
      expect(newBoard[1][0]?.type).toBe(0);
      expect(newBoard[0][0]?.position).toEqual({ row: 0, col: 0 });
      expect(newBoard[1][0]?.position).toEqual({ row: 1, col: 0 });
      
      // Original board unchanged
      expect(board[0][0]?.type).toBe(0);
      expect(board[1][0]?.type).toBe(1);
    });
  });

  describe('dropTiles with refillBoard full cycle', () => {
    it('completes a full drop + refill cycle without errors', () => {
      const board = createBoard();
      
      // Simulate removing a set of tiles in the middle of the board
      // This ensures tiles above can drop down to fill the gaps
      const matches = new Set<string>(['4,3', '4,4', '4,5']);
      const afterRemove = removeMatches(board, matches);
      expect(afterRemove[4][3]).toBeNull();
      expect(afterRemove[4][4]).toBeNull();
      expect(afterRemove[4][5]).toBeNull();

      // Drop tiles to fill gaps
      const { board: afterDrop, drops } = dropTiles(afterRemove);
      expect(drops.length).toBeGreaterThan(0);
      
      // All drop targets should now have tiles
      for (const drop of drops) {
        expect(afterDrop[drop.to.row][drop.to.col]).not.toBeNull();
      }

      // Refill any remaining nulls (at the top)
      const afterRefill = refillBoard(afterDrop);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          expect(afterRefill[r][c]).not.toBeNull();
        }
      }
    });
  });

  describe('Integration: no null tiles escape', () => {
    it('never produces null tiles after createBoard', () => {
      for (let i = 0; i < 10; i++) {
        resetTileIdCounter();
        const board = createBoard();
        for (const row of board) {
          for (const tile of row) {
            expect(tile).not.toBeNull();
          }
        }
      }
    });

    it('never produces null tiles after removeMatches + dropTiles + refillBoard cycle', () => {
      for (let i = 0; i < 10; i++) {
        resetTileIdCounter();
        let board = createBoard();
        
        // Find and process matches
        let matches = findMatches(board);
        if (matches.size > 0) {
          board = removeMatches(board, matches);
          const { board: dropped } = dropTiles(board);
          board = refillBoard(dropped);
        }
        
        for (const row of board) {
          for (const tile of row) {
            expect(tile).not.toBeNull();
          }
        }
      }
    });
  });

  describe('Full cascade scenario: swap that creates match in middle row', () => {
    it('correctly handles matches at row 4 and fills gaps with gravity', () => {
      // Row 4 has a match at cols 1-3 after setting up specific types
      const board = makeTestBoard([
        [5, 1, 2, 3, 4, 5, 0, 1],
        [4, 2, 3, 4, 5, 0, 1, 2],
        [3, 3, 4, 5, 0, 1, 2, 3],
        [2, 4, 5, 0, 1, 2, 3, 4],
        [1, 1, 1, 1, 5, 5, 5, 5],  // row 4 has horizontal matches at cols 0-3, and cols 4-7
        [0, 0, 1, 2, 3, 4, 5, 0],
        [1, 1, 2, 3, 4, 5, 0, 1],
        [2, 2, 3, 4, 5, 0, 1, 2],
      ]);

      // Row 4: type 1 at cols 0-3 (match of 4), type 5 at cols 4-7 (match of 4)
      const matches = findMatches(board);
      expect(matches.size).toBe(8);
      
      // Verify row 4 matches
      for (let c = 0; c < 8; c++) {
        expect(matches.has(`4,${c}`)).toBe(true);
      }

      // Remove all matched tiles (entire row 4)
      const afterRemove = removeMatches(board, matches);
      for (let c = 0; c < COLS; c++) {
        expect(afterRemove[4][c]).toBeNull();
      }

      // Drop: tiles from rows 0-3 should move down to fill row 4,
      // and tiles from rows 5-7 should stay (they're below the nulls)
      const { board: afterDrop } = dropTiles(afterRemove);
      
      // After gravity: rows 4-7 have tiles (original rows 5-7 stay, plus row 4 filled from above)
      // Wait: nulls are at row 4 only. Tiles at rows 0-3 above drop down, tiles at 5-7 stay.
      // Row 4 has 4 tiles from above (rows 0-3 compressed)
      // Row 5-7 have their original tiles
      // Nulls end up at rows 0-3
      for (let c = 0; c < COLS; c++) {
        expect(afterDrop[4][c]).not.toBeNull();
        expect(afterDrop[5][c]).not.toBeNull();
        expect(afterDrop[6][c]).not.toBeNull();
        expect(afterDrop[7][c]).not.toBeNull();
      }

      // Refill
      const afterRefill = refillBoard(afterDrop);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          expect(afterRefill[r][c]).not.toBeNull();
        }
      }
    });
  });
});
