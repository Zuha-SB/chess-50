export type ChessColor = "dark" | "light";

export type PieceType =
  | "king"
  | "queen"
  | "rook"
  | "bishop"
  | "knight"
  | "pawn";

export interface Move {
  column: number;
  row: number;
  enPassant?: boolean;
  breaksKingSideCastle?: boolean;
  breaksQueenSideCastle?: boolean;
  captures?: Array<{
    column: number;
    row: number;
  }>;
}

export type MoveFunction = (
  this: Piece,
  state: BoardState,
  depth: number
) => Move[];

export interface Piece {
  id: string;
  image: HTMLImageElement;
  color: ChessColor;
  move: MoveFunction;
  type: PieceType;
  column: number;
  row: number;
}

export interface BoardState {
  tiles: Array<Array<Piece | null>>;
  enPassantId: string;
  turn: ChessColor;
  selectedId: string;
  light: {
    canKingSideCastle: boolean;
    canQueenSideCastle: boolean;
  };
  dark: {
    canKingSideCastle: boolean;
    canQueenSideCastle: boolean;
  };
}

export interface PieceWithCoordinates {
  piece: Piece;
  column: number;
  row: number;
}
