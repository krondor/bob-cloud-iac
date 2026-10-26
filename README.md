# bob-cloud-iac

A shareable IBM Bob workspace mode for generating production-grade, security-hardened Terraform for AWS, Azure, and GCP.

## What this is

The `cloud-iac` mode gives Bob the role of a senior cloud infrastructure engineer. It takes an approved architecture document and produces complete, modular Terraform covering IAM, networking, event processing, serverless runtimes, DLQ, KMS, monitoring, and enterprise data platform connectivity across all three clouds. It does not deploy — it generates code only.

## What it is not

This mode does not design architecture, generate application code, or produce test suites. For those, see:
- [`bob-cloud-architect`](https://github.com/krondor/bob-cloud-architect) — architecture design
- `bob-cloud-codegen` — Python source code generation
- `bob-cloud-testing` — test suite generation

## Install into your workspace

```bash
npx github:krondor/bob-cloud-iac
```

| Option | Effect |
|---|---|
| `--dry-run` | Print what would change; write nothing |
| `--with-templates` | Also copy `AGENTS.md` if it does not already exist |
| `--force` | Replace an existing `cloud-iac` block in `custom_modes.yaml` |

## Setup

1. Open the workspace folder in Bob and select **Cloud IaC Engineer** in the mode picker.
2. Fill in `AGENTS.md` — provide the target cloud(s), Terraform version constraint, state backend preferences, approved regions, and enterprise connectivity details.
3. Optionally configure cloud documentation MCP servers in `.bob/mcp.json` (see `.bob/mcp.json.example`). These improve resource argument accuracy significantly.

## Suggested first prompts

- "Review AGENTS.md and specs/ and tell me what spec is active and what the next task is."
- "The spec is in specs/example/spec.md — start with plan.md."
- "Implement the next task in tasks.md."
- "Generate the AWS networking module per the current spec."

## IaC standards enforced by this mode

- All encryption at rest and in transit explicitly configured — no defaults relied upon
- No resource exposes a public endpoint unless explicitly required and documented
- All sensitive variables have `sensitive = true`
- Secrets referenced from secrets manager, not inline
- IAM policies follow least privilege — no wildcard actions or resources
- Audit logging enabled on all relevant resources
- Environment separation: dev/staging/prod via separate tfvars

## The mode never deploys

This mode does not run `apply`, `destroy`, `import`, `state rm/mv/push`, `force-unlock`, or `-auto-approve`. Code generation only. Deployment is the user's responsibility.

## Review before use

- **Not yet run against a real engagement.** Mode YAML syntax has been validated; first pilot run is the real test.
- **AGENTS.md has placeholder sections.** Fill them in before running any Terraform generation session.
- **Hooks (terraform fmt) ship with this repo.** Copy `.bob/hooks/` and `.bob/settings.json` (or use `--with-hooks`). Requires `terraform` on `PATH`. Note: `terraform validate` is not hooked because it requires `terraform init` — run it manually after generating a module.
- **Cloud documentation MCPs are recommended.** Terraform provider arguments change across versions. MCPs prevent hallucinated argument names. See `.bob/mcp.json.example`.

## Local customization

Everything below assumes you have cloned this repo locally and are editing it directly — no git workflow required.

### Fill in AGENTS.md

`AGENTS.md` is loaded at the start of every session. Replace every `<!-- TODO -->` block: Terraform version constraint, approved provider versions, state backend preference per cloud, approved regions, private endpoint CIDR ranges, and DoD items. Keep it short. Reference content belongs in rules files.

### Add a skill

A skill is a `SKILL.md` file that Bob loads via `use_skill`. To add one:

1. Create the directory: `.bob/skills/<skill-name>/`
2. Place the `SKILL.md` file inside it — source it from a GitHub raw URL, copy from another repo, or write your own.
3. Register it in the **Skills** table in `AGENTS.md`: name, path, and when to use it.
4. Record the source URL and version in `skills-lock.json` under `"skills"` so it is reproducible.

### Edit or add a rules file

Rules files live in `.bob/rules-cloud-iac/`. Each file begins with `<!-- load when: ... -->`. Edit any file freely.

To add a new rules domain (e.g. cost optimization):
1. Create `.bob/rules-cloud-iac/09-cost-optimization.md` with a `<!-- load when: ... -->` header.
2. Add a matching entry in the dispatch table inside `.bob/custom_modes.yaml` under `customInstructions`.

### Enable or modify hooks

The repo ships a pre-edit hook at `.bob/hooks/pre-edit.mjs` that runs `terraform fmt -check` before every `.tf` file write. To enable it:

```bash
node scripts/install.mjs --with-hooks /path/to/your-project
```

Or manually copy `.bob/hooks/` and `.bob/settings.json` into your workspace and trust it in Bob. To change what the hook checks, edit `.bob/hooks/pre-edit.mjs` directly.

### Configure MCP servers

Copy `.bob/mcp.json.example` to `.bob/mcp.json` and fill in any required credentials. `.bob/mcp.json` is git-ignored — it stays local. Strongly recommended: cloud provider documentation MCPs prevent hallucinated Terraform argument names and keep resource blocks aligned with the current provider version.

### Update the spec template

The spec template lives in `specs/example/spec.md`. Copy it to a new directory (e.g. `specs/my-project/`) and fill it in before starting a Terraform generation session.

## Contributing via git

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Sources

- Pattern: [krondor/bob-tofu-spacelift](https://github.com/krondor/bob-tofu-spacelift)
- AWS Documentation MCP: [awslabs/aws-documentation-mcp-server](https://github.com/awslabs/mcp/tree/main/src/aws-documentation-mcp-server)
- Azure MCP Server: [microsoft/mcp](https://github.com/microsoft/mcp)
- Google Cloud MCP: [Google Cloud remote MCP servers](https://docs.cloud.google.com/mcp/overview)
