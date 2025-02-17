import { createHash, randomBytes } from "crypto";
import open from "open";
import { URL } from "url";
import { cacheJSON } from "./cache";
import { getJSON } from "./fetch";

const CLIENT_ID = "chess-coach";
const PORT = 1500;
const REDIRECT_URL = `http://localhost:${PORT}`;

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
    return cacheJSON(username, () => {
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
        await open(`https://lichess.org/oauth?${params}`);
      });
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
    console.log(`
        fetch("https://lichess.org/api/token", {
            method : "POST",
            headers : {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body : new URLSearchParams(${JSON.stringify({
              grant_type: "authorization_code",
              code,
              code_verifier: verifier,
              redirect_uri: REDIRECT_URL,
              client_id: CLIENT_ID,
            })})            
        })

        `);
    const json = await getJSON(`https://lichess.org/api/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });
    console.log(json);
    return json.access_token;
  }
  private async auth(username: string) {
    const { code, verifier } = await this.getCode(username);
    const token = await this.getToken(code, verifier);
  }
  async getUser(username: string) {
    await this.auth(username);
  }
  async getGames(username: string) {
    await this.auth(username);
    return [];
  }
}
