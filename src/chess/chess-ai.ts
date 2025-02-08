import type {
  ChessColor,
  Movement,
  PieceType,
  StockfishResponse,
} from "../types";
import type { ChessController } from "./chess-controller";

export class ChessAI {
  private isStarted = false;
  private color: ChessColor | null | undefined;
  private configName: string = "";
  constructor(private controller: ChessController) {
    this.configName = controller.getName();
    controller.addEventListener("promote", () => {
      if (this.isStarted) {
        this.configName === "Vanilla"
          ? this.executeStockfishMove()
          : this.execute();
      }
    });
    controller.addEventListener("afterMove", () => {
      if (this.isStarted) {
        this.configName === "Vanilla"
          ? this.executeStockfishMove()
          : this.execute();
      }
    });
  }
  start() {
    if (!this.isStarted) {
      this.isStarted = true;
      this.color = this.controller.getTurn();
      this.configName === "Vanilla"
        ? this.executeStockfishMove()
        : this.execute();
    }
  }
  private execute() {
    const opposite = this.color === "light" ? "dark" : "light";
    if (
      this.controller.getTurn() === this.color &&
      this.controller.getPromotions(opposite).length === 0
    ) {
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
  private parseRow(row: string): number {
    return this.controller.getRows() - parseInt(row);
  }
  private parseCol(col: string): number {
    return col.charCodeAt(0) - "a".charCodeAt(0);
  }
  private parsePromotion(input: string | null | undefined): PieceType {
    switch (input) {
      case "q":
        return "queen";
      case "n":
        return "knight";
      case "b":
        return "bishop";
      case "r":
        return "rook";
    }
    return "pawn";
  }
  private parseMoveString(moveStr: string): {
    movement: Movement;
    promotion: PieceType;
  } | null {
    if (moveStr.length !== 4 && moveStr.length !== 5) {
      console.error("Invalid move string format:", moveStr);
      return null;
    }
    const [fromCol, fromRow, toCol, toRow, promotesTo] = moveStr.split("");
    if (!fromCol || !fromRow || !toCol || !toRow) {
      console.error("Invalid move string format:", moveStr);
      return null;
    }
    const piece = this.controller.getPieceByCoordinates(
      this.parseRow(fromRow),
      this.parseCol(fromCol)
    );
    if (!piece) {
      console.error("No piece found at col, row:", fromCol, fromRow);
      return null;
    }
    const promotion = this.parsePromotion(promotesTo);
    const movement = piece.movement(this.controller).find((movement) => {
      return (
        movement.column === this.parseCol(toCol) &&
        movement.row === this.parseRow(toRow)
      );
    });
    return movement
      ? {
          movement,
          promotion,
        }
      : null;
  }
  private async executeStockfishMove(): Promise<void> {
    const promotedPawn = this.controller.getPromotedPawn();
    if (promotedPawn) {
      return;
    }
    if (this.controller.getTurn() !== this.color) {
      return;
    }
    try {
      const response = await this.getStockfishResponse();
      const moveParts = response.bestmove.split(" ");
      if (moveParts.length < 2) {
        console.error("Invalid move format in response:", response.bestmove);
        return;
      }
      const bestMove = moveParts[1];
      console.log(`Making move: ${bestMove}`);
      if (!bestMove) {
        console.error("No move found in response:", response.bestmove);
        return;
      }
      const { movement, promotion } = this.parseMoveString(bestMove) ?? {};
      if (!movement) return;
      console.log("Executing movement:", movement);
      this.controller.executeMovement(movement);
      if (promotion) {
        const pawn = this.controller.getPromotedPawn();
        const promotesTo = this.controller
          .getPromotions(this.color)
          .find((piece) => piece.type === promotion);
        if (pawn && promotesTo) {
          this.controller.promotePawn(pawn, promotesTo);
        }
      }
      // TODO PROMOTE
    } catch (error) {
      console.error("Error executing Stockfish move:", error);
    }
  }
  private async getStockfishResponse(): Promise<StockfishResponse> {
    const fen = this.controller.generateFEN();
    console.log("Current FEN:", fen);
    const params = {
      fen,
      depth: "10",
    };
    const queryString = new URLSearchParams(params).toString();
    const url = `https://stockfish.online/api/s/v2.php?${queryString}`;
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data: StockfishResponse = await response.json();
    console.log("Stockfish response:", data);
    return data;
  }
}
