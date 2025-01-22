import type {
  BoardState,
  ChessColor,
  Move,
  MoveFunction,
  Piece,
  PieceType,
} from "./types";
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
        const movement: Move[] = [];
        const direction = this.color === "dark" ? 1 : -1;
        const forward = board.tiles[piece.row + direction][piece.column];
        const forward2 = board.tiles[piece.row + 2 * direction][piece.column];
        // HANDLE 2
        const startingLight = this.color === "light" && piece.row === 6;
        const startingDark = this.color === "dark" && piece.row === 1;
        if ((startingDark || startingLight) && !forward && !forward2) {
          movement.push({
            column: piece.column,
            row: piece.row + direction * 2,
          });
        }
        // HANDLE 1
        if (!forward) {
          movement.push({
            column: piece.column,
            row: piece.row + direction,
          });
        }
        const canEnPassant =
          (this.color === "light" && piece.row === 3) ||
          (this.color === "dark" && piece.row === 4);
        // HANDLE CAPTURE
        const forwardLeft =
          board.tiles[piece.row + direction][piece.column - 1];
        const left = board.tiles[piece.row][piece.column - 1];
        const leftPawnJustMoved =
          canEnPassant &&
          left?.type === "pawn" &&
          left.id === board.lastMovedId &&
          left.color !== this.color;
        if (forwardLeft && forwardLeft.color !== this.color) {
          movement.push({
            column: piece.column - 1,
            row: piece.row + direction,
          });
        }
        if (leftPawnJustMoved) {
          movement.push({
            column: piece.column - 1,
            row: piece.row + direction,
            captures: [
              {
                column: piece.column - 1,
                row: piece.row,
              },
            ],
          });
        }
        const forwardRight =
          board.tiles[piece.row + direction][piece.column + 1];
        const right = board.tiles[piece.row][piece.column + 1];
        const rightPawnJustMoved =
          canEnPassant &&
          right?.type === "pawn" &&
          right.id === board.lastMovedId &&
          right.color !== this.color;
        if (forwardRight && forwardRight.color !== this.color) {
          movement.push({
            column: piece.column + 1,
            row: piece.row + direction,
          });
        }
        if (rightPawnJustMoved) {
          movement.push({
            column: piece.column + 1,
            row: piece.row + direction,
            captures: [
              {
                row: piece.row,
                column: piece.column + 1,
              },
            ],
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
    move(board) {
      const piece = getPieceWithCoordinates(board, this.id);
      if (piece) {
        const movement: Move[] = [];
        movement.push(
          ...longMovement(
            board,
            piece.column,
            piece.row,
            1,
            0,
            piece.piece.color
          )
        );
        movement.push(
          ...longMovement(
            board,
            piece.column,
            piece.row,
            -1,
            0,
            piece.piece.color
          )
        );
        movement.push(
          ...longMovement(
            board,
            piece.column,
            piece.row,
            0,
            1,
            piece.piece.color
          )
        );
        movement.push(
          ...longMovement(
            board,
            piece.column,
            piece.row,
            0,
            -1,
            piece.piece.color
          )
        );
        console.log(movement);
        return movement;
      }
      return [];
    },
  });

const longMovement = (
  board: BoardState,
  column: number,
  row: number,
  columnMovement: number,
  rowMovement: number,
  color: ChessColor
) => {
  const movement: Move[] = [];
  for (let offset = 1; offset < 8; offset++) {
    const offsetRow = row + offset * rowMovement;
    const offsetColumn = column + offset * columnMovement;
    if (
      offsetRow < 0 ||
      offsetColumn < 0 ||
      offsetRow >= 8 ||
      offsetColumn >= 8
    ) {
      break;
    }
    const blocker = board.tiles[offsetRow][offsetColumn];
    if (blocker?.color !== color) {
      movement.push({
        row: offsetRow,
        column: offsetColumn,
      });
    }
    if (blocker) {
      break;
    }
  }
  return movement;
};

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
// bishop
// knight
// queen
// king
// CHECK / CHECKMATE / STALEMATE
