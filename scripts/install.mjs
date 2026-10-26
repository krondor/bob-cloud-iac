#!/usr/bin/env node
// install.mjs — installs cloud IaC Bob modes and their assets into a target
// workspace's .bob/ folder, without cloning this repo into that workspace.

import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ALL_SLUGS = ["cloud-iac", "iac-reviewer"];
const PRIMARY_SLUG = "cloud-iac";
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("-") && !a.startsWith("--modes=")));
const modesFlagIdx = args.indexOf("--modes");
const positional = args.filter((a, i) => !a.startsWith("-") && (modesFlagIdx === -1 || i !== modesFlagIdx + 1));

let slugsArg = args.find((a) => a.startsWith("--modes="));
if (!slugsArg) {
  const modesIdx = args.indexOf("--modes");
  if (modesIdx !== -1 && args[modesIdx + 1] && !args[modesIdx + 1].startsWith("-")) {
    slugsArg = `--modes=${args[modesIdx + 1]}`;
  }
}
const SLUGS = slugsArg
  ? slugsArg.replace("--modes=", "").split(",").map((s) => s.trim()).filter(Boolean)
  : ALL_SLUGS;

for (const s of SLUGS) {
  if (!ALL_SLUGS.includes(s)) {
    console.error(`Unknown mode slug: "${s}". Available: ${ALL_SLUGS.join(", ")}`);
    process.exit(1);
  }
}

if (flags.has("-h") || flags.has("--help")) {
  console.log(`
Usage:
  npx github:krondor/bob-cloud-iac [target-dir] [options]
  node scripts/install.mjs [target-dir] [options]

By default, installs all modes: ${ALL_SLUGS.join(", ")}

Options:
  --modes a,b           Install only the named mode slugs (comma-separated).
  --dry-run             Print what would change; write nothing.
  --force               Overwrite locally modified files and replace existing mode entries.
  --with-examples       Also install example specs (specs/NNN-*). Off by default.
  --with-hooks          Install .bob/hooks/ and .bob/settings.json if present.
  --no-agents           Skip installing AGENTS.md.
  --no-mcp              Skip installing .bob/mcp.json.example.
  --no-templates        Skip installing spec templates (specs/).
  --no-skills           Skip installing skills in .bob/skills/.
  --no-rules            Skip installing mode rules in .bob/rules-*/.
  --no-mode             Skip updating .bob/custom_modes.yaml.
  -h, --help            Show this help message.
`);
  process.exit(0);
}

let YAML;
try {
  YAML = await import("yaml");
} catch {
  console.error(`Missing dependency "yaml". Run \`npm install\` in ${SRC} first.`);
  process.exit(1);
}
const { parseDocument, isMap, isSeq } = YAML;

const DRY = flags.has("--dry-run");
const FORCE = flags.has("--force");
const WITH_EXAMPLES = flags.has("--with-examples");
const WITH_HOOKS = flags.has("--with-hooks");
const NO_AGENTS = flags.has("--no-agents") || flags.has("--without-agents");
const NO_MCP = flags.has("--no-mcp") || flags.has("--without-mcp");
const NO_TEMPLATES = flags.has("--no-templates") || flags.has("--without-templates");
const NO_SKILLS = flags.has("--no-skills") || flags.has("--without-skills");
const NO_RULES = flags.has("--no-rules") || flags.has("--without-rules");
const NO_MODE = flags.has("--no-mode") || flags.has("--without-mode");

const TARGET = resolve(positional[0] ?? process.cwd());

if (resolve(TARGET) === SRC) {
  console.error("Refusing to install into the source repo itself. Pass a target workspace directory.");
  process.exit(1);
}
if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) {
  console.error(`Target is not a directory: ${TARGET}`);
  process.exit(1);
}

const installed = [];
const log = (msg) => console.log(`${DRY ? "[dry-run] " : ""}${msg}`);

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const posix = (p) => p.split(sep).join("/");
const canon = (v) =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v;
const modeHash = (item) => sha256(JSON.stringify(canon(item.toJSON())));

const LOCK_REL = `.bob/${PRIMARY_SLUG}.lock.json`;
const lockPath = join(TARGET, LOCK_REL);
let prior = { files: {}, modes: {} };
if (existsSync(lockPath)) {
  try {
    const raw = JSON.parse(readFileSync(lockPath, "utf8"));
    prior.files = raw.files ?? {};
    prior.modes = raw.modes ?? {};
    if (raw.mode && !prior.modes[PRIMARY_SLUG]) prior.modes[PRIMARY_SLUG] = raw.mode;
  } catch {
    prior = { files: {}, modes: {} };
  }
}
const pkg = JSON.parse(readFileSync(join(SRC, "package.json"), "utf8"));
const lock = { version: pkg.version, modes: { ...prior.modes }, files: { ...prior.files } };

function ensureDir(p) {
  if (!DRY) mkdirSync(p, { recursive: true });
}

