import type { ParsedPGN, Result } from "pgn-parser";
import { ChessDotCom } from "./chess-dot-com";
import { Lichess } from "./lichess";

// are you losing by times or by tactics?
// what do people usually play?
// which openings are challenging

// graphs

// chess base
// opening tree
// https://www.365chess.com/eco/A46_Queen's_pawn_game
// https://www.chessgames.com/perl/chessopening?eco=A46

// BOT IDEAS
// leela or alphazero
// LIKES TO MOVE QUEENS
// LIKES TO SACRIFICE PIECES
// WORST MOVE BOT
// EVEN BOT - keeps eval close to 0
// TIME RUSHED BOT - looks at certains number of moves and picks the best of them
// HUMAN BOT - picks move based on other human moves in a position

type GamesByPeriod = Record<string, ParsedPGN[]>;

type Color = "White" | "Black";

interface TotalPercent {
  total: number;
  percent: string;
}

interface ByMonth {
  date: string;
  month: {
    count: number;
    wins: TotalPercent;
    draws: TotalPercent;
    loses: TotalPercent;
  };
  total: {
    count: number;
    wins: TotalPercent;
    draws: TotalPercent;
    loses: TotalPercent;
  };
}

const groupBy = <T>(list: T[], callback: (item: T) => string) => {
  const groups: Record<string, T[]> = {};
  list.forEach((item) => {
    const key = callback(item);
    const group = groups[key] || [];
    group.push(item);
    groups[key] = group;
  });
  return groups;
};

const groupByMonth = (list: ParsedPGN[]) =>
  groupByPeriod(list, (year, month, date) => `${year}-${month}`);

const groupByDate = (list: ParsedPGN[]) =>
  groupByPeriod(list, (year, month, date) => `${year}-${month}-${date}`);

const groupByPeriod = (
  list: ParsedPGN[],
  callback: (year: string, month: string, date: string) => string
): Record<string, ParsedPGN[]> => {
  return groupBy(list, (game) => {
    const date = new Date(
      game.headers
        ?.find((header) => header.name === "UTCDate")
        ?.value.replace(/\./g, "-") ?? 0
    );
    const y = date.getFullYear().toString();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = (date.getDate() + 1).toString().padStart(2, "0");
    return callback(y, m, d);
  });
};

const chessDotCom = new ChessDotCom();
const lichess = new Lichess();
const username = "nagolyhprum";

const totalPercent = (numerator: number, denominator: number): TotalPercent => {
  return {
    total: numerator,
    percent: percent(numerator / denominator),
  };
};

const filterColor = (games: ParsedPGN[], color: Color) => {
  return games.filter((game) =>
    game.headers?.find((header) => {
      return header.name === color && header.value === username;
    })
  );
};

const filterResults = (games: ParsedPGN[], result: Result) => {
  return games.filter((game) => game.result === result);
};

const percent = (input: number) => {
  if (isNaN(input)) {
    return "0%";
  }
  return `${Math.floor(input * 100)}%`;
};

const getStatisticsByPeriod = ({
  gamesByPeriod,
  winsByPeriod,
  losesByPeriod,
  drawsByPeriod,
}: {
  gamesByPeriod: GamesByPeriod;
  winsByPeriod: GamesByPeriod;
  losesByPeriod: GamesByPeriod;
  drawsByPeriod: GamesByPeriod;
}) => {
  return Object.keys(gamesByPeriod)
    .sort()
    .reduce((stats, key, index) => {
      const gamesThisMonth = gamesByPeriod[key]?.length ?? 0;
      const winsThisMonth = winsByPeriod[key]?.length ?? 0;
      const losesThisMonth = losesByPeriod[key]?.length ?? 0;
      const drawsThisMonth = drawsByPeriod[key]?.length ?? 0;

      const previous = stats[index - 1]?.total;
      const totalGames = gamesThisMonth + (previous?.count ?? 0);
      const totalWins = winsThisMonth + (previous?.wins?.total ?? 0);
      const totalLoses = losesThisMonth + (previous?.loses?.total ?? 0);
      const totalDraws = drawsThisMonth + (previous?.draws?.total ?? 0);

      const item = {
        date: key,
        month: {
          count: gamesThisMonth,
          wins: totalPercent(winsThisMonth, gamesThisMonth),
          loses: totalPercent(losesThisMonth, gamesThisMonth),
          draws: totalPercent(drawsThisMonth, gamesThisMonth),
        },
        total: {
          count: totalGames,
          wins: totalPercent(totalWins, totalGames),
          loses: totalPercent(totalLoses, totalGames),
          draws: totalPercent(totalDraws, totalGames),
        },
      };
      stats.push(item);
      return stats;
    }, [] as ByMonth[]);
};

