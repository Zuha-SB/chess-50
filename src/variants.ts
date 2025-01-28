import cloneDeep from "clone-deep";
import {
  atomic,
  backRow,
  capablancaBackRow,
  circePiece,
  crazyPiece,
  dragonFlyBackrow,
  duck,
  emptyRow,
  getPromotions,
  gothicBackRow,
  hordePawns,
  king,
  pawn,
  pawns,
  pieceMap,
  queen,
  raceBack,
  raceFront,
  randomBackRow,
  soliders,
  traitor,
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
      backRow("dark").map(atomic),
      pawns("dark").map(atomic),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      pawns("light").map(atomic),
      backRow("light").map(atomic),
    ];
  },
  getPromotions(color) {
    return getPromotions(color).map(atomic);
  },
  getGameState() {
    return this.detectMissingKings();
  },
});

const doubleMove = new ChessController({
  name: "Double Move Chess",
  slug: "double",
  getTurns: () => 2,
  getGameState() {
    return this.detectMissingKings();
  },
});

const tripleMove = new ChessController({
  name: "Triple Move Chess",
  slug: "triple",
  getTurns: () => 3,
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

const getCaptureStats = (controller: ChessController, allowed: PieceType[]) => {
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
      if (allowed.includes(type as PieceType)) {
        if (selected?.type === "crazy") {
          const piece =
            selected.movement(controller)[0]?.destinations[0]?.piece;

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
      }
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
    getCaptureStats(this, ["pawn", "knight", "bishop", "queen"]).forEach(
      (stat) => {
        context.fillStyle = stat.fill;
        if (stat.type === "text") {
          context.fillText(stat.text || "", stat.x, stat.y);
        } else if (stat.type === "rect") {
          context.fillRect(stat.x, stat.y, stat.width, stat.height);
        }
      }
    );
  },
  onClick(x, y) {
    const capturedPiece = getCaptureStats(this, [
      "pawn",
      "knight",
      "bishop",
      "queen",
    ]).find((capturedPiece) => {
      return (
        x >= capturedPiece.x &&
        y >= capturedPiece.y &&
        x < capturedPiece.x + capturedPiece.width &&
        y < capturedPiece.y + capturedPiece.height &&
        capturedPiece.data?.count
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
  getTurns: () => 2,
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

const progressive = new ChessController({
  name: "Progressive",
  slug: "progressive",
  getGameState() {
    return this.detectMissingKings();
  },
  getTurns(newGame: boolean) {
    return newGame ? 1 : this.getWholeMoves() + 1;
  },
});

const gothic = new ChessController({
  name: "Gothic",
  slug: "gothic",
  columns: 10,
  newGame() {
    return [
      gothicBackRow("dark"),
      pawns("dark", 10),
      emptyRow(10),
      emptyRow(10),
      emptyRow(10),
      emptyRow(10),
      pawns("light", 10),
      gothicBackRow("light"),
    ];
  },
});

const traitorChess = new ChessController({
  name: "Traitor",
  slug: "traitor",
  newGame() {
    return [
      backRow("dark"),
      pawns("dark").map(traitor),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      pawns("light").map(traitor),
      backRow("light"),
    ];
  },
});

const checkless = new ChessController({
  name: "Checkless",
  slug: "checkless",
  removeIllegalMoves(movements, config) {
    if (config?.attacksOnly) {
      return movements;
    }
    return movements.filter((movement) => {
      const future = this.clone();
      future.executeMovement(cloneDeep(movement));
      const isCheck = future.getCheckedKing(future.getTurn());
      if (isCheck) {
        const movements = future
          .getPieces()
          .filter((piece) => piece.color === future.getTurn())
          .flatMap((piece) => piece.movement(future, config));
        const isCheckmate = !movements.length;
        return isCheckmate;
      }
      return true;
    });
  },
});

const dragonfly = new ChessController({
  name: "Dragonfly",
  slug: "dragonfly",
  rows: 7,
  columns: 7,
  castleFromTheLeft: 1,
  getPromotions(color) {
    const opposite = color == "dark" ? "light" : "dark";
    return Object.entries(this.getCaptures()[opposite])
      .filter(
        ([type, count]) =>
          count > 0 && ["knight", "bishop", "rook", "queen"].includes(type)
      )
      .map(([key]) => pieceMap[key as PieceType](color));
  },
  newGame() {
    return [
      dragonFlyBackrow("dark"),
      soliders("dark", 7),
      emptyRow(7),
      emptyRow(7),
      emptyRow(7),
      soliders("light", 7),
      dragonFlyBackrow("light"),
    ];
  },
  onDraw(context) {
    context.textBaseline = "top";
    context.textAlign = "left";
    context.font = `${FONT_SIZE}px san-serif`;
    getCaptureStats(this, ["knight", "bishop", "queen"]).forEach((stat) => {
      context.fillStyle = stat.fill;
      if (stat.type === "text") {
        context.fillText(stat.text || "", stat.x, stat.y);
      } else if (stat.type === "rect") {
        context.fillRect(stat.x, stat.y, stat.width, stat.height);
      }
    });
  },
  onClick(x, y) {
    const capturedPiece = getCaptureStats(this, [
      "knight",
      "bishop",
      "rook",
      "queen",
    ]).find((capturedPiece) => {
      return (
        x >= capturedPiece.x &&
        y >= capturedPiece.y &&
        x < capturedPiece.x + capturedPiece.width &&
        y < capturedPiece.y + capturedPiece.height &&
        capturedPiece.data?.count
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
  removeIllegalMoves(movements) {
    const filtered = movements.filter((movement) => {
      movement.destinations = movement.destinations.filter((destination) => {
        const { piece, row } = destination;
        if (piece.type === "pawn")
          if (row % 6 === 0) {
            const promotions = this.getPromotions(piece.color);
            if (!promotions.length) {
              return false;
            }
          }
        return true;
      });
      return movement.destinations.length;
    });
    return filtered;
  },
});
dragonfly.addEventListener("promote", (e) => {
  const piece = e?.promotion;
  if (piece) {
    dragonfly.getCaptures()[dragonfly.getTurn()][piece.type]--;
  }
});

const capablanca = new ChessController({
  name: "Capablanca",
  slug: "capablanca",
  columns: 10,
  newGame() {
    return [
      capablancaBackRow("dark"),
      pawns("dark", 10),
      emptyRow(10),
      emptyRow(10),
      emptyRow(10),
      emptyRow(10),
      pawns("light", 10),
      capablancaBackRow("light"),
    ];
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
  progressive,
  gothic,
  traitorChess,
  checkless,
  dragonfly,
  capablanca,
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
