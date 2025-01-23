export type ChessColor = "dark" | "light";

export type PieceType =
  | "king"
  | "queen"
  | "rook"
  | "bishop"
  | "knight"
  | "pawn";

export interface Cell {
  column: number;
  row: number;
}

export interface Movement {
  piece: Piece;
  column: number;
  row: number;
  enPassant?: boolean;
  breaksKingSideCastle?: boolean;
  breaksQueenSideCastle?: boolean;
  movements?: Array<{
    to: Cell;
    from: Cell;
  }>;
  captures?: Array<Cell>;
}

export interface MovementConfig {
  attacksOnly?: boolean;
}

export type MovementFunction = (
  this: Piece,
  state: BoardState,
  config?: MovementConfig
) => Movement[];

export interface Piece {
  id: string;
  image: HTMLImageElement;
  color: ChessColor;
  movement: MovementFunction;
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
