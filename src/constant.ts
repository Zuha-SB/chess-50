// CONSTANTS
export const DARK = "black" as const;
export const LIGHT = "white" as const;
export const TILE_SIZE = 70;
export const NOTATION_SIZE = TILE_SIZE / 2;
export const PIECE_PADDING = TILE_SIZE / 4;
export const SIDEBAR = TILE_SIZE * 2;
export const WIDTH = TILE_SIZE * 8 + NOTATION_SIZE * 2 + SIDEBAR;
export const HEIGHT = TILE_SIZE * 8 + NOTATION_SIZE * 2;
// Files: Vertical columns labeled from "a" to "h" from left to right
export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
// Ranks: Horizontal rows numbered from "1" to "8" from bottom to top.
export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
