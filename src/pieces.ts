import type { ChessColor, MoveFunction, Piece, PieceType } from "./types";

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
  };
};

export const pawn = (color: ChessColor) =>
  piece({
    color,
    type: "pawn",
    move(state) {
      console.log(this.color);
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
