import {
  DARK,
  FILES,
  HEIGHT,
  LIGHT,
  NOTATION_SIZE,
  PIECE_PADDING,
  RANKS,
  TILE_SIZE,
  WIDTH,
} from "../constant";
import {
  getPieceById,
  bishop,
  getAttacks,
  king,
  knight,
  pawn,
  queen,
  rook,
  filterNull,
  getCheckedKings,
} from "../chess";
import type { BoardState, ChessColor, Piece } from "../types";

// CANVAS
const canvas = document.querySelector("canvas")!;
const context = canvas.getContext("2d")!;
canvas.style.border = `1px solid ${DARK}`;
canvas.width = WIDTH * devicePixelRatio;
canvas.height = HEIGHT * devicePixelRatio;
canvas.style.width = `${WIDTH}px`;
canvas.style.height = `${HEIGHT}px`;
context.scale(devicePixelRatio, devicePixelRatio);

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

const board: BoardState = {
  turn: "light",
  selectedId: "",
  enPassantId: "",
  light: {
    canKingSideCastle: true,
    canQueenSideCastle: true,
  },
  dark: {
    canKingSideCastle: true,
    canQueenSideCastle: true,
  },
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

canvas.onclick = (event) => {
  const selectedId = board.selectedId;
  board.selectedId = "";
  const rect = canvas.getBoundingClientRect();
  const x = event.pageX - rect.x - NOTATION_SIZE;
  const y = event.pageY - rect.y - NOTATION_SIZE;
  if (x >= 0 && y >= 0) {
    const column = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    // TODO MOVE
    const selected = getPieceById(board, selectedId);
    if (selected) {
      const movement = selected
        .move(board)
        .find((move) => move.column === column && move.row === row);
      if (movement) {
        board.tiles[selected.row]![selected.column] = null;
        board.tiles[row]![column] = selected;
        selected.row = row;
        selected.column = column;
        board.turn = board.turn === "light" ? "dark" : "light";
        board.enPassantId = movement.enPassant ? selectedId : "";
        if (selected.type === "rook") {
          board[selected.color].canKingSideCastle &&=
            movement.breaksKingSideCastle !== true;
          board[selected.color].canQueenSideCastle &&=
            movement.breaksQueenSideCastle !== true;
        }
        if (selected.type === "king") {
          board[selected.color].canKingSideCastle = false;
          board[selected.color].canQueenSideCastle = false;
        }
        movement.captures?.forEach((capture) => {
          board.tiles[capture.row]![capture.column] = null;
        });
        movement.movements?.forEach((movement) => {
          const extraMovement =
            board.tiles[movement.from.row]?.[movement.from.column];
          if (extraMovement) {
            board.tiles[movement.to.row]![movement.to.column] = extraMovement;
            board.tiles[movement.from.row]![movement.from.column] = null;
            extraMovement.row = movement.to.row;
            extraMovement.column = movement.to.column;
          }
        });
      }
    }
    const piece = board.tiles[row]?.[column];
    if (piece?.color === board.turn) {
      const move = piece.move(board);
      if (move.length) {
        board.selectedId = piece.id;
      }
    }
  }
  draw();
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

const drawPieces = () => {
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

const drawSelected = () => {
  const selected = getPieceById(board, board.selectedId);
  if (selected) {
    context.fillStyle = "rgba(0, 255, 0, .7)";
    context.fillRect(
      NOTATION_SIZE + selected.column * TILE_SIZE,
      NOTATION_SIZE + selected.row * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  }
};

const drawMovement = () => {
  const piece = getPieceById(board, board.selectedId);
  piece?.move(board).forEach((movement) => {
    context.fillStyle = "rgba(126, 126, 126, .7)";
    context.beginPath();
    context.ellipse(
      NOTATION_SIZE + TILE_SIZE / 2 + movement.column * TILE_SIZE,
      NOTATION_SIZE + TILE_SIZE / 2 + movement.row * TILE_SIZE,
      TILE_SIZE / 4,
      TILE_SIZE / 4,
      0,
      0,
      2 * Math.PI
    );
    context.fill();
  });
};

const drawCheck = () => {
  getCheckedKings(board).forEach((king) => {
    context.fillStyle = "rgba(255, 0, 0, .7)";
    context.fillRect(
      NOTATION_SIZE + king.column * TILE_SIZE,
      NOTATION_SIZE + king.row * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  });
};

const ellipse = (...args: Parameters<CanvasRenderingContext2D["ellipse"]>) => {
  context.beginPath();
  context.ellipse(...args);
  context.closePath();
  context.fill();
  context.stroke();
};

const drawTurn = () => {
  context.strokeStyle = "black";
  context.fillStyle = board.turn === "light" ? LIGHT : DARK;
  const gap = 8 * TILE_SIZE + NOTATION_SIZE;
  ellipse(
    NOTATION_SIZE / 2,
    NOTATION_SIZE / 2,
    NOTATION_SIZE / 4,
    NOTATION_SIZE / 4,
    0,
    0,
    2 * Math.PI
  );
  ellipse(
    NOTATION_SIZE / 2 + gap,
    NOTATION_SIZE / 2,
    NOTATION_SIZE / 4,
    NOTATION_SIZE / 4,
    0,
    0,
    2 * Math.PI
  );
  ellipse(
    NOTATION_SIZE / 2,
    NOTATION_SIZE / 2 + gap,
    NOTATION_SIZE / 4,
    NOTATION_SIZE / 4,
    0,
    0,
    2 * Math.PI
  );
  ellipse(
    NOTATION_SIZE / 2 + gap,
    NOTATION_SIZE / 2 + gap,
    NOTATION_SIZE / 4,
    NOTATION_SIZE / 4,
    0,
    0,
    2 * Math.PI
  );
};

const draw = () => {
  drawNotation();
  drawTiles();
  drawSelected();
  drawCheck();
  drawPieces();
  drawMovement();
  drawTurn();
};

const drawAfterWaiting = async () => {
  const pieces = board.tiles.flat().filter(filterNull);
  await Promise.all(
    pieces.map((piece) => {
      if (!piece.image.complete) {
        return new Promise((resolve) => {
          piece.image.addEventListener("load", resolve);
        });
      }
    })
  );
  draw();
};

drawAfterWaiting();
