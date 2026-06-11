type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

/**
 * Single-line JSON-encoded log so prod logs can be ingested by Dokploy/whatever
 * shipper. Pino is overkill for one app; if we get more than a handful of
 * structured-log call sites, replace with pino.
 */
export function log(level: LogLevel, msg: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    lvl: level,
    msg,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
