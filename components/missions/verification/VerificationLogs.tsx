import { CircleCheckBig } from "lucide-react";
import { LOG_LEVEL_BADGE, type LogLevel } from "@/lib/investigation";

const LEVELS: LogLevel[] = ["INFO", "DEBUG", "SQL", "WARN"];

/** Parses "HH:MM:SS.mmm LEVEL message" into its parts for rendering. */
function parse(line: string) {
  const match = line.match(/^(\S+)\s+(\S+)\s+(.*)$/);
  if (!match) return { time: "", level: "INFO" as LogLevel, message: line };
  const level = (LEVELS.includes(match[2] as LogLevel) ? match[2] : "INFO") as LogLevel;
  return { time: match[1], level, message: match[3] };
}

export function VerificationLogs({
  logs,
  healthy,
}: {
  logs: string[];
  healthy: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white">Recent Logs (After Fix)</h3>

      <div className="thin-scroll mt-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-base-950/60 p-3">
        <ul className="min-w-[30rem] font-mono text-[0.68rem] leading-relaxed">
          {logs.map((line, i) => {
            const { time, level, message } = parse(line);
            return (
              <li key={i} className="flex items-center gap-3 py-0.5">
                <span className="shrink-0 text-slate-500">{time}</span>
                <span
                  className={`inline-flex w-12 shrink-0 justify-center rounded border px-1.5 py-0.5 text-[0.55rem] font-bold tracking-wide ${LOG_LEVEL_BADGE[level]}`}
                >
                  {level}
                </span>
                <span className="flex-1 whitespace-pre text-slate-300">
                  {message}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {healthy && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3">
          <CircleCheckBig
            aria-hidden
            className="mt-px h-4 w-4 shrink-0 text-emerald-400"
            strokeWidth={2.2}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200">
              No errors detected
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
              Everything looks good! The signup flow is healthy.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
