import { filterNull } from "../chess";
import { ChessController } from "../chess/chess-controller";
import { ChessView } from "../chess/chess-view";

const canvas = document.querySelector("canvas")!;
const controller = new ChessController({
  getGameState() {
    const king = [
      this.getPieceByCoordinates(3, 3),
      this.getPieceByCoordinates(3, 4),
      this.getPieceByCoordinates(4, 3),
      this.getPieceByCoordinates(4, 4),
    ].find((piece) => piece?.type === "king");
    if (king) {
      return king.color === "light" ? "light_wins" : "dark_wins";
    }
    return "active";
  },
});
const view = new ChessView(canvas, controller);

view.main();
