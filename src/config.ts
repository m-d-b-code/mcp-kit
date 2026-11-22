import { ConfigError } from "./errors.js";

export const MIN_TOKEN_LENGTH = 32;

/** Trimmed value, `null` when absent or blank. */
export function readOptional(env: NodeJS.ProcessEnv, name: string): string | null {
  return env[name]?.trim() || null;
}

// No default and no tokenless mode: a missing guard would otherwise never be noticed.
export function readToken(env: NodeJS.ProcessEnv, name: string): string {
  const token = readOptional(env, name);
  if (!token) throw new ConfigError(`${name} is missing from the environment.`);
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new ConfigError(`${name} is shorter than ${MIN_TOKEN_LENGTH} characters.`);
  }
  return token;
}

/** An integer within bounds; absent or blank gives `fallback`. */
export function readInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = readOptional(env, name) ?? String(fallback);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`invalid ${name}: ${JSON.stringify(raw)}`);
  }
  return value;
}

export interface ListenConfig {
  /** Shared secret expected in `x-mcp-token`; the gateway sends the same one. */
  token: string;
  host: string;
  port: number;
}

/**
 * `<PREFIX>_MCP_TOKEN` (required), `<PREFIX>_MCP_PORT` and `<PREFIX>_MCP_HOST`: the part of
 * every project's configuration that the bridge dictates.
 */
export function readListenConfig(
  env: NodeJS.ProcessEnv,
  prefix: string,
  defaultPort: number,
): ListenConfig {
  return {
    token: readToken(env, `${prefix}_MCP_TOKEN`),
    // Inside a container the loopback is reachable by nobody else.
    host: readOptional(env, `${prefix}_MCP_HOST`) ?? "0.0.0.0",
    port: readInteger(env, `${prefix}_MCP_PORT`, defaultPort, 0, 65535),
  };
}
