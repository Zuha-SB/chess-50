import cloneDeep from "clone-deep";
import {
  atomicPiece,
  backRow,
  circePiece,
  crazyPiece,
  duck,
  emptyRow,
  getPromotions,
  hordePawns,
  king,
  pawn,
  pawns,
  pieceMap,
  queen,
  raceBack,
  raceFront,
  randomBackRow,
} from "./chess";
import { ChessAI } from "./chess/chess-ai";
import { ChessController } from "./chess/chess-controller";
import { ChessView } from "./chess/chess-view";
import { HEIGHT, NOTATION_SIZE, SIDEBAR, TILE_SIZE, WIDTH } from "./constant";
import type { Cell, Drawable, GameState, PieceData, PieceType } from "./types";

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
    return getPromotions(color)
      .concat(king(color))
      .map((piece) => {
        piece.isPromoted = true;
        return piece;
      });
  },
});

const FONT_SIZE = 25;
const PADDING = 10;

const getCaptureStats = (controller: ChessController) => {
  const selected = controller.getSelectedPiece();
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
      if (selected?.type === "crazy") {
        const piece = selected.movement(controller)[0]?.destinations[0]?.piece;

        if (piece?.type === type && piece.color !== color) {
          drawables.push({
            type: "rect",
            x,
            y: PADDING + FONT_SIZE * row,
            width: SIDEBAR - PADDING * 2,
            height: FONT_SIZE,
            fill: "rgba(0, 255, 0, .7)",
          });
        }
      }
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
      context.fillStyle = stat.fill;
      if (stat.type === "text") {
        context.fillText(stat.text || "", stat.x, stat.y);
      } else if (stat.type === "rect") {
        context.fillRect(stat.x, stat.y, stat.width, stat.height);
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
    const { color, type } = capturedPiece?.data || {};
    if (type && color && color !== this.getTurn()) {
      const piece = crazyPiece(pieceMap[type](this.getTurn()));
      this.setSelectedPiece(piece);
      return true;
    }
    return false;
  },
  executeMovement(movement) {
    if (movement.isCrazy) {
      const type = movement.destinations[0]?.piece.type;
      if (type) {
        this.getCaptures()[this.getTurn()][type]--;
      }
    }
  },
});

const duckChess = new ChessController({
  name: "Duck Chess",
  slug: "duck",
  turns: 2,
  canLightFullyMove: true,
  hasCheck: false,
  getSelectedPiece() {
    const quack =
      this.getPieces().find((piece) => piece.type === "duck") || duck();
    return this.getTurns() === 1 ? quack : null;
  },
  removeIllegalMoves(movements) {
    const duck = this.getPieces().find((piece) => piece.type === "duck");
    return duck
      ? movements
          .map((movement) => {
            return {
              ...movement,
              destinations: movement.destinations.filter(
                (destination) =>
                  destination.row !== duck.row ||
                  destination.column !== duck.column
              ),
            };
          })
          .filter((movement) => movement.destinations.length)
      : movements;
  },
  getGameState() {
    const movements = this.getPieces()
      .filter((piece) => piece.color === this.getTurn())
      .flatMap((piece) => piece.movement(this));
    if (!movements.length) {
      return this.getTurn() === "light" ? "light_wins" : "dark_wins";
    }
    return this.detectMissingKings();
  },
});

const circe = new ChessController({
  name: "Circe",
  slug: "circe",
  newGame() {
    return [
      backRow("dark").map(circePiece),
      pawns("dark").map(circePiece),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      pawns("light").map(circePiece),
      backRow("light").map(circePiece),
    ];
  },
  getPromotions(color) {
    return getPromotions(color).map(circePiece);
  },
});

const findFourOfAKing = (
  states: GameState[],
  controller: ChessController,
  callback: (index: number) => Cell
) => {
  let light = 0;
  let dark = 0;
  for (let index = 0; index < 5; index++) {
    const cell = callback(index);
    const piece = controller.getPieceByCoordinates(cell.row, cell.column);
    if (piece?.color === "light") {
      light++;
    } else {
      light = 0;
    }
    if (piece?.color === "dark") {
      dark++;
    } else {
      dark = 0;
    }
    if (light >= 4) {
      states.push("light_wins");
      return;
    }
    if (dark >= 4) {
      states.push("dark_wins");
      return;
    }
  }
};

const queens = new ChessController({
  name: "All Queens",
  slug: "queens",
  getGameState() {
    // CHECK COLUMNS
    const states: GameState[] = [];
    for (let column = 0; column < 5; column++) {
      findFourOfAKing(states, this, (row) => ({
        row,
        column,
      }));
    }
    for (let row = 0; row < 5; row++) {
      findFourOfAKing(states, this, (column) => ({
        row,
        column,
      }));
    }
    findFourOfAKing(states, this, (diagonal) => ({
      row: diagonal,
      column: diagonal,
    }));
    findFourOfAKing(states, this, (diagonal) => ({
      row: 4 - diagonal,
      column: diagonal,
    }));

    return states[0] || "active";
  },
  newGame() {
    return [
      [
        queen("dark"),
        queen("light"),
        queen("dark"),
        queen("light"),
        queen("dark"),
      ],
      emptyRow(5),
      [queen("light"), null, null, null, queen("dark")],
      emptyRow(5),
      [
        queen("light"),
        queen("dark"),
        queen("light"),
        queen("dark"),
        queen("light"),
      ],
    ];
  },
  rows: 5,
  columns: 5,
  removeIllegalMoves(movements) {
    return movements
      .map((movement) => {
        movement.destinations = movement.destinations.filter(
          (destination) =>
            !this.getPieceByCoordinates(destination.row, destination.column)
        );
        return movement;
      })
      .filter((movement) => movement.destinations.length);
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
  duckChess,
  circe,
  queens,
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
