import cloneDeep from "clone-deep";
import type { ChessController } from "./chess/chess-controller";
import type {
  Cell,
  CellPiece,
  ChessColor,
  Movement,
  MovementFunction,
  Piece,
  PieceType,
} from "./types";

export const randomBackRow = (color: ChessColor) => {
  const row: Array<Piece> = [];
  // king must be between the 2 rooks
  const taken = new Set<number>([]);
  const kingPosition = 1 + Math.floor(Math.random() * 6);
  const leftRookPosition = Math.floor(Math.random() * kingPosition);
  const rightRookPosition =
    kingPosition + 1 + Math.floor(Math.random() * (7 - kingPosition));
  row[kingPosition] = king(color);
  row[leftRookPosition] = rook(color);
  row[rightRookPosition] = rook(color);
  taken.add(kingPosition);
  taken.add(leftRookPosition);
  taken.add(rightRookPosition);
  // bishops must be on different colors
  const lightBishopPosition = shuffle(
    Array.from({ length: 4 })
      .map((_, index) => index * 2)
      .filter((index) => !taken.has(index))
  )[0]!;
  row[lightBishopPosition] = bishop(color);
  taken.add(lightBishopPosition);
  const darkBishopPosition = shuffle(
    Array.from({ length: 4 })
      .map((_, index) => index * 2 + 1)
      .filter((index) => !taken.has(index))
  )[0]!;
  row[darkBishopPosition] = bishop(color);
  taken.add(darkBishopPosition);
  const positions = Array.from({ length: 8 })
    .map((_, index) => index)
    .filter((index) => !taken.has(index));
  const rest = shuffle([queen(color), knight(color), knight(color)]);
  rest.forEach((piece, index) => {
    row[positions[index]!] = piece;
  });
  return row;
};

const race = (piece: (color: ChessColor) => Piece) => [
  piece("dark"),
  rook("dark"),
  bishop("dark"),
  knight("dark"),
  knight("light"),
  bishop("light"),
  rook("light"),
  piece("light"),
];

export const raceFront = () => race(king);
export const raceBack = () => race(queen);

const archbishop = (color: ChessColor) =>
  piece({
    color,
    type: "archbishop",
    movement(controller) {
      return [...diagonal(controller, this, 7), ...lShape(this)];
    },
  });

const chancellor = (color: ChessColor) =>
  piece({
    color,
    type: "chancellor",
    movement(controller) {
      return [...horizontal(controller, this, 7), ...lShape(this)];
    },
  });

export const backRow = (color: ChessColor) => [
  rook(color),
  knight(color),
  bishop(color),
  queen(color),
  king(color),
  bishop(color),
  knight(color),
  rook(color),
];

export const gothicBackRow = (color: ChessColor) => [
  rook(color),
  knight(color),
  bishop(color),
  queen(color),
  chancellor(color),
  king(color),
  archbishop(color),
  bishop(color),
  knight(color),
  rook(color),
];

export const capablancaBackRow = (color: ChessColor) => [
  rook(color),
  knight(color),
  archbishop(color),
  bishop(color),
  queen(color),
  king(color),
  bishop(color),
  chancellor(color),
  knight(color),
  rook(color),
];

export const pawns = (color: ChessColor, length: number = 8) =>
  Array.from({ length }).map(() => pawn(color));

export const hordePawns = (color: ChessColor) =>
  Array.from({ length: 8 }).map(() => hordePawn(color));

export const emptyRow = (length: number = 8) =>
  Array.from({ length }).map(() => null);

const loadImage = (() => {
  const cache: Record<string, HTMLImageElement> = {};
  return (src: string) => {
    if (!cache[src]) {
      const image = new Image();
      image.src = src;
      cache[src] = image;
    }
    return cache[src];
  };
})();

