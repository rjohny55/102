import { TileType } from './types';

export const ROWS = 8;
export const COLS = 8;
export const TILE_TYPES_COUNT = 6;

export const TILE_COLORS: Record<TileType, string> = {
  [TileType.RED]: '#e74c3c',
  [TileType.BLUE]: '#3498db',
  [TileType.GREEN]: '#2ecc71',
  [TileType.YELLOW]: '#f1c40f',
  [TileType.PURPLE]: '#9b59b6',
  [TileType.ORANGE]: '#e67e22',
};

export const TILE_SYMBOLS: Record<TileType, string> = {
  [TileType.RED]: '🔴',
  [TileType.BLUE]: '🔵',
  [TileType.GREEN]: '🟢',
  [TileType.YELLOW]: '🟡',
  [TileType.PURPLE]: '🟣',
  [TileType.ORANGE]: '🟠',
};

export const SWAP_DURATION = 200;
export const MATCH_DELAY = 300;
export const DROP_DELAY = 100;
export const GAME_DURATION = 60; // seconds

export const SCORE_PER_TILE = 10;
export const LEVEL_UP_SCORE = 1000;
