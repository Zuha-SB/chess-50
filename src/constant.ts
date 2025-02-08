// CONSTANTS
export const DARK = "#739552" as const;
export const LIGHT = "#ebecd0" as const;
export const TILE_SIZE = 70;
export const NOTATION_SIZE = TILE_SIZE / 2;
export const PIECE_PADDING = TILE_SIZE / 4;
export const SIDEBAR = TILE_SIZE * 2;
export const WIDTH = TILE_SIZE * 8 + NOTATION_SIZE * 2 + SIDEBAR;
export const HEIGHT = TILE_SIZE * 8 + NOTATION_SIZE * 2;
// Files: Vertical columns labeled from "a" to "h" from left to right
const a = "a".charCodeAt(0);
export const FILES = (length: number) =>
  Array.from({ length }).map((_, index) => String.fromCharCode(a + index));
// Ranks: Horizontal rows numbered from "1" to "8" from bottom to top.
export const RANKS = (length: number) =>
  Array.from({ length }).map((_, index) => `${length - index}`);