const main = async () => {
  const games = [
    ...(await lichess.getGames(username)),
    ...(await chessDotCom.getGames(username)),
  ];
  const gamesAsWhite = filterColor(games, "White");
  const winsAsWhite = filterResults(gamesAsWhite, "1-0");
  const losesAsWhite = filterResults(gamesAsWhite, "0-1");
  const drawsAsWhite = filterResults(gamesAsWhite, "1/2-1/2");

  const gamesAsBlack = filterColor(games, "Black");
  const winsAsBlack = filterResults(gamesAsBlack, "0-1");
  const losesAsBlack = filterResults(gamesAsBlack, "1-0");
  const drawsAsBlack = filterResults(gamesAsBlack, "1/2-1/2");

  const gamesByMonth = groupByMonth(games);
  const winsByMonth = groupByMonth([...winsAsWhite, ...winsAsBlack]);
  const losesByMonth = groupByMonth([...losesAsWhite, ...losesAsBlack]);
  const drawsByMonth = groupByMonth([...drawsAsWhite, ...drawsAsBlack]);

  const gamesByDate = groupByDate(games);
  const winsByDate = groupByDate([...winsAsWhite, ...winsAsBlack]);
  const losesByDate = groupByDate([...losesAsWhite, ...losesAsBlack]);
  const drawsByDate = groupByDate([...drawsAsWhite, ...drawsAsBlack]);

  const openings = new Set(
    games
      .map(
        (game) =>
          game.headers
            ?.find((header) => header.name === "Opening")
            ?.value.split(":")[0]
      )
      .filter((_) => _ && _.length > 1)
  );

  console.log({
    total: games.length,
    wins: totalPercent(winsAsWhite.length + winsAsBlack.length, games.length),
    loses: totalPercent(
      losesAsWhite.length + losesAsBlack.length,
      games.length
    ),
    draws: totalPercent(
      drawsAsWhite.length + drawsAsBlack.length,
      games.length
    ),
    white: {
      total: gamesAsWhite.length,
      wins: totalPercent(winsAsWhite.length, gamesAsWhite.length),
      loses: totalPercent(losesAsWhite.length, gamesAsWhite.length),
      draws: totalPercent(drawsAsWhite.length, gamesAsWhite.length),
    },
    black: {
      total: gamesAsBlack.length,
      wins: totalPercent(winsAsBlack.length, gamesAsBlack.length),
      loses: totalPercent(losesAsBlack.length, gamesAsBlack.length),
      draws: totalPercent(drawsAsBlack.length, gamesAsBlack.length),
    },
    byMonth: getStatisticsByPeriod({
      gamesByPeriod: gamesByMonth,
      winsByPeriod: winsByMonth,
      losesByPeriod: losesByMonth,
      drawsByPeriod: drawsByMonth,
    }),
    byDate: getStatisticsByPeriod({
      gamesByPeriod: gamesByDate,
      winsByPeriod: winsByDate,
      losesByPeriod: losesByDate,
      drawsByPeriod: drawsByDate,
    }),
    openings,
  });
};

await main();
