# Contributing to bob-cloud-iac

Thank you for improving this mode. This guide covers git-based contributions — for local-only customization without git, see [README.md](README.md).

## What belongs here

Good contributions to this repo:

- **Rules improvements** — corrections, additions, or restructuring of files in `.bob/rules-cloud-iac/`
- **New rules domains** — a new numbered rules file for a gap in current coverage (e.g. cost optimization, disaster recovery patterns, multi-region active-active)
- **Hook improvements** — changes to `.bob/hooks/post-edit-fmt.mjs` (additional checks, better error messages, graceful fallback improvements)
- **MCP configuration corrections** — updated server package names, corrected documentation links, added required arguments
- **AGENTS.md template improvements** — better placeholder text, missing sections
- **Installer fixes** — bug fixes or new flags in `scripts/install.mjs`
- **Spec template improvements** — clearer acceptance criteria, missing validation checklist items in `specs/example/spec.md`

What does **not** belong here:

- Org-specific or client-specific content (internal endpoints, CIDR ranges, account IDs)
- Secrets, credentials, Terraform state files, or `.tfvars` with real values
- Changes to `.bob/mcp.json` (git-ignored by design)
- Generated Terraform — this repo configures Bob, it does not contain the Terraform Bob generates

## Branching

Branch from `main`. Use a short, descriptive branch name:

```
feat/add-cost-optimization-rules
fix/hook-tfvars-extension-support
docs/clarify-state-backend-placeholder
refactor/consolidate-networking-rules
```

Prefix conventions: `feat/` for new capability, `fix/` for corrections, `docs/` for documentation-only, `refactor/` for restructuring without behavior change.

## Commit messages

Use the conventional commits format:

```
<type>(<scope>): <short summary>

[optional body]
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`  
Scope: `rules`, `hook`, `installer`, `agents-md`, `spec`, `mcp`, `mode-yaml`

Examples:
```
feat(rules): add 09-cost-optimization rules file
fix(hook): also check .tfvars files with terraform fmt
docs(mcp): correct azure mcp server package name
```

Keep the summary under 72 characters. Use the body to explain *why*, not *what*.

## Pull request scope

Keep PRs focused. One logical change per PR.

Include in the PR description:
- What changed and why
- How to verify (e.g. "Write a `.tf` file in a workspace with hook enabled and confirm fmt check fires")
- Whether the dispatch table in `custom_modes.yaml` was updated (required when adding a rules file)
- For MCP changes: link to the upstream package or documentation source

## Adding a rules file

1. Create `.bob/rules-cloud-iac/NN-<name>.md` using the next available two-digit prefix.
2. Start the file with `<!-- load when: <condition> -->` on the first line.
3. Add a matching entry to the dispatch table in `.bob/custom_modes.yaml` under `customInstructions`.
4. Include the new file in your PR with a brief explanation of what gap it fills.

Rules files in this repo follow a consistent style: short sections, HCL examples with inline comments, and cloud-specific tables where AWS/Azure/GCP differ. New files should match that style.

## Modifying the format hook

The hook at `.bob/hooks/post-edit-fmt.mjs` is a `PostToolUse` hook, registered in `.bob/settings.json`. It runs `terraform fmt -check` on a `.tf` or `.tfvars` file after Bob writes it. Principles to preserve:

- Bob sends the event as JSON on stdin; the written file is `tool_input.path`, resolved against `cwd`.
- `PostToolUse` cannot block (the write already happened). Always exit 0; print findings to stdout so Bob adds them beside the tool result.
- Fail open: if `terraform` cannot be run, exit 0 and log a notice to stderr only (stderr stays out of model context).
- Non-HCL files, missing files and malformed input must pass through silently.
- Run the binary with an argument array (`spawnSync`), never a shell string, so paths cannot inject commands.
- Do not run `terraform validate` in the hook — it requires `terraform init` and initialized providers.
- Only exit code 2 from a `PreToolUse` or `UserPromptSubmit` command handler blocks an action; any other failure fails open. Hooks run only in trusted workspaces.

`npm test` covers the hook with a stub `terraform` binary (`test/hook.test.mjs`). To try it by hand:
```bash
printf '%s' '{"cwd":".","hook_event_name":"PostToolUse","tool_name":"write_file","tool_input":{"path":"modules/storage/aws/main.tf"},"tool_use_id":"t"}' | node .bob/hooks/post-edit-fmt.mjs
printf '%s' '{"cwd":".","hook_event_name":"PostToolUse","tool_name":"write_file","tool_input":{"path":"README.md"},"tool_use_id":"t"}' | node .bob/hooks/post-edit-fmt.mjs
```

## Adding or updating a skill

1. Place the file at `.bob/skills/<skill-name>/SKILL.md`.
2. Add an entry to `skills-lock.json` with the source URL and version or commit hash.
3. Add a row to the **Skills** table in `AGENTS.md`.
4. PR description should explain where the skill came from and why it adds value to this specific mode.

## Validation before opening a PR

```bash
# Dry-run the installer against a temp workspace
node scripts/install.mjs --dry-run /tmp/test-workspace

# Run the full suite (installer + hook tests)
npm test
```

## Review expectations

PRs are reviewed for:
- Technical accuracy of Terraform, IAM, networking, and encryption claims in rules files
- Consistency with existing rules style (HCL examples, cloud comparison tables, concise prescriptive prose)
- Correct `<!-- load when: ... -->` header on any new rules file
- Dispatch table updated if a new rules file was added
- Hook changes preserve fail-open behavior, the always-exit-0 `PostToolUse` contract, and the no-validate constraint
- No org-specific or client-specific content
- `skills-lock.json` updated if a skill was added or changed
