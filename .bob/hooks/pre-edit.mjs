#!/usr/bin/env node
// pre-edit.mjs — cloud-iac pre-edit hook
// Runs terraform fmt check on any .tf file being edited.
// Does not run terraform validate (requires initialized providers — too slow for pre-edit).
//
// Bob hook event: tool:edit (fires before file writes)
// Bob passes the event as JSON on stdin.
//
// Exit codes: 0 = allow edit; non-zero = block edit and surface error to agent.

import { execSync } from "node:child_process";
import { dirname } from "node:path";

let event;
try {
  const raw = [];
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw.push(chunk);
  event = JSON.parse(raw.join(""));
} catch {
  process.exit(0);
}

const path = event?.tool_input?.path ?? "";
if (!path.endsWith(".tf") && !path.endsWith(".tfvars")) process.exit(0);

try {
  // terraform fmt -check: exits non-zero if file needs formatting
  execSync(`terraform fmt -check "${path}"`, { stdio: "pipe" });
} catch (e) {
  const msg = e.stderr?.toString().trim() || e.stdout?.toString().trim() || e.message;
  console.error(`terraform fmt: file is not formatted.\n\nRun: terraform fmt "${path}"\n\n${msg}`);
  process.exit(1);
}

process.exit(0);