const piece = ({
  color,
  type,
  movement,
}: {
  color: ChessColor;
  type: PieceType;
  movement: MovementFunction;
}): Piece => {
  return {
    id: crypto.randomUUID(),
    isPromoted: false,
    color,
    image: loadImage(`${color}_${type}.png`),
    movement(controller, config) {
      return controller.removeIllegalMoves(
        movement.call(this, controller, config),
        config
      );
    },
    type,
    column: -1,
    row: -1,
    moves: 0,
    withColor(color) {
      const piece = cloneDeep(this);
      piece.color = color;
      piece.image = loadImage(`${color}_${this.type}.png`);
      piece.id = crypto.randomUUID();
      return piece;
    },
    withType(type) {
      const piece = cloneDeep(this);
      piece.type = type;
      piece.image = loadImage(`${this.color}_${type}.png`);
      piece.id = crypto.randomUUID();
      return piece;
    },
  };
};

export const pawn = (
  color: ChessColor,
  canMove2: (this: Piece, controller: ChessController) => boolean = function (
    controller
  ) {
    return this.column % (controller.getRows() - 2) === 0;
  }
) =>
  piece({
    color,
    type: "pawn",
    movement(controller, config) {
      const movement: Movement[] = [];
      const direction = this.color === "dark" ? 1 : -1;
      const forward = controller.getPieceByCoordinates(
        this.row + direction,
        this.column
      );
      const forward2 = controller.getPieceByCoordinates(
        this.row + 2 * direction,
        this.column
      );
      if (!config?.attacksOnly) {
        // HANDLE FORWARD 2
        const canMove2Eval = canMove2.call(this, controller);
        if (canMove2Eval && !forward && !forward2) {
          movement.push({
            column: this.column,
            row: this.row + direction * 2,
            destinations: [
              {
                piece: this,
                column: this.column,
                row: this.row + direction * 2,
              },
            ],
            enPassant: this.id,
          });
        }
        // HANDLE FORWARD 1
        if (!forward) {
          movement.push({
            column: this.column,
            row: this.row + direction,
            destinations: [
              {
                piece: this,
                column: this.column,
                row: this.row + direction,
              },
            ],
          });
        }
      }
      const canEnPassant =
        (this.color === "light" && this.row === 3) ||
        (this.color === "dark" && this.row === 4);
      // HANDLE CAPTURE
      const forwardLeft = controller.getPieceByCoordinates(
        this.row + direction,
        this.column - 1
      );
      const left = controller.getPieceByCoordinates(this.row, this.column - 1);
      const leftPawnJustMoved =
        canEnPassant &&
        left?.type === "pawn" &&
        left.id === controller.getEnPassantId() &&
        left.color !== this.color;
      if (
        config?.attacksOnly ||
        (forwardLeft && forwardLeft.color !== this.color)
      ) {
        movement.push({
          column: this.column - 1,
          row: this.row + direction,
          destinations: [
            {
              column: this.column - 1,
              row: this.row + direction,
              piece: this,
            },
          ],
        });
      }
      if (leftPawnJustMoved) {
        movement.push({
          column: this.column - 1,
          row: this.row + direction,
          destinations: [
            {
              column: this.column - 1,
              row: this.row + direction,
              piece: this,
            },
          ],
          captures: [
            {
              column: this.column - 1,
              row: this.row,
            },
          ],
        });
      }
      const forwardRight = controller.getPieceByCoordinates(
        this.row + direction,
        this.column + 1
      );
      const right = controller.getPieceByCoordinates(this.row, this.column + 1);
      const rightPawnJustMoved =
        canEnPassant &&
        right?.type === "pawn" &&
        right.id === controller.getEnPassantId() &&
        right.color !== this.color;
      if (
        config?.attacksOnly ||
        (forwardRight && forwardRight.color !== this.color)
      ) {
        movement.push({
          column: this.column + 1,
          row: this.row + direction,
          destinations: [
            {
              column: this.column + 1,
              row: this.row + direction,
              piece: this,
            },
          ],
        });
      }
      if (rightPawnJustMoved) {
        movement.push({
          column: this.column + 1,
          row: this.row + direction,
          destinations: [
            {
              column: this.column + 1,
              row: this.row + direction,
              piece: this,
            },
          ],
          captures: [
            {
              row: this.row,
              column: this.column + 1,
            },
          ],
        });
      }
      return movement;
    },
  });

export const solider = (color: ChessColor) => pawn(color, () => false);

export const soliders = (color: ChessColor, length: number = 8) =>
  Array.from({ length }).map(() => solider(color));

