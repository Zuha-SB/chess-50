import type {
  BoardState,
  ChessColor,
  GameState,
  Movement,
  MovementConfig,
  MovementFunction,
  Piece,
  PieceType,
} from "./types";
import clone from "clone-deep";

export const getPieceById = (board: BoardState, id: string) =>
  board.tiles.flat().find((piece) => piece?.id === id);

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
  piece: Piece,
  board: BoardState,
  movements: Movement[],
  config: MovementConfig | null | undefined
) => {
  return movements.filter((movement) => {
    // REMOVE OUT OF BOUNDS
    if (
      movement.column < 0 ||
      movement.column >= 8 ||
      movement.row < 0 ||
      movement.row >= 8
    ) {
      return false;
    }
    // REMOVE SELF CAPTURES
    if (board.tiles[movement.row]?.[movement.column]?.color === piece.color) {
      return false;
    }
    if (config?.attacksOnly) {
      return true;
    }
    // TODO REMOVE SELF CHECKS
    const future = executeMovement(clone(board), clone(piece), movement);
    const king = getCheckedKing({
      ...future,
      turn: future.turn === "light" ? "dark" : "light",
    });
    if (king) {
      return false;
    }
    return true;
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
    movement(board, config) {
      return removeIllegalMoves(
        this,
        board,
        movement.call(this, board, config),
        config
      );
    },
    type,
    column: 0,
    row: 0,
  };
};

export const pawn = (color: ChessColor) =>
  piece({
    color,
    type: "pawn",
    movement(board, config) {
      const movement: Movement[] = [];
      const direction = this.color === "dark" ? 1 : -1;
      const forward = board.tiles[this.row + direction]?.[this.column];
      const forward2 = board.tiles[this.row + 2 * direction]?.[this.column];
      if (!config?.attacksOnly) {
        // HANDLE FORWARD 2
        const isStarting = this.row === 1 || this.row === 6;
        if (isStarting && !forward && !forward2) {
          movement.push({
            column: this.column,
            row: this.row + direction * 2,
            enPassant: true,
            piece: this,
          });
        }
        // HANDLE FORWARD 1
        if (!forward) {
          movement.push({
            column: this.column,
            row: this.row + direction,
            piece: this,
          });
        }
      }
      const canEnPassant =
        (this.color === "light" && this.row === 3) ||
        (this.color === "dark" && this.row === 4);
      // HANDLE CAPTURE
      const forwardLeft = board.tiles[this.row + direction]?.[this.column - 1];
      const left = board.tiles[this.row]?.[this.column - 1];
      const leftPawnJustMoved =
        canEnPassant &&
        left?.type === "pawn" &&
        left.id === board.enPassantId &&
        left.color !== this.color;
      if (
        config?.attacksOnly ||
        (forwardLeft && forwardLeft.color !== this.color)
      ) {
        movement.push({
          column: this.column - 1,
          row: this.row + direction,
          piece: this,
        });
      }
      if (leftPawnJustMoved) {
        movement.push({
          column: this.column - 1,
          row: this.row + direction,
          piece: this,
          captures: [
            {
              column: this.column - 1,
              row: this.row,
            },
          ],
        });
      }
      const forwardRight = board.tiles[this.row + direction]?.[this.column + 1];
      const right = board.tiles[this.row]?.[this.column + 1];
      const rightPawnJustMoved =
        canEnPassant &&
        right?.type === "pawn" &&
        right.id === board.enPassantId &&
        right.color !== this.color;
      if (
        config?.attacksOnly ||
        (forwardRight && forwardRight.color !== this.color)
      ) {
        movement.push({
          column: this.column + 1,
          row: this.row + direction,
          piece: this,
        });
      }
      if (rightPawnJustMoved) {
        movement.push({
          column: this.column + 1,
          row: this.row + direction,
          piece: this,
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
    movement(board) {
      const breaksQueenSideCastle = this.column === 0 && this.row % 7 === 0;
      const breaksKingSideCastle = this.column === 7 && this.row % 7 === 0;
      return horizontal(board, this, 7).map((movement) => ({
        ...movement,
        breaksQueenSideCastle,
        breaksKingSideCastle,
      }));
    },
  });

const horizontal = (board: BoardState, piece: Piece, max: number) => {
  const movement: Movement[] = [];
  movement.push(...longMovement(board, piece, 1, 0, max));
  movement.push(...longMovement(board, piece, -1, 0, max));
  movement.push(...longMovement(board, piece, 0, 1, max));
  movement.push(...longMovement(board, piece, 0, -1, max));
  return movement;
};

const diagonal = (board: BoardState, piece: Piece, max: number) => {
  const movement: Movement[] = [];
  movement.push(...longMovement(board, piece, 1, 1, max));
  movement.push(...longMovement(board, piece, -1, -1, max));
  movement.push(...longMovement(board, piece, 1, -1, max));
  movement.push(...longMovement(board, piece, -1, 1, max));
  return movement;
};

const longMovement = (
  board: BoardState,
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
    blocker = board.tiles[offsetRow]?.[offsetColumn];
    movement.push({
      row: offsetRow,
      column: offsetColumn,
      piece,
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
          piece: this,
        });
        movements.push({
          column: this.column - column,
          row: this.row + row,
          piece: this,
        });
        movements.push({
          column: this.column + column,
          row: this.row - row,
          piece: this,
        });
        movements.push({
          column: this.column - column,
          row: this.row - row,
          piece: this,
        });
      }
      return movements;
    },
  });

export const bishop = (color: ChessColor) =>
  piece({
    color,
    type: "bishop",
    movement(board) {
      return diagonal(board, this, 7);
    },
  });

export const getAttacks = (board: BoardState) => {
  return board.tiles
    .flat()
    .filter(
      (piece: Piece | null): piece is Piece =>
        !!piece && piece.color !== board.turn
    )
    .flatMap((piece) =>
      piece.movement(board, {
        attacksOnly: true,
      })
    );
};

export const king = (color: ChessColor) =>
  piece({
    color,
    type: "king",
    movement(board, config) {
      const movements: Movement[] = [];
      if (!config?.attacksOnly) {
        const attacks = getAttacks(board);
        if (board[board.turn].canKingSideCastle) {
          // look for blockers
          const bishop = board.tiles[this.row]?.[this.column + 1];
          const knight = board.tiles[this.row]?.[this.column + 2];
          if (!bishop && !knight) {
            const attack = attacks.find(
              (movement) =>
                (movement.row === this.row &&
                  movement.column === this.column) ||
                (movement.row === this.row &&
                  movement.column === this.column + 1) ||
                (movement.row === this.row &&
                  movement.column === this.column + 2)
            );
            if (!attack) {
              movements.push({
                column: this.column + 2,
                row: this.row,
                piece: this,
                movements: [
                  {
                    from: {
                      row: this.row,
                      column: 7,
                    },
                    to: {
                      row: this.row,
                      column: 5,
                    },
                  },
                ],
              });
            }
          }
        }
        if (board[board.turn].canQueenSideCastle) {
          // look for blockers
          const queen = board.tiles[this.row]?.[this.column - 1];
          const bishop = board.tiles[this.row]?.[this.column - 2];
          const knight = board.tiles[this.row]?.[this.column - 3];
          if (!queen && !bishop && !knight) {
            const attack = attacks.find(
              (movement) =>
                (movement.row === this.row &&
                  movement.column === this.column) ||
                (movement.row === this.row &&
                  movement.column === this.column - 1) ||
                (movement.row === this.row &&
                  movement.column === this.column - 2)
            );
            if (!attack) {
              movements.push({
                column: this.column - 2,
                row: this.row,
                piece: this,
                movements: [
                  {
                    from: {
                      row: this.row,
                      column: 0,
                    },
                    to: {
                      row: this.row,
                      column: 3,
                    },
                  },
                ],
              });
            }
          }
        }
      }
      return [
        ...movements,
        ...horizontal(board, this, 1),
        ...diagonal(board, this, 1),
      ];
    },
  });

export const queen = (color: ChessColor) =>
  piece({
    color,
    type: "queen",
    movement(board) {
      return [...horizontal(board, this, 7), ...diagonal(board, this, 7)];
    },
  });

export const filterNull = <T>(input: T | null | undefined): input is T =>
  !!input;

export const getCheckedKing = (board: BoardState) => {
  const attacks = getAttacks(board);
  return board.tiles
    .flat()
    .filter(filterNull)
    .find((piece) =>
      attacks.find(
        (attack) =>
          attack.piece.color !== piece.color &&
          attack.column === piece.column &&
          attack.row === piece.row &&
          piece.type === "king"
      )
    );
};

export const executeMovement = (
  board: BoardState,
  piece: Piece,
  movement: Movement
): BoardState => {
  const { row, column } = movement;
  board.tiles[piece.row]![piece.column] = null;
  board.tiles[row]![column] = piece;
  piece.row = row;
  piece.column = column;
  board.turn = board.turn === "light" ? "dark" : "light";
  board.enPassantId = movement.enPassant ? piece.id : "";
  if (piece.type === "rook") {
    board[piece.color].canKingSideCastle &&=
      movement.breaksKingSideCastle !== true;
    board[piece.color].canQueenSideCastle &&=
      movement.breaksQueenSideCastle !== true;
  }
  if (piece.type === "king") {
    board[piece.color].canKingSideCastle = false;
    board[piece.color].canQueenSideCastle = false;
  }
  movement.captures?.forEach((capture) => {
    board.tiles[capture.row]![capture.column] = null;
  });
  movement.movements?.forEach((movement) => {
    const extraMovement =
      board.tiles[movement.from.row]?.[movement.from.column];
    if (extraMovement) {
      board.tiles[movement.to.row]![movement.to.column] = extraMovement;
      board.tiles[movement.from.row]![movement.from.column] = null;
      extraMovement.row = movement.to.row;
      extraMovement.column = movement.to.column;
    }
  });
  return board;
};

export const getPromotedPawn = (board: BoardState) => {
  return board.tiles
    .flat()
    .find(
      (piece) =>
        piece && piece.type === "pawn" && (piece.row === 0 || piece.row === 7)
    );
};

export const getGameState = (board: BoardState): GameState => {
  const kings = board.tiles.flat().filter((piece) => piece?.type === "king");
  if (kings.length === 1) {
    return kings[0]?.color === "light" ? "light_wins" : "dark_wins";
  }
  if (kings.length === 0) {
    return "stalemate";
  }
  const king = getCheckedKing(board);
  const movements = board.tiles.flatMap((row) => {
    return row.flatMap((piece) =>
      piece?.color === board.turn ? piece.movement(board) : []
    );
  });
  if (king && !movements.length) {
    return board.turn === "dark" ? "light_wins" : "dark_wins";
  }
  if (!movements.length) {
    return "stalemate";
  }
  return "active";
};

const backRow = (color: ChessColor) => [
  rook(color),
  knight(color),
  bishop(color),
  queen(color),
  king(color),
  bishop(color),
  knight(color),
  rook(color),
];

const emptyRow = () => Array.from({ length: 8 }).map(() => null);

export const newGame = () => {
  const board: BoardState = {
    turn: "light",
    selectedId: "",
    enPassantId: "",
    light: {
      canKingSideCastle: true,
      canQueenSideCastle: true,
    },
    dark: {
      canKingSideCastle: true,
      canQueenSideCastle: true,
    },
    tiles: [
      backRow("dark"),
      Array.from({ length: 8 }).map(() => pawn("dark")),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      Array.from({ length: 8 }).map(() => pawn("light")),
      backRow("light"),
    ],
  };
  board.tiles.forEach((row, rowIndex) => {
    row.forEach((piece, columnIndex) => {
      if (piece) {
        piece.row = rowIndex;
        piece.column = columnIndex;
      }
    });
  });
  return board;
};

// TODO
// REFACTOR INTO REUSABLE CODE
