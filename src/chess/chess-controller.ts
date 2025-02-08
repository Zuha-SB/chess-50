import { backRow, emptyRow, filterNull, getPromotions, pawns } from "../chess";
import { FILES, RANKS } from "../constant";
import type {
  BoardState,
  ChessColor,
  ChessControllerConfig,
  ChessEventListener,
  ChessEventName,
  GameState,
  Movement,
  MovementConfig,
  Piece,
} from "../types";
import cloneDeep from "clone-deep";

const CLONE = "CLONE" as const;

export class ChessController {
  private events: Partial<Record<ChessEventName, ChessEventListener[]>>;
  private board: BoardState;
  private history: Array<BoardState>;
  private historyIndex: number;
  private selectedPiece: Piece | null = null;
  constructor(private config: ChessControllerConfig) {
    this.events = {};
    this.board = {
      halfmoves: 0,
      movesSinceCaptureOrPawn: 0,
      wholemoves: 0,
      enPassantId: "",
      tiles: [],
      turn: "light",
      turns: 1,
      checks: {
        light: 0,
        dark: 0,
      },
      capturedPieces: {
        dark: {},
        light: {},
        neutral: {},
      },
    };
    this.historyIndex = -1;
    this.history = [];
  }
  getCastleFromTheLeft() {
    return this.config.castleFromTheLeft ?? 2;
  }
  getCastleFromTheRight() {
    return this.config.castleFromTheRight ?? 1;
  }
  getRows() {
    return this.config.rows || 8;
  }
  getColumns() {
    return this.config.columns || 8;
  }
  onDraw(context: CanvasRenderingContext2D) {
    this.config.onDraw?.call(this, context);
  }
  addEventListener(name: ChessEventName, listener: ChessEventListener) {
    const events = this.events[name] || [];
    events.push(listener);
    this.events[name] = events;
  }
  removeEventListener(name: ChessEventName, listener: ChessEventListener) {
    const events = this.events[name] || [];
    const index = events.indexOf(listener);
    events.splice(index, 1);
  }
  getSlug() {
    return this.config.slug;
  }
  getName() {
    return this.config.name;
  }
  isClone() {
    return this.config.name === CLONE;
  }
  getPieceByCoordinates(rowIndex: number, columnIndex: number) {
    return this.board.tiles[rowIndex]?.[columnIndex];
  }
  getPromotions(color: ChessColor) {
    return this.config.getPromotions?.call(this, color) ?? getPromotions(color);
  }
  hasCheck() {
    return this.config.hasCheck;
  }
  newGame() {
    // this.getPromotions("light");
    // this.getPromotions("dark");
    const board: BoardState = {
      capturedPieces: {
        dark: {},
        light: {},
        neutral: {},
      },
      halfmoves: 0,
      movesSinceCaptureOrPawn: 0,
      wholemoves: 0,
      turns: this.config.canLightFullyMove
        ? this.config.getTurns?.call(this, true) ?? 1
        : 1,
      turn: "light",
      enPassantId: "",
      checks: {
        light: 0,
        dark: 0,
      },
      tiles: this.config?.newGame?.call(this) ?? [
        backRow("dark"),
        pawns("dark"),
        emptyRow(),
        emptyRow(),
        emptyRow(),
        emptyRow(),
        pawns("light"),
        backRow("light"),
      ],
    };
    board.tiles.forEach((row, rowIndex) => {
      row.forEach((piece, columnIndex) => {
        if (piece) {
          piece.row = rowIndex;
          piece.column = columnIndex;
        }
      });
    });
    this.board = board;
    this.historyIndex = 0;
    this.history = [cloneDeep(this.board)];
    this.selectedPiece = null;
    return board;
  }
  async waitForReady() {
    await Promise.all(
      this.getPieces().map((piece) => {
        if (!piece.image.complete) {
          return new Promise((resolve) => {
            piece.image.addEventListener("load", resolve);
          });
        }
      })
    );
  }
  getGameState(): GameState {
    const state = this.config?.getGameState?.call(this) ?? "active";
    if (state !== "active") {
      return state;
    }
    const pieces = this.getPieces().filter(
      (piece) => piece.color === this.board.turn
    );
    if (!pieces.length) {
      return this.board.turn === "dark" ? "light_wins" : "dark_wins";
    }
    const movements = pieces.flatMap((piece) => piece.movement(this));
    if (!movements.length) {
      const king = this.getCheckedKing(this.board.turn);
      if (king) {
        return this.board.turn === "dark" ? "light_wins" : "dark_wins";
      }
      return "stalemate";
    }
    if (this.board.movesSinceCaptureOrPawn >= 100) {
      return "stalemate";
    }
    return "active";
  }
  getChecks() {
    return this.board.checks;
  }
  getCheckedKing(color: ChessColor) {
    if (this.config.hasCheck !== false && this.board.turns <= 1) {
      const attacks = this.getAttacksAgainst(color);
      return this.getPieces().find((piece) =>
        attacks.find(
          (attack) =>
            attack.piece.color !== piece.color &&
            attack.column === piece.column &&
            attack.row === piece.row &&
            piece.type === "king"
        )
      );
    }
    return null;
  }
  getAttacksAgainst(color: ChessColor) {
    return this.getPieces()
      .filter((piece) => piece.color !== color)
      .flatMap((piece) =>
        piece
          .movement(this, {
            attacksOnly: true,
          })
          .flatMap((movement) => movement.destinations)
      );
  }
  private getPieceTypeFen(type: string, color: ChessColor): string {
    let letter = "";
    switch (type) {
      case "king":
        letter = "k";
        break;
      case "queen":
        letter = "q";
        break;
      case "rook":
        letter = "r";
        break;
      case "bishop":
        letter = "b";
        break;
      case "knight":
        letter = "n";
        break;
      case "pawn":
        letter = "p";
        break;
    }
    letter = color === "light" ? letter.toUpperCase() : letter;
    return letter;
  }
  generateFEN(): string {
    if (!this.board?.tiles) return "";
    const pieces = this.getPieces();
    let fen = "";
    let emptySpaceCounter = 0;
    for (let i = 0; i < this.getRows(); i++) {
      for (let j = 0; j < this.getColumns(); j++) {
        const piece = this.board.tiles[i]?.[j];
        if (piece) {
          if (emptySpaceCounter !== 0) {
            fen += emptySpaceCounter.toString();
            emptySpaceCounter = 0;
          }
          fen += this.getPieceTypeFen(piece.type, piece.color);
        } else {
          emptySpaceCounter++;
        }
      }
      if (emptySpaceCounter !== 0) {
        fen += emptySpaceCounter.toString();
        emptySpaceCounter = 0;
      }
      if (i !== 7) fen += "/";
    }
    const turnLetter = this.board.turn === "light" ? "w" : "b";
    fen += ` ${turnLetter} `;
    let castlingString = "";
    const lightKing = pieces.find(
      (piece) => piece.type === "king" && piece.color === "light"
    );
    const darkKing = pieces.find(
      (piece) => piece.type === "king" && piece.color === "dark"
    );
    if (lightKing) {
      const lightKingRook = pieces.find(
        (piece) =>
          piece.type === "rook" &&
          piece.color === "light" &&
          piece.column > lightKing.column &&
          piece.moves === 0
      );
      const lightQueenRook = pieces.find(
        (piece) =>
          piece.type === "rook" &&
          piece.color === "light" &&
          piece.column < lightKing.column &&
          piece.moves === 0
      );
      castlingString += lightKingRook ? "K" : "";
      castlingString += lightQueenRook ? "Q" : "";
    }
    if (darkKing) {
      const darkKingRook = pieces.find(
        (piece) =>
          piece.type === "rook" &&
          piece.color === "dark" &&
          piece.column > darkKing.column &&
          piece.moves === 0
      );
      const darkQueenRook = pieces.find(
        (piece) =>
          piece.type === "rook" &&
          piece.color === "dark" &&
          piece.column < darkKing.column &&
          piece.moves === 0
      );
      castlingString += darkKingRook ? "k" : "";
      castlingString += darkQueenRook ? "q" : "";
    }
    fen += castlingString || "-";
    const enPassant = pieces.find(
      (piece) => piece.id === this.board.enPassantId
    );
    if (enPassant) {
      const rowOffset = this.board.turn === "dark" ? 1 : -1;
      const rank = RANKS(this.getRows())[enPassant.row + rowOffset];
      const file = FILES(this.getColumns())[enPassant.column];
      fen += ` ${file}${rank} `;
    } else {
      fen += " - ";
    }
    let movesSinceCaptureOrPawn = this.board.movesSinceCaptureOrPawn - 1;
    if (movesSinceCaptureOrPawn < 0) movesSinceCaptureOrPawn = 0;
    fen += `${movesSinceCaptureOrPawn} ${
      Math.floor((this.board.wholemoves - 1) / 2) + 1
    }`;
    return fen;
  }
  executeMovement(movement: Movement) {
    this.board.turns--;
    this.board.enPassantId = movement.enPassant || "";
    this.selectedPiece = null;
    const captures = [
      ...(movement.captures || []).map((capture) =>
        this.getPieceByCoordinates(capture.row, capture.column)
      ),
      ...(!movement.castle
        ? movement.destinations.map((destination) =>
            this.getPieceByCoordinates(destination.row, destination.column)
          )
        : []),
    ].filter(filterNull);
    const isPawn = movement.destinations.find(
      (destination) => destination.piece.type === "pawn"
    );
    if (captures.length || isPawn) {
      this.board.movesSinceCaptureOrPawn = 0;
    } else {
      this.board.movesSinceCaptureOrPawn++;
    }
    const whoWasTaken = this.board.turn === "light" ? "dark" : "light";
    captures.forEach((capture) => {
      const type = capture.isPromoted ? "pawn" : capture.type;
      const capturedPieces = this.board.capturedPieces[whoWasTaken];
      capturedPieces[type] = (capturedPieces[type] ?? 0) + 1;
    });
    movement.destinations.forEach((destination) => {
      const { piece, row, column } = destination;
      piece.moves++;
      const fromRow = this.board.tiles[piece.row];
      if (fromRow) {
        fromRow[piece.column] = null;
      }
      const toRow = this.board.tiles[row];
      if (toRow) {
        toRow[column] = piece;
      }
      piece.row = row;
      piece.column = column;
    });
    movement.captures?.forEach((capture) => {
      this.board.tiles[capture.row]![capture.column] = null;
    });
    this.board.halfmoves++;
    if (this.board.turns === 0) {
      this.board.wholemoves++;
      this.board.turn = this.board.turn === "light" ? "dark" : "light";
      this.board.turns = this.config.getTurns?.call(this, false) || 1;
      const king = this.getCheckedKing(this.board.turn);
      if (king) {
        this.board.checks[this.board.turn]++;
      }
    }
    this.config.executeMovement?.call(this, movement);
    this.historyIndex++;
    this.history.splice(
      this.historyIndex,
      this.history.length,
      cloneDeep(this.board)
    );
    this.events.afterMove?.forEach((listener) => listener());
  }
  getCaptures() {
    return this.board.capturedPieces;
  }
  getTurn() {
    return this.board.turn;
  }
  getTurns() {
    return this.board.turns;
  }
  getPromotedPawn() {
    return this.getPieces().find(
      (piece) =>
        piece &&
        piece.type === "pawn" &&
        ((piece.row === 0 && piece.color === "light") ||
          (piece.row === this.getRows() - 1 && piece.color === "dark"))
    );
  }
  getPieces() {
    return this.board.tiles.flatMap((row) => row).filter(filterNull);
  }
  getPieceById(id: string) {
    return this.getPieces().find((piece) => piece.id === id);
  }
  getSelectedPiece() {
    return this.config.getSelectedPiece?.call(this) || this.selectedPiece;
  }
  getEnPassantId() {
    return this.board.enPassantId;
  }
  promotePawn(pawn: Piece, promotion: Piece) {
    this.board.tiles[pawn.row]![pawn.column] = promotion;
    promotion.column = pawn.column;
    promotion.row = pawn.row;
    this.events.promote?.forEach((listener) =>
      listener({
        promotion,
      })
    );
  }
  setSelectedPiece(piece: Piece | null) {
    this.selectedPiece = null;
    if (piece?.color === this.board.turn) {
      const movement = piece.movement(this);
      if (movement.length) {
        this.selectedPiece = piece;
      }
    }
  }
  clone() {
    const controller = new ChessController({
      ...this.config,
      name: CLONE,
    });
    controller.board = cloneDeep(this.board);
    return controller;
  }
  getWholeMoves() {
    return this.board.wholemoves;
  }
  detectMissingKings() {
    const kings = this.getPieces().filter((piece) => piece?.type === "king");
    if (kings.length === 1) {
      return kings[0]?.color === "light" ? "light_wins" : "dark_wins";
    }
    if (kings.length === 0) {
      return "stalemate";
    }
    return "active";
  }
  undo() {
    const history = this.history[this.historyIndex - 1];
    if (history) {
      this.board = cloneDeep(history);
      this.historyIndex--;
    }
  }
  redo() {
    const history = this.history[this.historyIndex + 1];
    if (history) {
      this.board = cloneDeep(history);
      this.historyIndex++;
    }
  }
  removeIllegalMoves(
    movements: Movement[],
    config: MovementConfig | null | undefined
  ) {
    const filtered = movements.filter((movement) => {
      // REMOVE OUT OF BOUNDS
      movement.destinations = movement.destinations.filter(
        (destination) =>
          destination.column >= 0 &&
          destination.column < this.getColumns() &&
          destination.row >= 0 &&
          destination.row < this.getRows()
      );
      // REMOVE SELF CAPTURES
      movement.destinations = movement.castle
        ? movement.destinations
        : movement.destinations.filter(
            (destination) =>
              this.getPieceByCoordinates(destination.row, destination.column)
                ?.color !== destination.piece.color
          );
      if (config?.attacksOnly) {
        return movement.destinations.length;
      }
      // REMOVE SELF CHECKS
      if (this.board.turns <= 1) {
        const future = this.clone();
        future.executeMovement(cloneDeep(movement));
        const king = future.getCheckedKing(this.board.turn);
        if (king) {
          return false;
        }
      }
      return movement.destinations.length;
    });

    return (
      this.config.removeIllegalMoves?.call(this, filtered, config) ?? filtered
    );
  }
  onClick(x: number, y: number): boolean {
    return this.config.onClick?.call(this, x, y) === true;
  }
}
