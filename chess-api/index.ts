import { ChessDotCom } from "./chess-dot-com";
import { Lichess } from "./lichess";

const chessDotCom = new ChessDotCom();
const lichess = new Lichess();
const username = "nagolyhprum";

const main = async () => {
  {
    const user = await chessDotCom.getUser(username);
    const games = await chessDotCom.getGames(username);
    console.log("chess.com", user, games.length);
  }
  {
    const user = await lichess.getUser(username);
    const games = await lichess.getGames(username);
    console.log("lichess", user, games.length);
  }
};

await main();
