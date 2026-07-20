/**
 * Mission content validator — `npm run validate:missions`.
 *
 * Reads the live catalogue and stage registries through `lib/mission-validation.ts`,
 * prints findings grouped by mission, and exits non-zero when anything is
 * actually broken. Warnings are printed but do not fail the run: a partially
 * authored mission is a normal state while a mission is being written.
 */

import { getMission } from "../lib/missions";
import {
  groupByMission,
  validateMissions,
  type ValidationIssue,
} from "../lib/mission-validation";

const RESET = "\u001b[0m";
const BOLD = "\u001b[1m";
const DIM = "\u001b[2m";
const RED = "\u001b[31m";
const YELLOW = "\u001b[33m";
const GREEN = "\u001b[32m";

const colour = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: string, text: string) => (colour ? `${code}${text}${RESET}` : text);

function line(issue: ValidationIssue): string {
  const marker =
    issue.severity === "error" ? c(RED, "  ✖") : c(YELLOW, "  ⚠");
  return `${marker} ${c(DIM, `[${issue.stage}]`)} ${issue.message}`;
}

function main(): void {
  const report = validateMissions();

  console.log(c(BOLD, "\nCodeRaid mission content validation\n"));

  for (const group of groupByMission(report.issues)) {
    const title =
      group.missionId === "catalogue"
        ? "Catalogue"
        : `${getMission(group.missionId)?.title ?? group.missionId} ${c(DIM, `(${group.missionId})`)}`;
    console.log(c(BOLD, title));
    for (const issue of group.issues) console.log(line(issue));
    console.log("");
  }

  const summary = [
    `${report.missionsChecked} missions checked`,
    `${report.playableMissionIds.length} fully playable`,
    `${report.errors.length} ${report.errors.length === 1 ? "error" : "errors"}`,
    `${report.warnings.length} ${report.warnings.length === 1 ? "warning" : "warnings"}`,
  ].join(" · ");

  if (report.ok) {
    console.log(c(GREEN, `✓ Mission content is valid — ${summary}`));
    console.log(
      c(DIM, `  Playable: ${report.playableMissionIds.join(", ") || "none"}\n"`.replace(/"$/, "")),
    );
    process.exit(0);
  }

  console.log(c(RED, `✖ Mission content is invalid — ${summary}\n`));
  process.exit(1);
}

main();
