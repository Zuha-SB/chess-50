import {
  backRow,
  bishop,
  emptyRow,
  filterNull,
  knight,
  pawns,
  queen,
  rook,
} from "../chess";
import type {
  BoardState,
  ChessColor,
  ChessControllerConfig,
  GameState,
  Movement,
  Piece,
} from "../types";
import cloneDeep from "clone-deep";

export class ChessController {
  private board: BoardState;
  constructor(private config: ChessControllerConfig) {
    this.board = {
      enPassantId: "",
      selectedId: "",
      tiles: [],
      turn: "light",
    };
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
  getPromotions(
    color: ChessColor = this.board.turn === "light" ? "dark" : "light"
  ) {
    return [knight(color), bishop(color), rook(color), queen(color)];
  }
  newGame() {
    this.getPromotions("light");
    this.getPromotions("dark");
    const board: BoardState = {
      turn: "light",
      selectedId: "",
      enPassantId: "",
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
    const movements = this.getPieces()
      .filter((piece) => piece.color === this.board.turn)
      .flatMap((piece) => piece.movement(this));
    if (king && !movements.length) {
      return this.board.turn === "dark" ? "light_wins" : "dark_wins";
    }
    if (!movements.length) {
      return "stalemate";
    }
    return this.config?.getGameState?.call(this) ?? "active";
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
    this.board.turn = this.board.turn === "light" ? "dark" : "light";
    this.board.enPassantId = movement.enPassant || "";
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
  }
  getTurn() {
    return this.board.turn;
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
    const controller = new ChessController(this.config);
    controller.board = cloneDeep(this.board);
    return controller;
  }
  detectNoKings() {
    // DO SOMETHING ONE DAY
    const kings = this.getPieces().filter((piece) => piece?.type === "king");
    if (kings.length === 1) {
      return kings[0]?.color === "light" ? "light_wins" : "dark_wins";
    }
    if (kings.length === 0) {
      return "stalemate";
    }
  }
}
