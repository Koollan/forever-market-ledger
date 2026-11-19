// Battle.net requests for the price pipeline. Pure of globals: fetch and sleep are passed in,
// so tests need no network. Runs under Node's built-in TypeScript support: erasable syntax only,
// imports with explicit .ts extensions.
// Auth: OAuth client credentials, https://oauth.battle.net/token (see planning/t3/research/blizzard-api.md).

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type Deps = { fetch: Fetch; sleep: (ms: number) => Promise<void> };
export type JsonResult = { body: unknown; headers: Headers; status: number };

export const TOKEN_URL = "https://oauth.battle.net/token";
export const RETRIES = 3; // after the first try
const backoffMs = (retry: number) => 2000 * 2 ** retry; // 2 s, 4 s, 8 s
const retryable = (status: number) => status === 429 || status >= 500;

// One request with retries on 429 (honoring Retry-After) and 5xx. `label` names it in errors,
// so callers choose what is safe to print (never a secret).
async function request(url: string, init: RequestInit, label: string, deps: Deps): Promise<JsonResult> {
  for (let retry = 0; ; retry++) {
    const res = await deps.fetch(url, init);
    if (res.ok) return { body: await res.json(), headers: res.headers, status: res.status };
    if (!retryable(res.status) || retry >= RETRIES) throw new Error(`${res.status} ${label}`);
    const after = Number(res.headers.get("retry-after"));
    await deps.sleep(res.status === 429 && after > 0 ? after * 1000 : backoffMs(retry));
  }
}

export async function getToken(id: string, secret: string, deps: Deps): Promise<string> {
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const { body } = await request(TOKEN_URL, {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  }, "token request failed", deps);
  const token = (body as { access_token?: unknown }).access_token;
  if (typeof token !== "string") throw new Error("token response has no access_token");
  return token;
}

// GET a Game Data API URL with the token as a Bearer header.
export function getJson(url: string, token: string, deps: Deps): Promise<JsonResult> {
  return request(url, { headers: { authorization: `Bearer ${token}` } }, url, deps);
}
