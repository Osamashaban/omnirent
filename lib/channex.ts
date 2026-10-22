// The connection to Channex (https://channex.io), the service that passes
// properties, prices and bookings to Airbnb, Booking.com and the other
// channels. Server only: the key never reaches a browser.
//
// CHANNEX_API_KEY comes from the Channex account (Organization -> API keys).
// CHANNEX_API_URL picks the server: staging (the default) until Channex
// certifies Omnirent and gives production keys.

const STAGING_URL = "https://staging.channex.io/api/v1";

export function channexConfigured(): boolean {
  return Boolean(process.env.CHANNEX_API_KEY);
}

export type ChannexAnswer = { status: number; body: unknown };

export class ChannexError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Channex answered ${status}`);
  }
}

// One call to Channex. A refused call throws ChannexError with Channex's
// answer; a network failure or timeout throws it with status 0.
export async function channex(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<ChannexAnswer> {
  const key = process.env.CHANNEX_API_KEY;
  if (!key) throw new ChannexError(0, null);
  const base = (process.env.CHANNEX_API_URL || STAGING_URL).replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: { "user-api-key": key, "content-type": "application/json", accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new ChannexError(0, null);
  }
  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) throw new ChannexError(res.status, parsed);
  return { status: res.status, body: parsed };
}

// The id in a single-record answer ({ data: { id } }).
export function answerId(answer: ChannexAnswer): string {
  const id = (answer.body as { data?: { id?: unknown } } | null)?.data?.id;
  if (typeof id !== "string" || !id) throw new ChannexError(502, answer.body);
  return id;
}

// The ids in a list answer ({ data: [{ id }] }).
export function answerIds(answer: ChannexAnswer): string[] {
  const data = (answer.body as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data.map((d) => (d as { id?: unknown })?.id).filter((id): id is string => typeof id === "string") : [];
}
