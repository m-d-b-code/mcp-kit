/* eslint-disable no-console */
// stderr only: stdout would be the protocol channel if a stdio transport is ever added.

export type Level = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, ...rest: unknown[]): void;
  info(message: string, ...rest: unknown[]): void;
  warn(message: string, ...rest: unknown[]): void;
  error(message: string, ...rest: unknown[]): void;
}

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * `levelVariable` names the project's own variable (`DEALABS_LOG_LEVEL`…), read at every line so
 * that a test can change it. An unknown level means `info`.
 */
export function loggerFactory(
  levelVariable?: string,
  env: NodeJS.ProcessEnv = process.env,
): (scope: string) => Logger {
  const threshold = () => {
    const raw = ((levelVariable && env[levelVariable]) || "info").toLowerCase();
    return (ORDER as Partial<Record<string, number>>)[raw] ?? ORDER.info;
  };
  return (scope) => {
    const emit =
      (level: Level) =>
      (message: string, ...rest: unknown[]): void => {
        if (ORDER[level] >= threshold()) console.error(`[${level}] ${scope}: ${message}`, ...rest);
      };
    return { debug: emit("debug"), info: emit("info"), warn: emit("warn"), error: emit("error") };
  };
}
