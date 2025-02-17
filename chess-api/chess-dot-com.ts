import { getJSON } from "./fetch";

export class ChessDotCom {
  async getUser(username: string) {
    return getJSON(`https://api.chess.com/pub/player/${username}`);
  }
  async getGames(username: string) {
    const { archives } = await getJSON(
      `https://api.chess.com/pub/player/${username}/games/archives`
    );
    const games = await archives.reduce(async (promise, url) => {
      const acc = await promise;
      const { games } = await getJSON(url);
      return [...acc, ...games];
    }, Promise.resolve([]));
    return games.filter((game) => game.time_class !== "daily");
  }
}