export const rook = (color: ChessColor) =>
  piece({
    color,
    type: "rook",
    movement(controller) {
      const breaksQueenSideCastle = this.column === 0 && this.row % 7 === 0;
      const breaksKingSideCastle = this.column === 7 && this.row % 7 === 0;
      return horizontal(controller, this, 7).map((movement) => ({
        ...movement,
        breaksQueenSideCastle,
        breaksKingSideCastle,
      }));
    },
  });

const horizontal = (controller: ChessController, piece: Piece, max: number) => {
  const movement: Movement[] = [];
  movement.push(...longMovement(controller, piece, 1, 0, max));
  movement.push(...longMovement(controller, piece, -1, 0, max));
  movement.push(...longMovement(controller, piece, 0, 1, max));
  movement.push(...longMovement(controller, piece, 0, -1, max));
  return movement;
};

const diagonal = (controller: ChessController, piece: Piece, max: number) => {
  const movement: Movement[] = [];
  movement.push(...longMovement(controller, piece, 1, 1, max));
  movement.push(...longMovement(controller, piece, -1, -1, max));
  movement.push(...longMovement(controller, piece, 1, -1, max));
  movement.push(...longMovement(controller, piece, -1, 1, max));
  return movement;
};

const longMovement = (
  controller: ChessController,
  piece: Piece,
  columnMovement: number,
  rowMovement: number,
  max: number
) => {
  const movement: Movement[] = [];
  let blocker: Piece | null | undefined = null;
  for (let offset = 1; offset <= max && !blocker; offset++) {
    const offsetRow = piece.row + offset * rowMovement;
    const offsetColumn = piece.column + offset * columnMovement;
    blocker = controller.getPieceByCoordinates(offsetRow, offsetColumn);
    movement.push({
      row: offsetRow,
      column: offsetColumn,
      destinations: [
        {
          row: offsetRow,
          column: offsetColumn,
          piece,
        },
      ],
    });
  }
  return movement;
};

const lShape = (piece: Piece) => {
  const movements: Movement[] = [];
  for (const column of [1, 2]) {
    const row = column === 1 ? 2 : 1;
    movements.push({
      column: piece.column + column,
      row: piece.row + row,
      destinations: [
        {
          column: piece.column + column,
          row: piece.row + row,
          piece: piece,
        },
      ],
    });
    movements.push({
      column: piece.column - column,
      row: piece.row + row,
      destinations: [
        {
          column: piece.column - column,
          row: piece.row + row,
          piece: piece,
        },
      ],
    });
    movements.push({
      column: piece.column + column,
      row: piece.row - row,
      destinations: [
        {
          column: piece.column + column,
          row: piece.row - row,
          piece: piece,
        },
      ],
    });
    movements.push({
      column: piece.column - column,
      row: piece.row - row,
      destinations: [
        {
          column: piece.column - column,
          row: piece.row - row,
          piece: piece,
        },
      ],
    });
  }
  return movements;
};

export const knight = (color: ChessColor) =>
  piece({
    color,
    type: "knight",
    movement() {
      return lShape(this);
    },
  });

export const bishop = (color: ChessColor) =>
  piece({
    color,
    type: "bishop",
    movement(controller) {
      return diagonal(controller, this, 7);
    },
  });

const castle = (
  controller: ChessController,
  attacks: CellPiece[],
  direction: number,
  king: Piece,
  kingDestination: Cell,
  rookDestination: Cell
): Movement[] => {
  // SEE IF ANYTHING IS BETWEEN THE KING AND THE ROOK AND THE ROOK HAS NOT MOVED
  let rook;
  for (
    let column = king.column + direction;
    0 <= column && column < 8;
    column += direction
  ) {
    const blocker = controller.getPieceByCoordinates(king.row, column);
    if (blocker) {
      if (blocker.type === "rook" && blocker.moves === 0) {
        rook = blocker;
      }
      break;
    }
  }
  if (!rook) {
    return [];
  }
  // SEE IF WE CAN ACTUALLY MOVE TO THE SPOTS
  const blockers = [
    controller.getPieceByCoordinates(
      kingDestination.row,
      kingDestination.column
    ),
    controller.getPieceByCoordinates(
      kingDestination.row,
      kingDestination.column
    ),
  ]
    .filter(filterNull)
    .filter((piece) => ![king.id, rook.id].includes(piece.id));
  if (blockers.length) {
    return [];
  }
  // SEE IF THE KING PASSES THROUGH AN ATTACK
  if (controller.hasCheck() === false) {
    const directionToTarget = getSign(kingDestination.column - king.column);
    for (let column = king.column; ; column += directionToTarget) {
      const attack = attacks.find(
        (attack) => attack.column === column && attack.row === king.row
      );
      if (attack) {
        return [];
      }
      if (column === kingDestination.column) {
        break;
      }
    }
  }
  return [
    {
      column:
        direction > 0
          ? Math.min(king.column + 2, rook.column)
          : Math.max(king.column - 2, rook.column),
      row: king.row,
      castle: true,
      destinations: [
        {
          ...rookDestination,
          piece: rook,
        },
        {
          ...kingDestination,
          piece: king,
        },
      ],
    },
  ];
};

