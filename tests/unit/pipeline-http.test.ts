// Battle.net requests for the price pipeline, with a fake fetch (no network)
import { describe, expect, it } from "vitest";
import { getJson, getToken } from "../../src/pipeline/http.ts";

type Call = { url: string; init?: RequestInit };
function fakeFetch(responses: Response[]) {
  const calls: Call[] = [];
  const fetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift();
    if (!r) throw new Error("no more responses");
    return r;
  };
  return { fetch, calls };
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const noSleep = async () => {};

describe("getToken", () => {
  it("asks Battle.net for a client-credentials token with Basic auth", async () => {
    const { fetch, calls } = fakeFetch([json({ access_token: "tok123", token_type: "bearer", expires_in: 86399 })]);
    const token = await getToken("my-id", "my-secret", { fetch, sleep: noSleep });
    expect(token).toBe("tok123");
    expect(calls).toHaveLength(1);
    const { url, init } = calls[0];
    expect(url).toBe("https://oauth.battle.net/token");
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    // base64("my-id:my-secret")
    expect(headers.get("authorization")).toBe("Basic bXktaWQ6bXktc2VjcmV0");
    expect(headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    expect(String(init?.body)).toBe("grant_type=client_credentials");
  });

  it("fails without retrying on a refused secret, and never puts the secret in the error", async () => {
    const { fetch, calls } = fakeFetch([json({ error: "invalid_client" }, 401)]);
    const err = await getToken("my-id", "my-secret", { fetch, sleep: noSleep }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("401");
    expect((err as Error).message).not.toContain("my-secret");
    expect(calls).toHaveLength(1);
  });
  it("retries the token request on a Battle.net server error", async () => {
    const { fetch, calls } = fakeFetch([json({}, 503), json({ access_token: "tok" })]);
    expect(await getToken("i", "s", { fetch, sleep: noSleep })).toBe("tok");
    expect(calls).toHaveLength(2);
  });
});

describe("getJson", () => {
  const url = "https://us.api.blizzard.com/data/wow/ruleset/2/auctions/?namespace=dynamic-forever-us";

  it("sends the token as a Bearer header and returns the body and headers", async () => {
    const { fetch, calls } = fakeFetch([json({ auctions: [] }, 200, { "last-modified": "Thu, 19 Nov 2026 15:04:11 GMT" })]);
    const res = await getJson(url, "tok123", { fetch, sleep: noSleep });
    expect(res.body).toEqual({ auctions: [] });
    expect(res.headers.get("last-modified")).toBe("Thu, 19 Nov 2026 15:04:11 GMT");
    expect(calls[0].url).toBe(url);
    expect(new Headers(calls[0].init?.headers).get("authorization")).toBe("Bearer tok123");
  });

  it("retries a server error after a pause", async () => {
    const waits: number[] = [];
    const { fetch, calls } = fakeFetch([json({}, 503), json({ ok: 1 })]);
    const res = await getJson(url, "t", { fetch, sleep: async (ms) => void waits.push(ms) });
    expect(res.body).toEqual({ ok: 1 });
    expect(calls).toHaveLength(2);
    expect(waits).toHaveLength(1);
    expect(waits[0]).toBeGreaterThan(0);
  });
  it("waits as long as a 429 asks before trying again", async () => {
    const waits: number[] = [];
    const { fetch } = fakeFetch([json({}, 429, { "retry-after": "7" }), json({ ok: 1 })]);
    await getJson(url, "t", { fetch, sleep: async (ms) => void waits.push(ms) });
    expect(waits).toEqual([7000]);
  });

  it("gives up after 3 retries and names the status", async () => {
    const { fetch, calls } = fakeFetch([json({}, 502), json({}, 502), json({}, 502), json({}, 502)]);
    const err = await getJson(url, "t", { fetch, sleep: noSleep }).catch((e: Error) => e);
    expect((err as Error).message).toContain("502");
    expect(calls).toHaveLength(4);
  });

  it("does not retry a missing page", async () => {
    const { fetch, calls } = fakeFetch([json({}, 404)]);
    await expect(getJson(url, "t", { fetch, sleep: noSleep })).rejects.toThrow("404");
    expect(calls).toHaveLength(1);
  });

  it("caps a long Retry-After at a minute, so a run never outlasts its job", async () => {
    const waits: number[] = [];
    const { fetch } = fakeFetch([json({}, 429, { "retry-after": "3600" }), json({ ok: 1 })]);
    await getJson(url, "t", { fetch, sleep: async (ms) => void waits.push(ms) });
    expect(waits).toEqual([60000]);
  });

  it("retries a network error and a body that is not JSON", async () => {
    let n = 0;
    const fetch = async () => {
      n++;
      if (n === 1) throw new TypeError("fetch failed: ECONNRESET");
      if (n === 2) return new Response("<html>gateway</html>", { status: 200 });
      return json({ ok: 1 });
    };
    expect((await getJson(url, "t", { fetch, sleep: noSleep })).body).toEqual({ ok: 1 });
    expect(n).toBe(3);
  });

  it("gives up on a network error after 3 retries", async () => {
    let n = 0;
    const fetch = async (): Promise<Response> => { n++; throw new TypeError("fetch failed"); };
    await expect(getJson(url, "t", { fetch, sleep: noSleep })).rejects.toThrow("fetch failed");
    expect(n).toBe(4);
  });

  it("sends every request with a timeout signal", async () => {
    const { fetch, calls } = fakeFetch([json({ ok: 1 })]);
    await getJson(url, "t", { fetch, sleep: noSleep });
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });
});
