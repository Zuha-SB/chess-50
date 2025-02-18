import { createHash, randomBytes } from "crypto";
import open from "open";
import { URL } from "url";
import { cache } from "./cache";
import { fetchJson, fetchText } from "./fetch";
import pgnParse from "pgn-parser";

const CLIENT_ID = "chess-coach";
const PORT = 1500;
const REDIRECT_URL = `http://localhost:${PORT}/`;
const HOST = "https://lichess.org/";

function generatePKCEPair() {
  const NUM_OF_BYTES = 22; // Total of 44 characters (1 Bytes = 2 char) (standard states that: 43 chars <= verifier <= 128 chars)
  const HASH_ALG = "sha256";
  const randomVerifier = randomBytes(NUM_OF_BYTES).toString("hex");
  const hash = createHash(HASH_ALG).update(randomVerifier).digest("base64");
  const challenge = hash
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, ""); // Clean base64 to make it URL safe
  return { verifier: randomVerifier, challenge };
}

export class Lichess {
  private async getCode(username: string) {
    return new Promise(async (resolve) => {
      const { verifier, challenge } = generatePKCEPair();
      const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URL,
        code_challenge_method: "S256",
        code_challenge: challenge,
        username,
      });
      const server = Bun.serve({
        fetch(req) {
          const code = new URL(req.url).searchParams.get("code") ?? "";
          resolve({
            code,
            verifier,
          });
          server.stop();
          return new Response("Please manually close this window");
        },
        port: PORT,
      });
      await open(`${HOST}oauth?${params}`);
    });
  }
  private async getToken(code: string, verifier: string) {
    const formData = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URL,
      client_id: CLIENT_ID,
    });
    const json = await fetchJson(`${HOST}api/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });
    return json.access_token;
  }
  private async auth(username: string) {
    return cache(username, async () => {
      const { code, verifier } = await this.getCode(username);
      const token = await this.getToken(code, verifier);
      return token;
    });
  }
  private async getText(
    username: string,
    url: string,
    init?: FetchRequestInit
  ) {
    const token = await this.auth(username);
    return fetchText(`${HOST}api${url}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      ...init,
    });
  }
  private async getJSON(
    username: string,
    url: string,
    init?: FetchRequestInit
  ) {
    const text = await this.getText(username, url, init);
    return JSON.parse(text);
  }
  async getUser(username: string) {
    return this.getJSON(username, "/account");
  }
  async getGames(username: string) {
    const params = new URLSearchParams({
      perfType: [
        "ultraBullet",
        "bullet",
        "blitz",
        "rapid",
        "classical",
        "correspondence",
      ].join(","),
      literate: "true",
      division: "true",
      accuracy: "true",
      clocks: "true",
      evals: "true",
      opening: "true",
      pgnInJson: "true",
    });
    const games = await this.getText(
      username,
      `/games/user/${username}?${params}`,
      {
        headers: {
          Accept: "application/x-ndjson",
        },
      }
    );
    return pgnParse.parse(
      games
        .split("\n")
        .filter((_) => _)
        .map((line) => JSON.parse(line))
        .map((game) => game.pgn)
        .join("\n\n")
    );
  }
}