export const king = (color: ChessColor) =>
  piece({
    color,
    type: "king",
    movement(controller, config) {
      const movements: Movement[] = [];
      if (!config?.attacksOnly && this.moves === 0 && this.row % 7 === 0) {
        const attacks = controller.getAttacksAgainst(controller.getTurn());
        // queen side
        movements.push(
          ...castle(
            controller,
            attacks,
            -1,
            this,
            {
              row: this.row,
              column: controller.getCastleFromTheLeft(),
            },
            {
              row: this.row,
              column: controller.getCastleFromTheLeft() + 1,
            }
          )
        );
        // king side
        movements.push(
          ...castle(
            controller,
            attacks,
            1,
            this,
            {
              row: this.row,
              column:
                controller.getColumns() -
                controller.getCastleFromTheRight() -
                1,
            },
            {
              row: this.row,
              column:
                controller.getColumns() -
                controller.getCastleFromTheRight() -
                2,
            }
          )
        );
      }
      return [
        ...movements,
        ...horizontal(controller, this, 1),
        ...diagonal(controller, this, 1),
      ];
    },
  });

export const queen = (color: ChessColor) =>
  piece({
    color,
    type: "queen",
    movement(controller) {
      return [
        ...horizontal(controller, this, 7),
        ...diagonal(controller, this, 7),
      ];
    },
  });

export const hordePawn = (color: ChessColor) => {
  return pawn(color, function () {
    return this.moves <= 1;
  });
};

export const filterNull = <T>(input: T | null | undefined): input is T =>
  !!input;

export const shuffle = <T>(list: T[]) => {
  list.forEach((_, from) => {
    const to = Math.floor(Math.random() * list.length);
    const temp = list[from]!;
    list[from] = list[to]!;
    list[to] = temp;
  });
  return list;
};

export const getPromotions = (color: ChessColor) => {
  return [knight(color), bishop(color), rook(color), queen(color)].map(
    (piece) => {
      piece.isPromoted = true;
      return piece;
    }
  );
};

export const traitor = (traitor: Piece) => {
  return piece({
    color: traitor.color,
    type: traitor.type,
    movement(controller, config) {
      const movements = traitor.movement.call(this, controller, config);
      // MAKE IT A TRAITOR
      movements.forEach((movement) => {
        if (movement.destinations.length === 1) {
          const destination = movement.destinations[0];
          if (destination) {
            const target = controller.getPieceByCoordinates(
              destination.row,
              destination.column
            );
            const capture =
              movement.captures?.map((capture) =>
                controller.getPieceByCoordinates(capture.row, capture.column)
              )?.[0] || target;
            if (capture) {
              movement.destinations.push({
                piece: capture.withColor(this.color).withType(capture.type),
                column: destination.column,
                row: destination.row,
              });
            }
          }
        }
      });
      return movements;
    },
  });
};

export const crazyPiece = (crazy: Piece): Piece => {
  return piece({
    color: crazy.color,
    type: "crazy",
    movement(controller) {
      const movements = Array.from({ length: 64 })
        .map((_, index): Movement | null => {
          const row = Math.floor(index / 8);
          const column = index % 8;
          return controller.getPieceByCoordinates(row, column)
            ? null
            : {
                column,
                row,
                destinations: [
                  {
                    column,
                    row,
                    piece: {
                      ...crazy,
                      moves: 1,
                    },
                  },
                ],
                captures: [],
                isCrazy: true,
              };
        })
        .filter(filterNull);

      return crazy.type === "pawn"
        ? movements.filter((movement) => movement.row % 7 !== 0)
        : movements;
    },
  });
};

