import type { ChessController } from "./chess/chess-controller";

export type ChessColor = "dark" | "light";

export type PieceType =
  | "king"
  | "queen"
  | "rook"
  | "bishop"
  | "knight"
  | "pawn"
  | "crazy";

export interface Cell {
  column: number;
  row: number;
}

export interface CellPiece extends Cell {
  piece: Piece;
}

export interface Movement {
  column: number;
  row: number;
  enPassant?: string;
  castle?: boolean;
  destinations: Array<CellPiece>;
  captures?: Array<Cell>;
  isCrazy?: boolean;
}

export interface MovementConfig {
  attacksOnly?: boolean;
}

export type MovementFunction = (
  this: Piece,
  controller: ChessController,
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
  moves: number;
  withColor(color: ChessColor): Piece;
  isPromoted: boolean;
}

export interface BoardState {
  tiles: Array<Array<Piece | null>>;
  enPassantId: string;
  turn: ChessColor;
  turns: number;
  checks: {
    light: number;
    dark: number;
  };
  halfmoves: number;
  wholemoves: number;
  movesSinceCaptureOrPawn: number;
  capturedPieces: {
    light: ChessCaptures;
    dark: ChessCaptures;
  };
}

export type ChessCaptures = Partial<Record<PieceType, number>>;

export type GameState = "active" | "light_wins" | "dark_wins" | "stalemate";

export interface ChessControllerConfig {
  onDraw?: (this: ChessController, context: CanvasRenderingContext2D) => void;
  turns?: number;
  name: string;
  slug: string;
  hasCheck?: boolean;
  removeIllegalMoves?: (
    this: ChessController,
    movements: Movement[],
    config: MovementConfig | null | undefined
  ) => Movement[];
  getGameState?: (this: ChessController) => GameState;
  newGame?: (this: ChessController) => Array<Array<Piece | null>>;
  getPromotions?: (this: ChessController, color: ChessColor) => Piece[];
  onClick?: (this: ChessController, x: number, y: number) => boolean;
  executeMovement?: (this: ChessController, movement: Movement) => void;
}

export type ChessEventListener = () => void;

export type ChessEventName = "afterMove";

export interface PieceData {
  type: PieceType;
  color: ChessColor;
  count: number;
}

export interface Drawable<T> {
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  data?: T;
}
