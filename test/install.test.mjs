import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INSTALLER = join(ROOT, "scripts", "install.mjs");
const SLUG = "cloud-iac";
const REVIEWER_SLUG = "iac-reviewer";

function workspace() {
  return mkdtempSync(join(tmpdir(), "bob-install-iac-"));
}

function install(target, ...flags) {
  const res = spawnSync("node", [INSTALLER, target, ...flags], { encoding: "utf8" });
  assert.equal(res.status, 0, `installer failed:\n${res.stdout}\n${res.stderr}`);
  return res.stdout;
}

const modes = (target) => parse(readFileSync(join(target, ".bob", "custom_modes.yaml"), "utf8")).customModes;
const countSlug = (target) => modes(target).filter((m) => m.slug === SLUG).length;

function modesFromSource() {
  return parse(readFileSync(join(ROOT, ".bob", "custom_modes.yaml"), "utf8")).customModes;
}

test("fresh install creates mode, rules, skills and lock file", () => {
  const t = workspace();
  try {
    install(t);
    assert.equal(countSlug(t), 1);
    assert.ok(existsSync(join(t, ".bob", `rules-${SLUG}`, "01-role.md")));
    assert.ok(existsSync(join(t, ".bob", `rules-${REVIEWER_SLUG}`, "01-role.md")));
    assert.ok(existsSync(join(t, ".bob", "skills", "terraform-multi-cloud-patterns", "SKILL.md")));
    const lock = JSON.parse(readFileSync(join(t, ".bob", `${SLUG}.lock.json`), "utf8"));
    assert.ok(lock.version);
    assert.match(lock.files[`.bob/rules-${SLUG}/01-role.md`], /^[0-9a-f]{64}$/);
    assert.match(lock.modes[SLUG], /^[0-9a-f]{64}$/);
    assert.match(lock.modes[REVIEWER_SLUG], /^[0-9a-f]{64}$/);
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("reinstall preserves locally customized rules without --force", () => {
  const t = workspace();
  try {
    install(t);
    const rule = join(t, ".bob", `rules-${SLUG}`, "01-role.md");
    writeFileSync(rule, "# my local customization\n");
    const out = install(t);
    assert.equal(readFileSync(rule, "utf8"), "# my local customization\n");
    assert.match(out, /skip\s+\.bob\/rules-cloud-iac\/01-role\.md/);
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("--force overwrites a locally customized rule", () => {
  const t = workspace();
  try {
    install(t);
    const rule = join(t, ".bob", `rules-${SLUG}`, "01-role.md");
    writeFileSync(rule, "# my local customization\n");
    install(t, "--force");
    assert.equal(readFileSync(rule, "utf8"), readFileSync(join(ROOT, ".bob", `rules-${SLUG}`, "01-role.md"), "utf8"));
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("upgrade replaces an untouched installed file", () => {
  const t = workspace();
  try {
    install(t);
    const lockPath = join(t, ".bob", `${SLUG}.lock.json`);
    const rule = join(t, ".bob", `rules-${SLUG}`, "01-role.md");
    writeFileSync(rule, "# older release\n");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.files[`.bob/rules-${SLUG}/01-role.md`] = createHash("sha256").update(readFileSync(rule)).digest("hex");
    writeFileSync(lockPath, JSON.stringify(lock));
    install(t);
    assert.equal(readFileSync(rule, "utf8"), readFileSync(join(ROOT, ".bob", `rules-${SLUG}`, "01-role.md"), "utf8"));
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("quoted existing slug is recognised; no duplicate mode is appended", () => {
  const t = workspace();
  try {
    mkdirSync(join(t, ".bob"));
    writeFileSync(
      join(t, ".bob", "custom_modes.yaml"),
      'customModes:\n  - slug: "cloud-iac"\n    name: My Custom IaC\n    roleDefinition: mine\n    groups: [read]\n',
    );
    install(t);
    assert.equal(countSlug(t), 1);
    assert.equal(modes(t).find((m) => m.slug === SLUG).name, "My Custom IaC");
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("default install ships templates only: draft status with pending approval", () => {
  const t = workspace();
  try {
    install(t);
    assert.deepEqual(readdirSync(join(t, "specs")), ["TEMPLATE"]);
    const text = readFileSync(join(t, "specs", "TEMPLATE", "spec.md"), "utf8");
    assert.match(text, /^\*\*Status:\*\*\s*draft/m);
    assert.match(text, /^\*\*Requirements approval:\*\*\s*pending/m);
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("--dry-run writes nothing", () => {
  const t = workspace();
  try {
    install(t, "--dry-run");
    assert.deepEqual(readdirSync(t), []);
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("iac-reviewer mode has no edit, mcp, or mode groups; allowedSubagents is [explore]", () => {
  const reviewer = modesFromSource().find((m) => m.slug === REVIEWER_SLUG);
  assert.ok(reviewer, "iac-reviewer must exist");
  const groups = reviewer.groups ?? [];
  for (const forbidden of ["edit", "mcp", "mode"]) {
    assert.equal(groups.includes(forbidden), false, `iac-reviewer must not have ${forbidden}`);
  }
  assert.ok(groups.includes("read"));
  assert.ok(groups.includes("skill"));
  assert.ok(groups.includes("subagent"));
  assert.deepEqual(reviewer.allowedSubagents, ["explore"]);
});

test("cloud-iac mode has fileRegex on edit restricting to terraform and spec paths", () => {
  const mode = modesFromSource().find((m) => m.slug === SLUG);
  assert.ok(mode, "cloud-iac must exist");
  const editGroup = mode.groups.find((g) => Array.isArray(g) && g[0] === "edit");
  assert.ok(editGroup, "cloud-iac must have restricted edit group with fileRegex");
  assert.ok(editGroup[1].fileRegex, "fileRegex must be defined");
});

test("skill versions in SKILL.md match skills-lock.json", () => {
  const lock = JSON.parse(readFileSync(join(ROOT, "skills-lock.json"), "utf8"));
  for (const [name, entry] of Object.entries(lock.skills)) {
    const text = readFileSync(join(ROOT, entry.path), "utf8");
    const fm = parse(text.split(/^---\s*$/m)[1]);
    assert.equal(fm.name, name);
    assert.equal(String(fm.version), entry.version, `${name} version drift`);
  }
});

test("rules directory stays within the size ceiling", () => {
  const rulesDir = join(ROOT, ".bob", "rules-cloud-iac");
  const total = readdirSync(rulesDir).reduce((n, f) => n + readFileSync(join(rulesDir, f), "utf8").length, 0);
  const ceiling = 15000;
  assert.ok(total <= ceiling, `rules are ${total} chars, ceiling is ${ceiling}`);
});