const getSign = (input: number) => input / Math.abs(input);

export const duck = () =>
  piece({
    color: "neutral",
    movement(controller) {
      return Array.from({
        length: 64,
      })
        .map((_, index): Movement | null => {
          const row = Math.floor(index / 8);
          const column = index % 8;
          const piece = controller.getPieceByCoordinates(row, column);
          return piece
            ? null
            : {
                column,
                row,
                destinations: [
                  {
                    row,
                    column,
                    piece: this,
                  },
                ],
              };
        })
        .filter(filterNull);
    },
    type: "duck",
  });

export const pieceMap: Record<PieceType, (color: ChessColor) => Piece> = {
  bishop,
  knight,
  pawn,
  queen,
  rook,
  king,
  crazy: (color) => crazyPiece(pawn(color)),
  duck,
  archbishop,
  chancellor,
};

export const circePiece = (circe: Piece) => {
  return piece({
    color: circe.color,
    type: circe.type,
    movement(controller, config) {
      const movements = circe.movement.call(this, controller, config);
      return movements.map((movement) => {
        const destination = movement.destinations[0];
        if (destination) {
          const captured =
            controller.getPieceByCoordinates(
              destination.row,
              destination.column
            ) ||
            movement.captures?.map((capture) =>
              controller.getPieceByCoordinates(capture.row, capture.column)
            )?.[0];
          if (captured) {
            const type = captured.type;
            if (type === "pawn") {
              const row = captured.color === "dark" ? 1 : 6;
              captured.moves = 0;
              movement.destinations.unshift({
                piece: captured,
                column: captured.column,
                row,
              });
            } else if (type === "queen") {
              const row = captured.color === "dark" ? 0 : 7;
              captured.moves = 0;
              movement.destinations.unshift({
                piece: captured,
                column: 3,
                row,
              });
            } else if (
              type === "bishop" ||
              type === "knight" ||
              type === "rook"
            ) {
              const tileColor =
                (captured.column + (captured.row % 2)) % 2 === 0
                  ? "light"
                  : "dark";
              const row = captured.color === "dark" ? 0 : 7;
              const columnMaping = {
                rook: [0, 7],
                bishop: [2, 5],
                knight: [6, 1],
              };
              const tileIndex = tileColor === "light" ? 1 : 0;
              const colorIndex = captured.color === "light" ? 0 : 1;
              const column =
                columnMaping[type][(tileIndex + colorIndex) % 2] ?? -1;
              if (column >= 0) {
                captured.moves = 0;
                movement.destinations.unshift({
                  piece: captured,
                  column,
                  row,
                });
              }
            }
          }
        }
        return movement;
      });
    },
  });
};

export const atomic = (atomic: Piece) => {
  return piece({
    color: atomic.color,
    type: atomic.type,
    movement(controller, config) {
      const movements = atomic.movement.call(this, controller, config);
      // MAKE IT ATOMIC
      movements.forEach((movement) => {
        if (movement.destinations.length === 1) {
          const destination = movement.destinations[0];
          if (destination) {
            const target = controller.getPieceByCoordinates(
              destination.row,
              destination.column
            );
            const isCapture = !!movement.captures?.length || !!target;
            if (isCapture) {
              const captures = movement.captures ?? [];
              const explosion = Array.from({ length: 9 }).map(
                (_, index): Cell => {
                  const row = (index % 3) - 1 + destination.row;
                  const column = Math.floor(index / 3) - 1 + destination.column;
                  return {
                    column,
                    row,
                  };
                }
              );
              movement.captures = captures.concat(explosion);
            }
          }
        }
      });
      return movements;
    },
  });
};

export const dragonFlyBackrow = (color: ChessColor) => [
  rook(color),
  bishop(color),
  bishop(color),
  king(color),
  knight(color),
  knight(color),
  rook(color),
];
