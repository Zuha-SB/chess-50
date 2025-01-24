import { bishop, filterNull, king, knight, pawn, queen, rook } from "../chess";
import type {
  BoardState,
  ChessColor,
  ChessControllerConfig,
  GameState,
  Movement,
  Piece,
} from "../types";
import cloneDeep from "clone-deep";

const backRow = (color: ChessColor) => [
  rook(color),
  knight(color),
  bishop(color),
  queen(color),
  king(color),
  bishop(color),
  knight(color),
  rook(color),
];

const emptyRow = () => Array.from({ length: 8 }).map(() => null);

export class ChessController {
  private board: BoardState;
  constructor(private config?: ChessControllerConfig) {
    this.board = this.newGame();
  }
  getPieceByCoordinates(rowIndex: number, columnIndex: number) {
    return this.board.tiles[rowIndex]?.[columnIndex];
  }
  getPromotions() {
    const color = this.board.turn === "light" ? "dark" : "light";
    return [knight(color), bishop(color), rook(color), queen(color)];
  }
  newGame() {
    const board: BoardState = {
      turn: "light",
      selectedId: "",
      enPassantId: "",
      tiles: [
        backRow("dark"),
        Array.from({ length: 8 }).map(() => pawn("dark")),
        emptyRow(),
        emptyRow(),
        emptyRow(),
        emptyRow(),
        Array.from({ length: 8 }).map(() => pawn("light")),
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
    const kings = this.getPieces().filter((piece) => piece?.type === "king");
    if (kings.length === 1) {
      return kings[0]?.color === "light" ? "light_wins" : "dark_wins";
    }
    if (kings.length === 0) {
      return "stalemate";
    }
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
    return this.config?.getGameState.call(this) ?? "active";
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
        piece.movement(this, {
          attacksOnly: true,
        })
      );
  }
  executeMovement(piece: Piece, movement: Movement) {
    piece.moves++;
    const { row, column } = movement;
    this.board.tiles[piece.row]![piece.column] = null;
    this.board.tiles[row]![column] = piece;
    piece.row = row;
    piece.column = column;
    this.board.turn = this.board.turn === "light" ? "dark" : "light";
    this.board.enPassantId = movement.enPassant ? piece.id : "";
    movement.captures?.forEach((capture) => {
      this.board.tiles[capture.row]![capture.column] = null;
    });
    movement.movements?.forEach((movement) => {
      const extraMovement =
        this.board.tiles[movement.from.row]?.[movement.from.column];
      if (extraMovement) {
        this.board.tiles[movement.to.row]![movement.to.column] = extraMovement;
        this.board.tiles[movement.from.row]![movement.from.column] = null;
        extraMovement.row = movement.to.row;
        extraMovement.column = movement.to.column;
      }
    });
  }
  getTurn() {
    return this.board.turn;
  }
  getPromotedPawn() {
    return this.getPieces().find(
      (piece) =>
        piece && piece.type === "pawn" && (piece.row === 0 || piece.row === 7)
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
    const controller = new ChessController();
    controller.board = cloneDeep(this.board);
    return controller;
  }
}
