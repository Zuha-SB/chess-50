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
  knight,
  queen,
  rook,
  filterNull,
  getCheckedKing,
  executeMovement,
  getPromotedPawn,
  getGameState,
  newGame,
} from "../chess";

// CANVAS
const canvas = document.querySelector("canvas")!;
const context = canvas.getContext("2d")!;
canvas.style.border = `1px solid ${DARK}`;
canvas.width = WIDTH * devicePixelRatio;
canvas.height = HEIGHT * devicePixelRatio;
canvas.style.width = `${WIDTH}px`;
canvas.style.height = `${HEIGHT}px`;
context.scale(devicePixelRatio, devicePixelRatio);

let board = newGame();

canvas.onclick = (event) => {
  if (getGameState(board) === "active") {
    const selectedId = board.selectedId;
    board.selectedId = "";
    const rect = canvas.getBoundingClientRect();
    const x = event.pageX - rect.x - NOTATION_SIZE;
    const y = event.pageY - rect.y - NOTATION_SIZE;
    if (x >= 0 && y >= 0) {
      const column = Math.floor(x / TILE_SIZE);
      const row = Math.floor(y / TILE_SIZE);
      const pawn = getPromotedPawn(board);
      if (pawn) {
        const promotions = getPromotions();
        const cx = WIDTH / 2 - (promotions.length * TILE_SIZE) / 2;
        const cy = HEIGHT / 2 - TILE_SIZE / 2;
        const dx = x - cx;
        const index = Math.floor(dx / TILE_SIZE);
        const dy = y - cy;
        if ((index >= 0 || index < promotions.length) && dy < TILE_SIZE) {
          const promotion = promotions[index]!;
          board.tiles[pawn.row]![pawn.column] = promotion;
          promotion.column = pawn.column;
          promotion.row = pawn.row;
        }
      }
      const selected = getPieceById(board, selectedId);
      if (selected) {
        const movement = selected
          .movement(board)
          .find(
            (movement) => movement.column === column && movement.row === row
          );
        if (movement) {
          executeMovement(board, selected, movement);
        }
      }
      const piece = board.tiles[row]?.[column];
      if (piece?.color === board.turn) {
        const movement = piece.movement(board);
        if (movement.length) {
          board.selectedId = piece.id;
        }
      }
    }
  } else {
    board = newGame();
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
  context.font = `${NOTATION_SIZE / 2}px sans-serif`;
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
  piece?.movement(board).forEach((movement) => {
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
  const king = getCheckedKing(board);
  if (king) {
    context.fillStyle = "rgba(255, 0, 0, .7)";
    context.fillRect(
      NOTATION_SIZE + king.column * TILE_SIZE,
      NOTATION_SIZE + king.row * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  }
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

const getPromotions = () => {
  const color = board.turn === "light" ? "dark" : "light";
  return [knight(color), bishop(color), rook(color), queen(color)];
};

const drawPawnPromotion = () => {
  const pawn = getPromotedPawn(board);
  if (pawn) {
    context.fillStyle = "rgba(0, 0, 0, .7)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    const promotions = getPromotions();
    const cx = WIDTH / 2 - (promotions.length * TILE_SIZE) / 2;
    context.fillStyle = "white";
    context.fillRect(
      cx,
      HEIGHT / 2 - TILE_SIZE / 2,
      TILE_SIZE * promotions.length,
      TILE_SIZE
    );
    promotions.forEach((promotion, index) => {
      const image = promotion.image;
      const space = TILE_SIZE - PIECE_PADDING * 2;
      const scale = Math.min(space / image.width, space / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(
        image,
        cx + index * TILE_SIZE + TILE_SIZE / 4,
        HEIGHT / 2 - height / 2,
        width,
        height
      );
    });
  }
};

const drawEndGame = () => {
  const gameState = getGameState(board);
  context.font = "bold 50px sans-serif";
  context.fillStyle = "black";
  context.strokeStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  if (gameState !== "active") {
    context.fillStyle = "rgba(0, 0, 0, .7)";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    if (gameState === "dark_wins") {
      context.fillText("Black wins", WIDTH / 2, HEIGHT / 2);
      context.strokeText("Black wins", WIDTH / 2, HEIGHT / 2);
    } else if (gameState === "light_wins") {
      context.fillText("White wins", WIDTH / 2, HEIGHT / 2);
      context.strokeText("White wins", WIDTH / 2, HEIGHT / 2);
    } else if (gameState === "stalemate") {
      context.fillText("Stalemate", WIDTH / 2, HEIGHT / 2);
      context.strokeText("Stalemate", WIDTH / 2, HEIGHT / 2);
    }
  }
};

const draw = () => {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawNotation();
  drawTiles();
  drawSelected();
  drawCheck();
  drawPieces();
  drawMovement();
  drawTurn();
  drawPawnPromotion();
  drawEndGame();
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
