# AGENTS.md

Shared operating contract for humans and agents working in this repository with the `cloud-iac` and `iac-reviewer` Bob modes.
Keep it short, accurate, and reviewed like code. Update it when conventions change or a recurring correction is discovered.
**Do not store secrets, personal data, or real account names here.**

---

## Purpose of this mode

This workspace provides two Bob modes:

- **`cloud-iac`** — generates modular, production-grade, security-hardened Terraform (`modules/`, `environments/`) for AWS, Azure, and GCP from approved architecture specs. Generates code only; never executes live apply, destroy, or state modifications.
- **`iac-reviewer`** — read-only security and quality review of Terraform code against CIS benchmarks, tfsec/tflint rules, least-privilege IAM, encryption, networking, and state management standards. Does not write files or modify Terraform.

**Workspace layout:**

```
specs/          Spec-driven work: spec.md, plan.md, tasks.md, checkpoint.md per component or feature
modules/        Reusable Terraform capability modules by cloud (storage, messaging, compute)
environments/   Root environment modules (dev, staging, prod)
docs/<spec-id>/ Architecture deliverables produced upstream (input to this mode)
.bob/           Bob config: custom modes, rules, skills, MCP example
```

A `checkpoint.md` file in each spec folder records the session state so work can resume across sessions or mode switches without re-reading the entire history: spec revision, completed artifacts, blockers, validation status, and the next action.

---

## Spec-driven workflow

All IaC generation is spec-driven. No Terraform is generated until a spec exists and a human has approved its requirements.

1. **Specify** (`specs/<NNN-name>/spec.md`): infrastructure requirements, target clouds, module scope, constraints, and testable acceptance criteria. If no spec exists, the agent drafts one (status `draft`, approval `pending`). Only a human sets approval.
2. **Plan** (`specs/<NNN>/plan.md`): infrastructure approach, module breakdown, provider versions, state backend design.
3. **Tasks** (`specs/<NNN>/tasks.md`): ordered implementation checklist — each item one reviewable module.
4. **Implement**: one module at a time, running `terraform fmt` and `terraform validate` after each.
5. **Verify**: map every spec acceptance criterion to evidence before closing the spec.

Status values: `draft`, `in-progress`, `ready-for-review`, `accepted`. Approval is recorded in `Requirements approval: pending | approved by <name> on <date> at <revision>`. A material change resets approval to `pending`.

---

## Required tools

| Tool | Minimum version | Notes |
|---|---|---|
| `terraform` | `>= 1.6.0` | Or OpenTofu `>= 1.6.0` |
| `tflint` | latest | Terraform linter |
| `node` | `>= 18` | For Bob installer and hooks |

---

## Commands

Run from the repo root or module directory:

```sh
# Format check
terraform fmt -check -recursive

# Validate module
terraform init -backend=false
terraform validate
```

---

## Grounding sources

The agent grounds Terraform resource arguments and attributes in official provider documentation for `hashicorp/aws`, `hashicorp/azurerm`, `hashicorp/google`, `Snowflake-Labs/snowflake`, and `databricks/databricks`. When MCP documentation servers are configured (`.bob/mcp.json`), it consults live documentation before generating resource blocks.

---

## Git and review conventions

- **Branch naming:** `feat/<spec-id>-<slug>` (e.g. `feat/001-storage-messaging-iac`).
- **No direct commits to `main`.** Open a PR for every change.
- **Commit style:** Conventional Commits referencing the spec and task id.
- **PR description must include:** spec link, tasks covered, validation evidence.

---

## Security rules

- No secrets, credentials, connection strings, or account identifiers in Terraform files or variable files.
- All sensitive input variables must declare `sensitive = true`.
- Zero wildcard IAM write actions (`"Resource": "*"`) or unrestricted ingress (`0.0.0.0/0`).
- Customer Managed Keys (CMK) encryption explicit on all stateful resources.

---

## Skills

Load with `use_skill` when the task needs them:

| Skill | Location | When to use |
|---|---|---|
| `terraform-multi-cloud-patterns` | `.bob/skills/terraform-multi-cloud-patterns/SKILL.md` | Storage, messaging, compute, remote state backends, provider configurations, tagging |
| `iac-security-and-compliance` | `.bob/skills/iac-security-and-compliance/SKILL.md` | IAM least-privilege, KMS encryption, private networking, CIS benchmark rules |
| `enterprise-data-iac-patterns` | `.bob/skills/enterprise-data-iac-patterns/SKILL.md` | Snowflake storage integrations, Databricks external locations, BigQuery datasets, Kafka |
| `iac-quality-and-review` | `.bob/skills/iac-quality-and-review/SKILL.md` | IaC quality review checklist, security audit items, P0/P1 review finding criteria |

---

## Definition of done

An IaC task is done when:

- [ ] All specified modules and environments are fully generated.
- [ ] Provider versions and core versions are pinned.
- [ ] Explicit CMK encryption configured on all storage and messaging resources.
- [ ] IAM policies follow least privilege without wildcard resource write permissions.
- [ ] `terraform fmt -check` and `terraform validate` pass with zero errors.
- [ ] Zero live apply/destroy operations executed.
- [ ] Spec acceptance criteria are mapped to evidence in the PR.
