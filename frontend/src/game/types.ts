export enum TileType {
  RED = 0,
  BLUE = 1,
  GREEN = 2,
  YELLOW = 3,
  PURPLE = 4,
  ORANGE = 5,
}

export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  id: string;
  type: TileType;
  position: Position;
}

export enum GameStatus {
  idle = 'idle',
  selected = 'selected',
  swapping = 'swapping',
  matching = 'matching',
  dropping = 'dropping',
  game_over = 'game_over',
}

export type Board = (Tile | null)[][];
