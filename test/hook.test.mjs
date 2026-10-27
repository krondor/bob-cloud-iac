import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(ROOT, ".bob", "hooks", "post-edit-fmt.mjs");
const SETTINGS = join(ROOT, ".bob", "settings.json");

const VALID_EVENTS = [
  "SessionStart", "UserPromptSubmit", "PreCompact", "PostCompact", "PreToolUse", "PostToolUse", "Stop",
];

// Stub `terraform`: `fmt -check <file>` exits 3 when the file contains the word BAD.
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "bob-hook-"));
  const bin = join(dir, "bin");
  const ws = join(dir, "ws");
  mkdirSync(bin);
  mkdirSync(ws);
  const stub = join(bin, "terraform");
  writeFileSync(
    stub,
    '#!/bin/sh\nif [ "$1" = fmt ] && grep -q BAD "$3"; then echo "needs fmt" >&2; exit 3; fi\nexit 0\n',
  );
  chmodSync(stub, 0o755);
  return { dir, bin, ws };
}

function runHook({ ws, bin }, path, { rawStdin, pathEnv } = {}) {
  const input =
    rawStdin ??
    JSON.stringify({
      session_id: "t",
      cwd: ws,
      hook_event_name: "PostToolUse",
      tool_name: "write_file",
      tool_input: { path },
      tool_use_id: "x",
    });
  return spawnSync(process.execPath, [HOOK], {
    input,
    encoding: "utf8",
    env: { ...process.env, PATH: pathEnv ?? `${bin}${delimiter}${process.env.PATH}` },
  });
}

test("settings.json uses documented hook events and well-formed handlers", () => {
  const { hooks } = JSON.parse(readFileSync(SETTINGS, "utf8"));
  assert.ok(hooks && typeof hooks === "object", "hooks must be a top-level object");
  for (const [event, groups] of Object.entries(hooks)) {
    assert.ok(VALID_EVENTS.includes(event), `invalid hook event: ${event}`);
    assert.ok(Array.isArray(groups) && groups.length > 0, `${event} must have matcher groups`);
    for (const group of groups) {
      if (group.matcher !== undefined) assert.doesNotThrow(() => new RegExp(group.matcher), `${event} matcher`);
      assert.ok(Array.isArray(group.hooks) && group.hooks.length > 0, `${event} group needs handlers`);
      for (const h of group.hooks) {
        assert.ok(["command", "http"].includes(h.type), `${event} handler type`);
        if (h.type === "command") assert.ok(h.command, `${event} command handler needs a command`);
        if (h.timeout !== undefined) assert.ok(h.timeout > 0, `${event} timeout must be positive`);
      }
    }
  }
});

test("settings.json hook scripts exist and the file-write matcher covers all writing tools", () => {
  const { hooks } = JSON.parse(readFileSync(SETTINGS, "utf8"));
  const group = hooks.PostToolUse[0];
  const re = new RegExp(group.matcher);
  for (const tool of ["write_file", "apply_diff", "insert_content", "search_and_replace"]) {
    assert.ok(re.test(tool), `matcher must cover ${tool}`);
  }
  assert.equal(re.test("read_file"), false);
  for (const h of group.hooks) {
    const script = h.command.split(/\s+/).find((t) => t.endsWith(".mjs"));
    assert.ok(script && existsSync(join(ROOT, script)), `missing hook script: ${script}`);
  }
});

test("hook is silent and exits 0 for a correctly formatted .tf file", () => {
  const sb = sandbox();
  try {
    writeFileSync(join(sb.ws, "good.tf"), "ok\n");
    const res = runHook(sb, "good.tf");
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
  } finally {
    rmSync(sb.dir, { recursive: true, force: true });
  }
});

test("hook reports a format failure on stdout and still exits 0 (PostToolUse cannot block)", () => {
  const sb = sandbox();
  try {
    writeFileSync(join(sb.ws, "bad.tf"), "BAD\n");
    const res = runHook(sb, "bad.tf");
    assert.equal(res.status, 0);
    assert.match(res.stdout, /fmt -check failed for bad\.tf/);
    assert.match(res.stdout, /needs fmt/);
  } finally {
    rmSync(sb.dir, { recursive: true, force: true });
  }
});

test("hook also checks .tfvars files", () => {
  const sb = sandbox();
  try {
    writeFileSync(join(sb.ws, "dev.tfvars"), "BAD\n");
    assert.match(runHook(sb, "dev.tfvars").stdout, /fmt -check failed for dev\.tfvars/);
  } finally {
    rmSync(sb.dir, { recursive: true, force: true });
  }
});

test("hook passes through non-HCL files, missing files, and malformed input", () => {
  const sb = sandbox();
  try {
    writeFileSync(join(sb.ws, "notes.md"), "BAD\n");
    for (const res of [
      runHook(sb, "notes.md"),
      runHook(sb, "absent.tf"),
      runHook(sb, "x", { rawStdin: "not json" }),
      runHook(sb, "x", { rawStdin: "" }),
    ]) {
      assert.equal(res.status, 0);
      assert.equal(res.stdout, "");
    }
  } finally {
    rmSync(sb.dir, { recursive: true, force: true });
  }
});

test("hook fails open with a stderr-only notice when the binary is missing", () => {
  const sb = sandbox();
  try {
    writeFileSync(join(sb.ws, "bad.tf"), "BAD\n");
    const res = runHook(sb, "bad.tf", { pathEnv: join(sb.dir, "empty") });
    assert.equal(res.status, 0);
    assert.equal(res.stdout, "");
    assert.match(res.stderr, /could not run "terraform"/);
  } finally {
    rmSync(sb.dir, { recursive: true, force: true });
  }
});

test("hook does not interpret shell metacharacters in the path", () => {
  const sb = sandbox();
  try {
    const name = "a$(touch pwned).tf";
    writeFileSync(join(sb.ws, name), "BAD\n");
    runHook(sb, name);
    assert.deepEqual(readdirSync(sb.ws), [name], "no extra file may be created by command injection");
  } finally {
    rmSync(sb.dir, { recursive: true, force: true });
  }
});
