export type GameMode = 'classic' | 'time';

export interface BlockData {
  id: string;
  value: number;
  row: number;
  col: number;
}

export interface GameState {
  grid: BlockData[];
  target: number;
  score: number;
  selectedIds: string[];
  gameOver: boolean;
  mode: GameMode;
  timeLeft: number;
  rows: number;
  cols: number;
}

export const GRID_COLS = 7;
export const GRID_ROWS = 10;
export const INITIAL_ROWS = 4;
export const MAX_VALUE = 9;
export const TIME_LIMIT = 10; // seconds per round in time mode
