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

export const TIMEOUT_MS = 60_000; // per request; a busy house is ~9 MB
export const MAX_WAIT_MS = 60_000; // longest pause between tries, whatever Retry-After asks

// One request with retries on 429 (honoring Retry-After, capped), 5xx, network errors, timeouts and bodies
// that are not JSON. `label` names it in errors, so callers choose what is safe to print (never a secret).
async function request(url: string, init: RequestInit, label: string, deps: Deps): Promise<JsonResult> {
  for (let retry = 0; ; retry++) {
    let wait = backoffMs(retry), failure: string;
    try {
      const res = await deps.fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) return { body: await res.json(), headers: res.headers, status: res.status };
      if (!retryable(res.status)) throw new Error(`${res.status} ${label}`, { cause: "final" });
      failure = `${res.status} ${label}`;
      const after = Number(res.headers.get("retry-after"));
      if (res.status === 429 && after > 0) wait = after * 1000;
    } catch (e) {
      if ((e as Error).cause === "final") throw e;
      failure = `${(e as Error).message} (${label})`; // network error, timeout, or a body that is not JSON
    }
    if (retry >= RETRIES) throw new Error(failure);
    await deps.sleep(Math.min(wait, MAX_WAIT_MS));
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
