import type { ChessColor, Movement, StockfishResponse } from "../types";
import type { ChessController } from "./chess-controller";

export class ChessAI {
  private isStarted = false;
  private color: ChessColor | null | undefined;
  private configName: string = "";
  constructor(private controller: ChessController) {
    this.configName = controller.getConfigName();
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
  private parseRow(row: string): number {
    return this.controller.getRows() - parseInt(row);
  }
  private parseCol(col: string): number {
    return col.charCodeAt(0) - "a".charCodeAt(0);
  }
  private parseMoveString(moveStr: string): Movement | null {
    if (moveStr.length !== 4) {
      console.error("Invalid move string format:", moveStr);
      return null;
    }
    const [fromCol, fromRow, toCol, toRow] = moveStr.split("");
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
    return {
      column: this.parseCol(toCol),
      row: this.parseRow(toRow),
      destinations: [
        {
          column: this.parseCol(toCol),
          row: this.parseRow(toRow),
          piece,
        },
      ],
    };
  }
  private async executeStockfishMove(): Promise<void> {
    if (this.controller.getTurn() !== this.color) return;
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
      const movement = this.parseMoveString(bestMove);
      if (!movement) return;
      console.log("Executing movement:", movement);
      this.controller.executeMovement(movement);
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
