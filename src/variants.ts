import {
  backRow,
  emptyRow,
  hordePawns,
  pawn,
  pawns,
  randomBackRow,
} from "./chess";
import { ChessController } from "./chess/chess-controller";
import { ChessView } from "./chess/chess-view";

const vanilla = new ChessController({
  name: "Vanilla",
  slug: "vanila",
});

const kingOfTheHill = new ChessController({
  name: "King of the Hill",
  slug: "koth",
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

const horde = new ChessController({
  name: "Horde",
  slug: "horde",
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
      hordePawns("light"),
    ];
  },
});

const chess960 = new ChessController({
  name: "960",
  slug: "960",
  newGame() {
    const lightBackrow = randomBackRow("light");
    return [
      lightBackrow.map((piece) => piece.withColor("dark")),
      pawns("dark"),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      pawns("light"),
      lightBackrow,
    ];
  },
});

export const controllers = [vanilla, kingOfTheHill, horde, chess960];

export const start = () => {
  const canvas = document.querySelector("canvas")!;
  const slug = canvas.dataset.slug;
  const controller = controllers.find(
    (controller) => slug === controller.getSlug()
  );
  if (controller) {
    controller.newGame();
    const view = new ChessView(canvas, controller);
    view.main();
  }
};