function copy(srcRel, destRel) {
  const src = join(SRC, srcRel);
  const dest = join(TARGET, destRel);
  if (!existsSync(src)) {
    console.error(`Missing source asset: ${srcRel}`);
    process.exit(1);
  }
  if (statSync(src).isDirectory()) {
    for (const entry of readdirSync(src, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      copy(join(srcRel, entry.name), join(destRel, entry.name));
    }
    return;
  }

  const key = posix(destRel);
  const srcHash = sha256(readFileSync(src));
  const existed = existsSync(dest);
  if (existed) {
    const destHash = sha256(readFileSync(dest));
    if (destHash === srcHash) {
      lock.files[key] = srcHash;
      installed.push(destRel);
      return log(`ok     ${destRel} (up to date)`);
    }
    const untouched = prior.files[key] === destHash;
    if (!FORCE && !untouched) {
      return log(`skip   ${destRel} (locally modified or not installed by this tool; use --force to overwrite)`);
    }
  }
  ensureDir(dirname(dest));
  if (!DRY) cpSync(src, dest, { dereference: true, force: true });
  lock.files[key] = srcHash;
  installed.push(destRel);
  log(`${existed ? "update" : "copy  "} ${destRel}`);
}

function installMode(slug) {
  const rel = ".bob/custom_modes.yaml";
  const dest = join(TARGET, rel);
  const srcText = readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
  const srcDoc = parseDocument(srcText);
  const srcModes = srcDoc.get("customModes");
  if (!isSeq(srcModes)) {
    console.error(`Source ${rel} has no customModes sequence.`);
    process.exit(1);
  }
  const srcItem = srcModes.items.find((n) => isMap(n) && n.get("slug") === slug);
  if (!srcItem) {
    console.error(`Mode slug "${slug}" not found in source ${rel}.`);
    process.exit(1);
  }
  const srcHash = modeHash(srcItem);
  installed.push(rel);

  const isNewFile = !existsSync(dest) || readFileSync(dest, "utf8").trim() === "";
  if (isNewFile) {
    ensureDir(dirname(dest));
    if (DRY) {
      lock.modes[slug] = srcHash;
      return log(`append ${rel} (added ${slug})`);
    }
    writeFileSync(dest, "customModes: []\n");
  }

  const destDoc = parseDocument(readFileSync(dest, "utf8"));
  if (destDoc.errors.length > 0 || !isMap(destDoc.contents)) {
    console.error(`${rel} is not valid YAML with a top-level mapping.`);
    process.exit(1);
  }

  const seq = destDoc.get("customModes");
  if (!isSeq(seq)) {
    destDoc.set("customModes", srcDoc.get("customModes"));
    if (!DRY) writeFileSync(dest, destDoc.toString());
    lock.modes[slug] = srcHash;
    return log(`fill   ${rel} (customModes was missing)`);
  }

  const idx = seq.items.findIndex((n) => isMap(n) && n.get("slug") === slug);
  if (idx === -1) {
    if (seq.items.length === 0) seq.flow = false;
    seq.items.push(srcItem);
    if (!DRY) writeFileSync(dest, destDoc.toString());
    lock.modes[slug] = srcHash;
    return log(`append ${rel} (added ${slug})`);
  }

  const destHash = modeHash(seq.items[idx]);
  if (destHash === srcHash) {
    lock.modes[slug] = srcHash;
    return log(`ok     ${rel} (${slug} up to date)`);
  }
  const untouched = prior.modes[slug] === destHash;
  if (!FORCE && !untouched) {
    return log(`skip   ${rel} (${slug} locally modified or not installed by this tool; use --force to replace it)`);
  }
  seq.items[idx] = srcItem;
  if (!DRY) writeFileSync(dest, destDoc.toString());
  lock.modes[slug] = srcHash;
  log(`replace ${rel} (${slug} entry)`);
}

console.log(`Source: ${SRC}\nTarget: ${TARGET}\nModes:  ${SLUGS.join(", ")}\n`);

if (!NO_MODE) {
  for (const slug of SLUGS) {
    installMode(slug);
  }
}

if (!NO_RULES) {
  for (const slug of SLUGS) {
    const rulesDir = `.bob/rules-${slug}`;
    if (existsSync(join(SRC, rulesDir))) {
      copy(rulesDir, rulesDir);
    }
  }
}

if (!NO_SKILLS) {
  const skillsSrc = join(SRC, ".bob/skills");
  if (existsSync(skillsSrc) && statSync(skillsSrc).isDirectory()) {
    const skillDirs = readdirSync(skillsSrc, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const skill of skillDirs) {
      copy(`.bob/skills/${skill}`, `.bob/skills/${skill}`);
    }
  }
}

if (!NO_MCP && existsSync(join(SRC, ".bob/mcp.json.example"))) {
  copy(".bob/mcp.json.example", ".bob/mcp.json.example");
}

if (!NO_AGENTS && existsSync(join(SRC, "AGENTS.md"))) {
  copy("AGENTS.md", "AGENTS.md");
}

if (!NO_TEMPLATES) {
  const specsSrc = join(SRC, "specs");
  if (existsSync(specsSrc) && statSync(specsSrc).isDirectory()) {
    const specDirs = readdirSync(specsSrc, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name);
    for (const specDir of specDirs) {
      if (specDir === "TEMPLATE" || WITH_EXAMPLES) {
        copy(`specs/${specDir}`, `specs/${specDir}`);
      }
    }
  }
}

if (WITH_HOOKS) {
  if (existsSync(join(SRC, ".bob/hooks"))) copy(".bob/hooks", ".bob/hooks");
  if (existsSync(join(SRC, ".bob/settings.json"))) copy(".bob/settings.json", ".bob/settings.json");
}

if (!DRY) {
  ensureDir(join(TARGET, ".bob"));
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  log(`wrote  ${LOCK_REL}`);
}
