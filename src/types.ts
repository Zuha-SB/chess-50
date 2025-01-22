export type ChessColor = "dark" | "light";

export type PieceType =
  | "king"
  | "queen"
  | "rook"
  | "bishop"
  | "knight"
  | "pawn";

export interface Move {
  x: number;
  y: number;
}

export type MoveFunction = (this: Piece, state: BoardState) => Move[];

export interface Piece {
  id: string;
  image: HTMLImageElement;
  color: ChessColor;
  move: MoveFunction;
}

export interface BoardState {
  tiles: Array<Array<Piece | null>>;
  lastMovedId: string;
  turn: ChessColor;
  selectedId: string;
}

export interface PieceWithCoordinates {
  piece: Piece;
  column: number;
  row: number;
}
