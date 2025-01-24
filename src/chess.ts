import cloneDeep from "clone-deep";
import type { ChessController } from "./chess/chess-controller";
import type {
  Cell,
  ChessColor,
  Movement,
  MovementConfig,
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

export const pawns = (color: ChessColor) =>
  Array.from({ length: 8 }).map(() => pawn(color));

export const hordePawns = (color: ChessColor) =>
  Array.from({ length: 8 }).map(() => hordePawn(color));

export const emptyRow = () => Array.from({ length: 8 }).map(() => null);

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

const removeIllegalMoves = (
  controller: ChessController,
  movements: Movement[],
  config: MovementConfig | null | undefined
) => {
  return movements.filter((movement) => {
    // REMOVE OUT OF BOUNDS
    movement.destinations = movement.destinations.filter(
      (destination) =>
        destination.column >= 0 &&
        destination.column < 8 &&
        destination.row >= 0 &&
        destination.row < 8
    );
    // REMOVE SELF CAPTURES
    movement.destinations = movement.castle
      ? movement.destinations
      : movement.destinations.filter(
          (destination) =>
            controller.getPieceByCoordinates(
              destination.row,
              destination.column
            )?.color !== destination.piece.color
        );
    if (config?.attacksOnly) {
      return movement.destinations.length;
    }
    // REMOVE SELF CHECKS
    if (controller.getTurns() <= 1) {
      const future = controller.clone();
      future.executeMovement(cloneDeep(movement));
      const king = future.getCheckedKing(controller.getTurn());
      if (king) {
        return false;
      }
    }
    return movement.destinations.length;
  });
};

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
    color,
    image: loadImage(`${color}_${type}.png`),
    movement(controller, config) {
      return removeIllegalMoves(
        controller,
        movement.call(this, controller, config),
        config
      );
    },
    type,
    column: 0,
    row: 0,
    moves: 0,
    withColor(color) {
      const piece = cloneDeep(this);
      piece.color = color;
      piece.image = loadImage(`${color}_${this.type}.png`);
      piece.id = crypto.randomUUID();
      return piece;
    },
  };
};

export const pawn = (color: ChessColor, canMove2?: (this: Piece) => boolean) =>
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
        const canMove2Eval = canMove2?.call(this) || this.row % 6 < 2;
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

export const knight = (color: ChessColor) =>
  piece({
    color,
    type: "knight",
    movement() {
      const movements: Movement[] = [];
      for (const column of [1, 2]) {
        const row = column === 1 ? 2 : 1;
        movements.push({
          column: this.column + column,
          row: this.row + row,
          destinations: [
            {
              column: this.column + column,
              row: this.row + row,
              piece: this,
            },
          ],
        });
        movements.push({
          column: this.column - column,
          row: this.row + row,
          destinations: [
            {
              column: this.column - column,
              row: this.row + row,
              piece: this,
            },
          ],
        });
        movements.push({
          column: this.column + column,
          row: this.row - row,
          destinations: [
            {
              column: this.column + column,
              row: this.row - row,
              piece: this,
            },
          ],
        });
        movements.push({
          column: this.column - column,
          row: this.row - row,
          destinations: [
            {
              column: this.column - column,
              row: this.row - row,
              piece: this,
            },
          ],
        });
      }
      return movements;
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

export const king = (color: ChessColor) =>
  piece({
    color,
    type: "king",
    movement(controller, config) {
      const movements: Movement[] = [];
      if (!config?.attacksOnly && this.moves === 0) {
        const attacks = controller.getAttacksAgainst(controller.getTurn());
        // king side castle
        let kingRook;
        for (let column = this.column + 1; column < 8; column++) {
          const attack = attacks.find(
            (attack) => attack.column === column && attack.row === this.row
          );
          if (attack) {
            break;
          }
          const blocker = controller.getPieceByCoordinates(this.row, column);
          if (blocker) {
            if (blocker.type === "rook" && blocker.moves === 0) {
              kingRook = blocker;
            }
            break;
          }
        }
        if (kingRook) {
          const kingBlockers = [
            controller.getPieceByCoordinates(this.row, 5),
            controller.getPieceByCoordinates(this.row, 6),
          ]
            .filter(filterNull)
            .filter((piece) => ![this.id, kingRook.id].includes(piece.id));
          if (!kingBlockers.length) {
            movements.push({
              column: Math.min(this.column + 2, kingRook.column),
              row: this.row,
              castle: true,
              destinations: [
                {
                  column: 5,
                  row: this.row,
                  piece: kingRook,
                },
                {
                  piece: this,
                  row: this.row,
                  column: 6,
                },
              ],
            });
          }
        }
        // queen side castle
        let queenRook;
        for (let column = this.column - 1; column >= 0; column--) {
          const attack = attacks.find(
            (attack) => attack.column === column && attack.row === this.row
          );
          if (attack) {
            break;
          }
          const blocker = controller.getPieceByCoordinates(this.row, column);
          if (blocker) {
            if (blocker.type === "rook" && blocker.moves === 0) {
              queenRook = blocker;
            }
            break;
          }
        }
        if (queenRook) {
          const queenBlockers = [
            controller.getPieceByCoordinates(this.row, 2),
            controller.getPieceByCoordinates(this.row, 3),
          ]
            .filter(filterNull)
            .filter((piece) => ![this.id, queenRook.id].includes(piece.id));
          if (!queenBlockers.length) {
            movements.push({
              column: Math.max(this.column - 2, queenRook.column),
              row: this.row,
              castle: true,
              destinations: [
                {
                  column: 2,
                  row: this.row,
                  piece: this,
                },
                {
                  row: this.row,
                  column: 3,
                  piece: queenRook,
                },
              ],
            });
          }
        }
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
  return [knight(color), bishop(color), rook(color), queen(color)];
};

export const atomicPiece = (piece: Piece) => {
  const movement = piece.movement;
  piece.movement = (controller, config) => {
    const movements = movement.call(piece, controller, config);
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
  };
  return piece;
};
