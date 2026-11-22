/** An error meant to be read as is by the model: returned as text with `isError`, never thrown up. */
export class ToolError extends Error {
  override name = "ToolError";
}

/** The environment cannot start the server: `runMain` turns it into one log line and exit code 2. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

export function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  return typeof value === "string" ? value : String(value);
}
