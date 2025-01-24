import { king, pawn } from "../chess";
import {
  backRow,
  ChessController,
  emptyRow,
  pawns,
} from "../chess/chess-controller";
import { ChessView } from "../chess/chess-view";

const canvas = document.querySelector("canvas")!;
const controller = new ChessController({
  newGame() {
    return [
      backRow("dark"),
      pawns("dark"),
      emptyRow(),
      [
        null,
        pawn("light"),
        pawn("light"),
        null,
        null,
        pawn("light"),
        pawn("light"),
        null,
      ],
      pawns("light"),
      pawns("light"),
      pawns("light"),
      pawns("light"),
    ];
  },
});
const view = new ChessView(canvas, controller);

view.main();
