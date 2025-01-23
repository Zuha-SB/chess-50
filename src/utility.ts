import type { BoardState } from "./types";

export const getPieceById = (board: BoardState, id: string) =>
  board.tiles.flat().find((piece) => piece?.id === id);
