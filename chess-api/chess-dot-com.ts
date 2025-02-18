import { fetchJson } from "./fetch";
import pgnParse, { type ParsedPGN } from "pgn-parser";

export class ChessDotCom {
  async getUser(username: string) {
    return fetchJson(`https://api.chess.com/pub/player/${username}`);
  }
  async getGames(username: string): Promise<ParsedPGN[]> {
    const { archives } = await fetchJson(
      `https://api.chess.com/pub/player/${username}/games/archives`
    );
    const games = await archives.reduce(async (promise, url) => {
      const acc = await promise;
      const { games } = await fetchJson(url);
      return [...acc, ...games];
    }, Promise.resolve([]));
    return games
      .filter((game) => game.time_class !== "daily")
      .flatMap((game) => pgnParse.parse(game.pgn));
  }
}
