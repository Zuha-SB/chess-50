import { ChessController } from "../chess/chess-controller";
import { ChessView } from "../chess/chess-view";

const canvas = document.querySelector("canvas")!;
const controller = new ChessController();
const view = new ChessView(canvas, controller);

view.main();
