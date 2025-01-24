import { backRow, emptyRow, filterNull, getPromotions, pawns } from "../chess";
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
  constructor(private config: ChessControllerConfig) {
    this.events = {};
    this.board = {
      enPassantId: "",
      selectedId: "",
      tiles: [],
      turn: "light",
      turns: 1,
      checks: {
        light: 0,
        dark: 0,
      },
    };
    this.historyIndex = -1;
    this.history = [];
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
  getPieceByCoordinates(rowIndex: number, columnIndex: number) {
    return this.board.tiles[rowIndex]?.[columnIndex];
  }
  getPromotions(color: ChessColor) {
    return this.config.getPromotions?.call(this, color) ?? getPromotions(color);
  }
  newGame() {
    this.getPromotions("light");
    this.getPromotions("dark");
    const board: BoardState = {
      turns: 1,
      turn: "light",
      selectedId: "",
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
    const king = this.getCheckedKing(this.board.turn);
    const pieces = this.getPieces().filter(
      (piece) => piece.color === this.board.turn
    );
    if (!pieces.length) {
      return this.board.turn === "dark" ? "light_wins" : "dark_wins";
    }
    const movements = pieces.flatMap((piece) => piece.movement(this));
    if (king && !movements.length) {
      return this.board.turn === "dark" ? "light_wins" : "dark_wins";
    }
    if (!movements.length) {
      return "stalemate";
    }
    return this.config?.getGameState?.call(this) ?? "active";
  }
  getChecks() {
    return this.board.checks;
  }
  getCheckedKing(color: ChessColor) {
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
  executeMovement(movement: Movement) {
    this.board.turns--;
    this.board.enPassantId = movement.enPassant || "";
    this.board.selectedId = "";
    movement.destinations.forEach((destination) => {
      const { piece, row, column } = destination;
      piece.moves++;
      this.board.tiles[piece.row]![piece.column] = null;
      this.board.tiles[row]![column] = piece;
      piece.row = row;
      piece.column = column;
    });
    movement.captures?.forEach((capture) => {
      this.board.tiles[capture.row]![capture.column] = null;
    });
    if (this.config.name !== CLONE) {
      this.historyIndex++;
      this.history.splice(
        this.historyIndex,
        this.history.length,
        cloneDeep(this.board)
      );
      this.events.afterMove?.forEach((listener) => listener());
    }
    if (this.board.turns === 0) {
      this.board.turn = this.board.turn === "light" ? "dark" : "light";
      this.board.turns = this.config.turns || 1;
      if (this.config.name !== CLONE) {
        const king = this.getCheckedKing(this.board.turn);
        if (king) {
          this.board.checks[this.board.turn]++;
        }
      }
    }
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
          (piece.row === 7 && piece.color === "dark"))
    );
  }
  getPieces() {
    return this.board.tiles.flatMap((row) => row).filter(filterNull);
  }
  getPieceById(id: string) {
    return this.getPieces().find((piece) => piece.id === id);
  }
  getSelectedPiece() {
    return this.getPieceById(this.board.selectedId);
  }
  getEnPassantId() {
    return this.board.enPassantId;
  }
  promotePawn(pawn: Piece, promotion: Piece) {
    this.board.tiles[pawn.row]![pawn.column] = promotion;
    promotion.column = pawn.column;
    promotion.row = pawn.row;
  }
  setSelectedPiece(piece: Piece | null) {
    this.board.selectedId = "";
    if (piece?.color === this.board.turn) {
      const movement = piece.movement(this);
      if (movement.length) {
        this.board.selectedId = piece.id;
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
          destination.column < 8 &&
          destination.row >= 0 &&
          destination.row < 8
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
}
