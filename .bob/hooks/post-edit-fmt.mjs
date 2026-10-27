#!/usr/bin/env node
// post-edit-fmt.mjs — cloud-iac PostToolUse hook
// Checks formatting of an HCL file after Bob writes it and reports findings to the agent.
//
// Bob passes the event as JSON on stdin: { cwd, hook_event_name, tool_name, tool_input: { path }, ... }.
// PostToolUse cannot block: the tool has already run. Exit code is always 0. Whatever this script
// prints to stdout is added beside the tool result, so the agent sees the finding and can fix it.
// Diagnostics for the operator (for example a missing binary) go to stderr and stay out of model context.
//
// Does not run `validate`: it needs `init` and initialized providers.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const BINARY = "terraform"; // Replaced by a toolchain-table lookup in a later change.
const EXTENSIONS = [".tf", ".tfvars"];

let event;
try {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const path = String(event?.tool_input?.path ?? "");
if (!EXTENSIONS.some((ext) => path.endsWith(ext))) process.exit(0);

const cwd = event?.cwd || process.cwd();
const file = resolve(cwd, path);
if (!existsSync(file)) process.exit(0);

const res = spawnSync(BINARY, ["fmt", "-check", file], { cwd, encoding: "utf8" });

if (res.error) {
  // Binary missing or not executable: fail open, tell the operator only.
  console.error(`post-edit-fmt: could not run "${BINARY}" (${res.error.code ?? res.error.message}); format check skipped.`);
  process.exit(0);
}

if (res.status !== 0) {
  const detail = (res.stderr || res.stdout || "").trim();
  console.log(
    `${BINARY} fmt -check failed for ${path} (exit ${res.status}). ` +
      `Run \`${BINARY} fmt ${path}\` or fix the syntax.${detail ? `\n${detail}` : ""}`,
  );
}

process.exit(0);
