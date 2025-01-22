import { bishop, king, knight, pawn, queen, rook } from "../pieces";
import type { BoardState, ChessColor } from "../types";

// CONSTANTS
const DARK = "black";
const LIGHT = "white";
const TILE_SIZE = 70;
const NOTATION_SIZE = TILE_SIZE / 2;
const PIECE_PADDING = TILE_SIZE / 4;
// Files: Vertical columns labeled from "a" to "h" from left to right
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
// Ranks: Horizontal rows numbered from "1" to "8" from bottom to top.
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// CANVAS
const canvas = document.querySelector("canvas")!;
const context = canvas.getContext("2d")!;
canvas.style.border = `1px solid ${DARK}`;
canvas.width = TILE_SIZE * 8 + NOTATION_SIZE * 2;
canvas.height = TILE_SIZE * 8 + NOTATION_SIZE * 2;

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

const EMPTY_ROW = Array.from({ length: 8 }).map(() => null);

const board: BoardState = {
  lastMovedId: "",
  tiles: [
    backRow("dark"),
    Array.from({ length: 8 }).map(() => pawn("dark")),
    EMPTY_ROW,
    EMPTY_ROW,
    EMPTY_ROW,
    EMPTY_ROW,
    Array.from({ length: 8 }).map(() => pawn("light")),
    backRow("light"),
  ],
};

const drawTiles = () => {
  context.fillStyle = DARK;
  context.strokeRect(
    NOTATION_SIZE,
    NOTATION_SIZE,
    8 * TILE_SIZE,
    8 * TILE_SIZE
  );
  for (let column = 0; column < 8; column++) {
    for (let row = 0; row < 8; row++) {
      context.fillStyle = (column + row) % 2 === 0 ? LIGHT : DARK;
      context.fillRect(
        column * TILE_SIZE + NOTATION_SIZE,
        row * TILE_SIZE + NOTATION_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
};

const drawNotation = () => {
  context.fillStyle = DARK;
  context.font = `${NOTATION_SIZE / 2} sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  FILES.forEach((file, index) => {
    const x = NOTATION_SIZE + TILE_SIZE / 2 + index * TILE_SIZE;
    const y = NOTATION_SIZE / 2;
    context.fillText(file, x, y);
    context.fillText(file, x, y + NOTATION_SIZE + TILE_SIZE * 8);
  });
  RANKS.forEach((rank, index) => {
    const x = NOTATION_SIZE / 2;
    const y = NOTATION_SIZE + TILE_SIZE / 2 + index * TILE_SIZE;
    context.fillText(rank, x + NOTATION_SIZE + TILE_SIZE * 8, y);
    context.fillText(rank, x, y);
  });
};

const drawBoard = () => {
  board.tiles.forEach((row, rowIndex) => {
    row.forEach((piece, columnIndex) => {
      const image = piece?.image;
      if (image?.complete) {
        const space = TILE_SIZE - PIECE_PADDING * 2;
        const scale = Math.min(space / image.width, space / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(
          image,
          NOTATION_SIZE + TILE_SIZE / 2 - width / 2 + columnIndex * TILE_SIZE,
          NOTATION_SIZE + TILE_SIZE / 2 - height / 2 + rowIndex * TILE_SIZE,
          width,
          height
        );
      }
    });
  });
};

const draw = () => {
  drawTiles();
  drawNotation();
  drawBoard();
};

setInterval(draw, 1000 / 60);
