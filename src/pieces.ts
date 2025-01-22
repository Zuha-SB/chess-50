import type { ChessColor, MoveFunction, Piece, PieceType } from "./types";
import { getPieceWithCoordinates } from "./utility";

const loadImage = (() => {
  const cache: Record<string, HTMLImageElement> = {};
  return (src: string) => {
    if (!cache[src]) {
      const image = new Image();
      image.src = src;
      cache[src] = image;
    }
    return cache[src];
  };
})();

const piece = ({
  color,
  type,
  move,
}: {
  color: ChessColor;
  type: PieceType;
  move: MoveFunction;
}): Piece => {
  return {
    id: crypto.randomUUID(),
    color,
    image: loadImage(`${color}_${type}.png`),
    move,
    type,
  };
};

export const pawn = (color: ChessColor) =>
  piece({
    color,
    type: "pawn",
    move(board) {
      const piece = getPieceWithCoordinates(board, this.id);
      if (piece) {
        const movement = [];
        const direction = this.color === "dark" ? 1 : -1;
        // HANDLE 2
        const startingLight = this.color === "light" && piece.row === 6;
        const startingDark = this.color === "dark" && piece.row === 1;
        if (startingDark || startingLight) {
          movement.push({
            column: piece.column,
            row: piece.row + direction * 2,
          });
        }
        // HANDLE 1
        movement.push({
          column: piece.column,
          row: piece.row + direction,
        });
        // HANDLE CAPTURE
        const forwardLeft =
          board.tiles[piece.row + direction][piece.column - 1];
        if (forwardLeft && forwardLeft.color !== this.color) {
          movement.push({
            column: piece.column - 1,
            row: piece.row + direction,
          });
        }
        const forwardRight =
          board.tiles[piece.row + direction][piece.column + 1];
        if (forwardRight && forwardRight.color !== this.color) {
          movement.push({
            column: piece.column + 1,
            row: piece.row + direction,
          });
        }
        return movement;
      }
      return [];
    },
  });

export const rook = (color: ChessColor) =>
  piece({
    color,
    type: "rook",
    move(state) {
      console.log(this.color);
      return [];
    },
  });

export const knight = (color: ChessColor) =>
  piece({
    color,
    type: "knight",
    move(state) {
      console.log(this.color);
      return [];
    },
  });

export const bishop = (color: ChessColor) =>
  piece({
    color,
    type: "bishop",
    move(state) {
      console.log(this.color);
      return [];
    },
  });

export const king = (color: ChessColor) =>
  piece({
    color,
    type: "king",
    move(state) {
      console.log(this.color);
      return [];
    },
  });

export const queen = (color: ChessColor) =>
  piece({
    color,
    type: "queen",
    move(state) {
      console.log(this.color);
      return [];
    },
  });

// TODO
// pawn en passant
// pawn blocked
// rook
// bishop
// knight
// queen
// king
