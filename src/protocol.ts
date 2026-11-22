// What both ends of the bridge must agree on: the gateway (client) imports this module as well, so the
// two sides cannot drift apart. No dependency, not even on the MCP SDK.

/** Header carrying the shared secret. Neutral name: a generic bridge has no business knowing the project's. */
export const TOKEN_HEADER = "x-mcp-token";

/** The current protocol revision: what a gateway pins, and all a server speaks with `legacy: "reject"`. */
export const PROTOCOL_VERSION = "2026-07-28";

export const MCP_PATH = "/mcp";

/** Unauthenticated, for the container healthcheck. */
export const HEALTH_PATH = "/health";

/** One run of a project's own timer, as reported to the gateway (`POST <root>/<job>`). */
export interface JobRun {
  ok: boolean;
  /** One line: what the run did, or what failed. */
  detail: string;
  /** Epoch milliseconds. */
  startedAt: number;
}

/** A start further back than this is taken for a clock error, and replaced by the receipt time. */
export const JOB_RUN_MAX_AGE_MS = 86_400_000;

/**
 * The receiving side: `undefined` when `ok` is not a boolean (the only field a run cannot do
 * without); otherwise the run, with a missing detail emptied and an implausible start replaced by
 * `now`.
 */
export function parseJobRun(body: unknown, now: number = Date.now()): JobRun | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const { ok, detail, startedAt } = body as Record<string, unknown>;
  if (typeof ok !== "boolean") return undefined;
  const plausible =
    typeof startedAt === "number" && startedAt <= now && startedAt > now - JOB_RUN_MAX_AGE_MS;
  return {
    ok,
    detail: typeof detail === "string" ? detail : "",
    startedAt: plausible ? startedAt : now,
  };
}
