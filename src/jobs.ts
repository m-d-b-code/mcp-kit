// What the gateway learns of a server's own timer: it can then watch it like any cron, and notice
// when it stops — a stopped timer leaves no error behind, only an expected run that
// never comes.

import { errorMessage } from "./errors.js";
import { type Logger, loggerFactory } from "./log.js";
import { type JobRun, TOKEN_HEADER } from "./protocol.js";

export type ReportRun = (job: string, run: JobRun) => void;

const REPORT_TIMEOUT_MS = 10_000;

/**
 * `JOBS_REPORT_URL` is the root each run appends its name to (`…/sync`), `JOBS_REPORT_TOKEN` the
 * secret it expects. Both or neither: without them nobody listens and nothing is sent. A failed
 * report is only logged — the next run will tell again.
 */
export function jobReporter(
  env: NodeJS.ProcessEnv = process.env,
  log: Logger = loggerFactory()("jobs"),
): ReportRun {
  const root = env.JOBS_REPORT_URL?.trim().replace(/\/+$/, "") ?? "";
  const token = env.JOBS_REPORT_TOKEN?.trim() ?? "";
  if (!root || !token) {
    if (root || token) {
      log.warn("JOBS_REPORT_URL and JOBS_REPORT_TOKEN go together: runs not reported");
    }
    return () => undefined;
  }
  return (job, run) => {
    void fetch(`${root}/${encodeURIComponent(job)}`, {
      method: "POST",
      headers: { "content-type": "application/json", [TOKEN_HEADER]: token },
      body: JSON.stringify(run),
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    }).then(
      (response) => {
        if (!response.ok) log.warn(`run of ${job} not reported: HTTP ${response.status}`);
      },
      (err: unknown) => log.warn(`run of ${job} not reported: ${errorMessage(err)}`),
    );
  };
}
