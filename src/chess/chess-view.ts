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
import type { ChessController } from "./chess-controller";

export class ChessView {
  private context: CanvasRenderingContext2D;
  constructor(canvas: HTMLCanvasElement, private controller: ChessController) {
    canvas.onclick = this.onClick.bind(this);
    this.context = canvas.getContext("2d")!;
    canvas.style.border = `1px solid ${DARK}`;
    canvas.width = WIDTH * devicePixelRatio;
    canvas.height = HEIGHT * devicePixelRatio;
    canvas.style.width = `${WIDTH}px`;
    canvas.style.height = `${HEIGHT}px`;
    this.context.scale(devicePixelRatio, devicePixelRatio);
  }
  private onClick(event: MouseEvent) {
    if (this.controller.getGameState() === "active") {
      const x = event.offsetX;
      const y = event.offsetY;
      if (x >= 0 && y >= 0) {
        const column = Math.floor((x - NOTATION_SIZE) / TILE_SIZE);
        const row = Math.floor((y - NOTATION_SIZE) / TILE_SIZE);
        const pawn = this.controller.getPromotedPawn();
        if (pawn) {
          const promotions = this.controller.getPromotions(pawn.color);
          const cx = WIDTH / 2 - (promotions.length * TILE_SIZE) / 2;
          const cy = HEIGHT / 2 - TILE_SIZE / 2;
          const dx = x - cx;
          const index = Math.floor(dx / TILE_SIZE);
          const dy = y - cy;
          const promotion = promotions[index];
          if (promotion && dy < TILE_SIZE) {
            this.controller.promotePawn(pawn, promotion);
            return this.draw();
          }
        }
        const selected = this.controller.getSelectedPiece();
        if (selected) {
          const movement = selected
            .movement(this.controller)
            .find(
              (movement) => movement.column === column && movement.row === row
            );
          if (movement) {
            this.controller.executeMovement(movement);
            return this.draw();
          }
        }
        const piece = this.controller.getPieceByCoordinates(row, column);
        if (piece) {
          this.controller.setSelectedPiece(piece);
        } else {
          this.controller.setSelectedPiece(null);
        }
      }
    } else {
      this.controller.newGame();
    }
    this.draw();
  }
  private drawTiles() {
    this.context.fillStyle = DARK;
    this.context.strokeRect(
      NOTATION_SIZE,
      NOTATION_SIZE,
      8 * TILE_SIZE,
      8 * TILE_SIZE
    );
    for (let column = 0; column < 8; column++) {
      for (let row = 0; row < 8; row++) {
        this.context.fillStyle = (column + row) % 2 === 0 ? LIGHT : DARK;
        this.context.fillRect(
          column * TILE_SIZE + NOTATION_SIZE,
          row * TILE_SIZE + NOTATION_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }
  private drawNotation() {
    this.context.fillStyle = DARK;
    this.context.font = `${NOTATION_SIZE / 2}px sans-serif`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    FILES.forEach((file, index) => {
      const x = NOTATION_SIZE + TILE_SIZE / 2 + index * TILE_SIZE;
      const y = NOTATION_SIZE / 2;
      this.context.fillText(file, x, y);
      this.context.fillText(file, x, y + NOTATION_SIZE + TILE_SIZE * 8);
    });
    RANKS.forEach((rank, index) => {
      const x = NOTATION_SIZE / 2;
      const y = NOTATION_SIZE + TILE_SIZE / 2 + index * TILE_SIZE;
      this.context.fillText(rank, x + NOTATION_SIZE + TILE_SIZE * 8, y);
      this.context.fillText(rank, x, y);
    });
  }
  private drawPieces() {
    this.controller.getPieces().forEach((piece) => {
      const image = piece?.image;
      if (image?.complete) {
        const space = TILE_SIZE - PIECE_PADDING * 2;
        const scale = Math.min(space / image.width, space / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        this.context.drawImage(
          image,
          NOTATION_SIZE + TILE_SIZE / 2 - width / 2 + piece.column * TILE_SIZE,
          NOTATION_SIZE + TILE_SIZE / 2 - height / 2 + piece.row * TILE_SIZE,
          width,
          height
        );
      }
    });
  }
  private drawSelected() {
    const selected = this.controller.getSelectedPiece();
    if (selected) {
      this.context.fillStyle = "rgba(0, 255, 0, .7)";
      this.context.fillRect(
        NOTATION_SIZE + selected.column * TILE_SIZE,
        NOTATION_SIZE + selected.row * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
  private drawMovement() {
    const piece = this.controller.getSelectedPiece();
    piece?.movement(this.controller).forEach((movement) => {
      this.context.fillStyle = "rgba(126, 126, 126, .7)";
      this.context.beginPath();
      this.context.ellipse(
        NOTATION_SIZE + TILE_SIZE / 2 + movement.column * TILE_SIZE,
        NOTATION_SIZE + TILE_SIZE / 2 + movement.row * TILE_SIZE,
        TILE_SIZE / 4,
        TILE_SIZE / 4,
        0,
        0,
        2 * Math.PI
      );
      this.context.fill();
    });
  }
  private drawCheck() {
    const king = this.controller.getCheckedKing(this.controller.getTurn());
    if (king) {
      this.context.fillStyle = "rgba(255, 0, 0, .7)";
      this.context.fillRect(
        NOTATION_SIZE + king.column * TILE_SIZE,
        NOTATION_SIZE + king.row * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
  private ellipse(...args: Parameters<CanvasRenderingContext2D["ellipse"]>) {
    this.context.beginPath();
    this.context.ellipse(...args);
    this.context.closePath();
    this.context.fill();
    this.context.stroke();
  }
  private drawTurn() {
    this.context.strokeStyle = "black";
    this.context.fillStyle =
      this.controller.getTurn() === "light" ? LIGHT : DARK;
    const gap = 8 * TILE_SIZE + NOTATION_SIZE;
    this.ellipse(
      NOTATION_SIZE / 2,
      NOTATION_SIZE / 2,
      NOTATION_SIZE / 4,
      NOTATION_SIZE / 4,
      0,
      0,
      2 * Math.PI
    );
    this.ellipse(
      NOTATION_SIZE / 2 + gap,
      NOTATION_SIZE / 2,
      NOTATION_SIZE / 4,
      NOTATION_SIZE / 4,
      0,
      0,
      2 * Math.PI
    );
    this.ellipse(
      NOTATION_SIZE / 2,
      NOTATION_SIZE / 2 + gap,
      NOTATION_SIZE / 4,
      NOTATION_SIZE / 4,
      0,
      0,
      2 * Math.PI
    );
    this.ellipse(
      NOTATION_SIZE / 2 + gap,
      NOTATION_SIZE / 2 + gap,
      NOTATION_SIZE / 4,
      NOTATION_SIZE / 4,
      0,
      0,
      2 * Math.PI
    );
  }
  private drawPawnPromotion() {
    const pawn = this.controller.getPromotedPawn();
    if (pawn) {
      this.context.fillStyle = "rgba(0, 0, 0, .7)";
      this.context.fillRect(0, 0, WIDTH, HEIGHT);
      const promotions = this.controller.getPromotions(pawn.color);
      const cx = WIDTH / 2 - (promotions.length * TILE_SIZE) / 2;
      this.context.fillStyle = "white";
      this.context.fillRect(
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
        this.context.drawImage(
          image,
          cx + index * TILE_SIZE + TILE_SIZE / 4,
          HEIGHT / 2 - height / 2,
          width,
          height
        );
      });
    }
  }
  private drawEndGame() {
    const gameState = this.controller.getGameState();
    this.context.font = "bold 50px sans-serif";
    this.context.fillStyle = "black";
    this.context.strokeStyle = "white";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    if (gameState !== "active") {
      this.context.fillStyle = "rgba(0, 0, 0, .7)";
      this.context.fillRect(0, 0, WIDTH, HEIGHT);
      if (gameState === "dark_wins") {
        this.context.fillText("Black wins", WIDTH / 2, HEIGHT / 2);
        this.context.strokeText("Black wins", WIDTH / 2, HEIGHT / 2);
      } else if (gameState === "light_wins") {
        this.context.fillText("White wins", WIDTH / 2, HEIGHT / 2);
        this.context.strokeText("White wins", WIDTH / 2, HEIGHT / 2);
      } else if (gameState === "stalemate") {
        this.context.fillText("Stalemate", WIDTH / 2, HEIGHT / 2);
        this.context.strokeText("Stalemate", WIDTH / 2, HEIGHT / 2);
      }
    }
  }
  draw() {
    this.context.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawNotation();
    this.drawTiles();
    this.drawSelected();
    this.drawCheck();
    this.drawPieces();
    this.drawMovement();
    this.drawTurn();
    this.drawPawnPromotion();
    this.drawEndGame();
  }
  async main() {
    this.controller.newGame();
    await this.controller.waitForReady();
    this.draw();
  }
}
