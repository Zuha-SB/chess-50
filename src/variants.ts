import cloneDeep from "clone-deep";
import {
  atomicPiece,
  backRow,
  crazyPiece,
  emptyRow,
  getPromotions,
  hordePawns,
  king,
  pawn,
  pawns,
  raceBack,
  raceFront,
  randomBackRow,
} from "./chess";
import { ChessAI } from "./chess/chess-ai";
import { ChessController } from "./chess/chess-controller";
import { ChessView } from "./chess/chess-view";
import { HEIGHT, NOTATION_SIZE, SIDEBAR, TILE_SIZE, WIDTH } from "./constant";
import type { Drawable, PieceData, PieceType } from "./types";

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

const atomicChess = new ChessController({
  name: "Atomic",
  slug: "atomic",
  newGame() {
    return [
      backRow("dark").map(atomicPiece),
      pawns("dark").map(atomicPiece),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      pawns("light").map(atomicPiece),
      backRow("light").map(atomicPiece),
    ];
  },
  getPromotions(color) {
    return getPromotions(color).map(atomicPiece);
  },
  getGameState() {
    return this.detectMissingKings();
  },
});

const doubleMove = new ChessController({
  name: "Double Move Chess",
  slug: "double",
  turns: 2,
  getGameState() {
    return this.detectMissingKings();
  },
});

const tripleMove = new ChessController({
  name: "Triple Move Chess",
  slug: "triple",
  turns: 3,
  getGameState() {
    return this.detectMissingKings();
  },
});

const threeCheck = new ChessController({
  name: "Three Check",
  slug: "three",
  getGameState() {
    if (this.getChecks().light >= 3) {
      return "dark_wins";
    }
    if (this.getChecks().dark >= 3) {
      return "light_wins";
    }
    return "active";
  },
  onDraw(context) {
    context.fillStyle = "black";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(
      `${this.getChecks().light}`,
      WIDTH - SIDEBAR / 2,
      NOTATION_SIZE
    );
    context.textBaseline = "bottom";
    context.fillText(
      `${this.getChecks().dark}`,
      WIDTH - SIDEBAR / 2,
      HEIGHT - NOTATION_SIZE
    );
  },
});

const race = new ChessController({
  name: "Racing Kings",
  slug: "race",
  getGameState() {
    const king = Array.from({ length: 8 })
      .map((_, column) => this.getPieceByCoordinates(0, column))
      .find((piece) => piece?.type === "king");
    if (king) {
      return king.color === "dark" ? "dark_wins" : "light_wins";
    }
    return "active";
  },
  newGame() {
    return [
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      raceFront(),
      raceBack(),
    ];
  },
  removeIllegalMoves(movement, config) {
    if (config?.attacksOnly) {
      return movement;
    }
    return movement.filter((movement) => {
      const future = this.clone();
      future.executeMovement(cloneDeep(movement));
      const king =
        future.getCheckedKing("dark") || future.getCheckedKing("light");
      if (king) {
        return false;
      }
      return true;
    });
  },
});

const antichess = new ChessController({
  name: "Antichess",
  slug: "anti",
  hasCheck: false,
  // TODO DISABLE CASTLING
  getGameState() {
    const movements = this.getPieces()
      .filter((piece) => piece.color === this.getTurn())
      .flatMap((piece) => piece.movement(this));
    if (!movements.length) {
      return this.getTurn() === "light" ? "light_wins" : "dark_wins";
    }
    return "active";
  },
  removeIllegalMoves(movements, config) {
    if (config?.attacksOnly) {
      return movements;
    }
    const attacks = this.getAttacksAgainst(
      this.getTurn() === "light" ? "dark" : "light"
    );
    const hasAttack = attacks.find((cell) =>
      this.getPieceByCoordinates(cell.row, cell.column)
    );
    if (hasAttack) {
      return movements.filter((movement) =>
        movement.destinations.find((destination) =>
          this.getPieceByCoordinates(destination.row, destination.column)
        )
      );
    }
    return movements.filter((movement) => !movement.castle);
  },
  getPromotions(color) {
    return getPromotions(color).concat(king(color));
  },
});

const FONT_SIZE = 25;
const PADDING = 10;

const getCaptureStats = (controller: ChessController) => {
  const drawables: Array<Drawable<PieceData>> = [];
  let row = 0;
  const captures = controller.getCaptures();
  const x = PADDING + NOTATION_SIZE * 2 + TILE_SIZE * 8;
  for (const color of ["dark", "light"] as const) {
    drawables.push({
      type: "text",
      text: color,
      x,
      y: PADDING + FONT_SIZE * row,
      width: SIDEBAR - PADDING * 2,
      height: FONT_SIZE,
      fill: "black",
    });
    row++;
    Object.entries(captures[color]).forEach(([type, count]) => {
      drawables.push({
        type: "text",
        text: `${type} : ${count}`,
        x,
        y: PADDING + FONT_SIZE * row,
        width: SIDEBAR - PADDING * 2,
        height: FONT_SIZE,
        fill: "black",
        data: {
          color,
          count,
          type: type as PieceType,
        },
      });
      row++;
    });
    row++;
  }
  return drawables;
};

const crazyHouse = new ChessController({
  name: "Crazy House",
  slug: "crazy",
  onDraw(context) {
    context.textBaseline = "top";
    context.textAlign = "left";
    context.font = `${FONT_SIZE}px san-serif`;
    getCaptureStats(this).forEach((stat) => {
      if (stat.type === "text") {
        context.fillStyle = stat.fill;
        context.fillText(stat.text, stat.x, stat.y);
      }
    });
  },
  onClick(x, y) {
    const capturedPiece = getCaptureStats(this).find((capturedPiece) => {
      return (
        x >= capturedPiece.x &&
        y >= capturedPiece.y &&
        x < capturedPiece.x + capturedPiece.width &&
        y < capturedPiece.y + capturedPiece.height
      );
    });
    const color = capturedPiece?.data?.color;
    if (color && color !== this.getTurn()) {
      console.log(capturedPiece);
      const piece = crazyPiece(pawn(this.getTurn()));
      this.setPieceByCoordinates(piece, 0, 8);
      this.setSelectedPiece(piece);
    }
  },
});

export const controllers = [
  vanilla,
  kingOfTheHill,
  horde,
  chess960,
  atomicChess,
  doubleMove,
  tripleMove,
  threeCheck,
  race,
  antichess,
  crazyHouse,
];

export const start = () => {
  const aiBtn = document.querySelector<HTMLButtonElement>("#aiBtn")!;
  const undoBtn = document.querySelector<HTMLButtonElement>("#undoBtn")!;
  const redoBtn = document.querySelector<HTMLButtonElement>("#redoBtn")!;
  const newGameBtn = document.querySelector<HTMLButtonElement>("#newGameBtn")!;
  const canvas = document.querySelector("canvas")!;
  const slug = canvas.dataset.slug;
  const controller = controllers.find(
    (controller) => slug === controller.getSlug()
  );
  if (controller) {
    const view = new ChessView(canvas, controller);
    view.main();
    controller.addEventListener("afterMove", () => {
      view.draw();
    });
    const ai = new ChessAI(controller);
    aiBtn.onclick = () => {
      ai.start();
    };
    undoBtn.onclick = () => {
      controller.undo();
      view.draw();
    };
    redoBtn.onclick = () => {
      controller.redo();
      view.draw();
    };
    newGameBtn.onclick = () => {
      controller.newGame();
      view.draw();
    };
  }
};
