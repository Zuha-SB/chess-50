import type { BoardState, Piece, PieceWithCoordinates } from "./types";

export const getPiecesWithCoordinates = (board: BoardState) => {
  return board.tiles
    .flatMap((row, rowIndex) =>
      row.map((piece, columnIndex) =>
        piece
          ? {
              piece,
              row: rowIndex,
              column: columnIndex,
            }
          : null
      )
    )
    .filter((_: PieceWithCoordinates | null): _ is PieceWithCoordinates => !!_);
};

export const getPieceWithCoordinates = (board: BoardState, id: string) => {
  return getPiecesWithCoordinates(board).find(
    (pieceWithCoordinates) => id === pieceWithCoordinates.piece.id
  );
};
