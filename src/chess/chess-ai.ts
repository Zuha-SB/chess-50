import type { ChessColor } from "../types";
import type { ChessController } from "./chess-controller";

export class ChessAI {
  private isStarted = false;
  private color: ChessColor | null | undefined;
  constructor(private controller: ChessController) {
    controller.addEventListener("afterMove", () => {
      if (this.isStarted) {
        this.execute();
      }
    });
  }
  start() {
    if (!this.isStarted) {
      this.isStarted = true;
      this.color = this.controller.getTurn();
      this.execute();
    }
  }
  private execute() {
    if (this.controller.getTurn() === this.color) {
      const movements = this.controller
        .getPieces()
        .filter((piece) => piece.color === this.color)
        .flatMap((piece) => piece.movement(this.controller));
      const movement = movements[Math.floor(Math.random() * movements.length)];
      if (movement) {
        this.controller.executeMovement(movement);
      }
    }
  }
}
